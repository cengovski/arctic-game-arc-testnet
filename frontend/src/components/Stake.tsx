import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { arcTestnet } from '../lib/arcChain';
import contracts from '../lib/contracts.json';

const NFT_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'tokenOfOwnerByIndex', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'tokenRarity', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'tokenStakingPower', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
];

const STAKING_ABI = [
  { name: 'stake', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenIds', type: 'uint256[]' }], outputs: [] },
  { name: 'unstake', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenIds', type: 'uint256[]' }], outputs: [] },
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'pendingRewards', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getStakedTokens', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256[]' }] },
  { name: 'totalStaked', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
];

const TOKEN_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
];

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_EMOJIS = ['', '🦊', '🐧', '🐻‍❄️', '🐉'];

export default function Stake() {
  const { address, isConnected } = useAccount();
  const [selectedForStake, setSelectedForStake] = useState<Set<number>>(new Set());
  const [selectedForUnstake, setSelectedForUnstake] = useState<Set<number>>(new Set());
  const [nftBalance, setNftBalance] = useState(0);
  const [tokenABIs, setTokenABIs] = useState<Set<string>>(new Set());

  // Read NFT balance
  const { data: balance } = useReadContract({
    address: contracts.ArcticBeasts as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address },
  });

  // Read staked tokens
  const { data: stakedTokens }: { data: bigint[] | undefined } = useReadContract({
    address: contracts.ArcticStaking as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'getStakedTokens',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address },
  });

  // Read ARCTIC balance
  const { data: arcticBalance, data: arcticDecimals } = useContractData(
    contracts.ArcticToken as `0x${string}`,
    TOKEN_ABI,
    'balanceOf',
    address ? [address] : undefined
  );

  // Read pending rewards
  const { data: pending } = useReadContract({
    address: contracts.ArcticStaking as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'pendingRewards',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address, refetchInterval: 10000 },
  });

  // Read total staked
  const { data: totalStaked } = useReadContract({
    address: contracts.ArcticStaking as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'totalStaked',
    chainId: arcTestnet.id,
  });

  // Approval
  const { data: isApproved } = useReadContract({
    address: contracts.ArcticBeasts as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'isApprovedForAll',
    args: address ? [address, contracts.ArcticStaking as `0x${string}`] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address },
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (balance) setNftBalance(Number(balance));
  }, [balance]);

  const handleApprove = () => {
    writeContract({
      address: contracts.ArcticBeasts as `0x${string}`,
      abi: NFT_ABI,
      functionName: 'setApprovalForAll',
      args: [contracts.ArcticStaking as `0x${string}`, true],
      chainId: arcTestnet.id,
    });
  };

  const handleStake = () => {
    if (selectedForStake.size === 0) return;
    writeContract({
      address: contracts.ArcticStaking as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'stake',
      args: [Array.from(selectedForStake).map(BigInt)],
      chainId: arcTestnet.id,
    });
    setSelectedForStake(new Set());
  };

  const handleUnstake = () => {
    if (selectedForUnstake.size === 0) return;
    writeContract({
      address: contracts.ArcticStaking as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'unstake',
      args: [Array.from(selectedForUnstake).map(BigInt)],
      chainId: arcTestnet.id,
    });
    setSelectedForUnstake(new Set());
  };

  const handleClaim = () => {
    writeContract({
      address: contracts.ArcticStaking as `0x${string}`,
      abi: STAKING_ABI,
      functionName: 'claim',
      chainId: arcTestnet.id,
    });
  };

  const formatRewards = (amount: bigint | undefined) => {
    if (!amount) return '0.000';
    return (Number(amount) / 1e18).toFixed(3);
  };

  if (!isConnected) {
    return (
      <div style={styles.card}>
        <h2>⛏️ Ice Mine (Staking)</h2>
        <p style={styles.subtitle}>Connect wallet to stake NFTs and earn $ARCTIC</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h2>⛏️ Ice Mine (Staking)</h2>
      <p style={styles.subtitle}>Stake Arctic Beasts → earn $ARCTIC every second</p>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Your $ARCTIC</span>
          <span style={styles.statValue}>{formatRewards(arcticBalance)}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Pending</span>
          <span style={{ ...styles.statValue, color: '#f59e0b' }}>{formatRewards(pending)}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Total Staked</span>
          <span style={styles.statValue}>{totalStaked?.toString() ?? '0'}</span>
        </div>
      </div>

      {!isApproved ? (
        <button style={styles.button} onClick={handleApprove}>
          ✅ Approve Staking Contract
        </button>
      ) : (
        <>
          {stakedTokens && stakedTokens.length > 0 && (
            <div style={styles.section}>
              <h3>Your Staked NFTs ({stakedTokens.length})</h3>
              <p style={styles.selectHint}>Select to unstake:</p>
              <div style={styles.nftGrid}>
                {stakedTokens.slice(0, 20).map((id) => (
                  <NFTCard
                    key={`staked-${id}`}
                    tokenId={Number(id)}
                    selected={selectedForUnstake.has(Number(id))}
                    onToggle={(id) => setSelectedForUnstake(toggleSet(selectedForUnstake, id))}
                  />
                ))}
              </div>
              <button style={styles.buttonSecondary} onClick={handleUnstake} disabled={selectedForUnstake.size === 0}>
                📤 Unstake ({selectedForUnstake.size})
              </button>
            </div>
          )}

          <button style={{ ...styles.button, background: 'linear-gradient(135deg, #4ade80, #22c55e)' }} onClick={handleClaim}>
            🎁 Claim {formatRewards(pending)} $ARCTIC
          </button>
        </>
      )}
    </div>
  );
}

function NFTCard({ tokenId, selected, onToggle }: { tokenId: number; selected: boolean; onToggle: (id: number) => void }) {
  const [rarity, setRarity] = useState(0);
  const [power, setPower] = useState(0);

  return (
    <div style={{ ...styles.nftCard, borderColor: selected ? '#00b4d8' : '#2a2a4a' }} onClick={() => onToggle(tokenId)}>
      <div style={styles.nftEmoji}>{RARITY_EMOJIS[rarity] || '❄️'}</div>
      <span style={styles.nftId}>#{tokenId}</span>
      {rarity > 0 && (
        <span style={styles.nftRarity}>{RARITY_NAMES[rarity]} ({power}x)</span>
      )}
    </div>
  );
}

function toggleSet(set: Set<number>, id: number): Set<number> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function useContractData(address: `0x${string}`, abi: readonly object[], functionName: string, args?: unknown[]) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useReadContract({
    address,
    abi: abi as unknown[],
    functionName,
    args,
    chainId: arcTestnet.id,
    query: { enabled: !!address || address !== '0x0000000000000000000000000000000000000000' },
  }) as { data: bigint | undefined };
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    border: '1px solid #2a2a4a',
  },
  subtitle: { color: '#888', fontSize: 13, marginTop: -8 },
  stats: { display: 'flex', gap: 12, margin: '16px 0' },
  stat: { flex: 1, background: '#0f0f23', borderRadius: 8, padding: 10, textAlign: 'center' },
  statLabel: { display: 'block', color: '#666', fontSize: 11 },
  statValue: { display: 'block', color: '#00b4d8', fontSize: 16, fontWeight: 700 },
  section: { margin: '16px 0' },
  selectHint: { color: '#666', fontSize: 12 },
  nftGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, margin: '8px 0' },
  nftCard: { background: '#0f0f23', borderRadius: 8, padding: 8, textAlign: 'center', cursor: 'pointer', border: '2px solid #2a2a4a' },
  nftEmoji: { fontSize: 24 },
  nftId: { display: 'block', color: '#aaa', fontSize: 11, fontFamily: 'monospace' },
  nftRarity: { display: 'block', color: '#666', fontSize: 9 },
  button: {
    background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  buttonSecondary: {
    background: '#2a2a4a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
  },
};
