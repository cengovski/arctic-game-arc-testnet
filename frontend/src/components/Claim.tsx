import { useAccount, useReadContract } from 'wagmi';
import { arcTestnet } from '../lib/arcChain';
import contracts from '../lib/contracts.json';

const TOKEN_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', 'type': 'uint8' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
];

const STAKING_ABI = [
  { name: 'totalStaked', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'baseRewardPerHour', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
];

const NFT_ABI = [
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
];

export default function Claim() {
  const { address, isConnected } = useAccount();

  const { data: arcticBalance } = useReadContract({
    address: contracts.ArcticToken as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address },
  });

  const { data: totalSupply } = useReadContract({
    address: contracts.ArcticToken as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
    chainId: arcTestnet.id,
  });

  const { data: nftSupply } = useReadContract({
    address: contracts.ArcticBeasts as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'totalSupply',
    chainId: arcTestnet.id,
  });

  const { data: totalStaked } = useReadContract({
    address: contracts.ArcticStaking as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'totalStaked',
    chainId: arcTestnet.id,
  });

  const { data: rewardRate } = useReadContract({
    address: contracts.ArcticStaking as `0x${string}`,
    abi: STAKING_ABI,
    functionName: 'baseRewardPerHour',
    chainId: arcTestnet.id,
  });

  const formatTokens = (amount: bigint | undefined, decimals = 18) => {
    if (!amount) return '0';
    return (Number(amount) / Math.pow(10, decimals)).toLocaleString();
  };

  return (
    <div style={styles.card}>
      <h2>📊 Game Stats</h2>

      <div style={styles.grid}>
        <div style={styles.statCard}>
          <span style={styles.statEmoji}>🪙</span>
          <span style={styles.statLabel}>$ARCTIC Supply</span>
          <span style={styles.statValue}>{formatTokens(totalSupply)}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statEmoji}>🎨</span>
          <span style={styles.statLabel}>Beasts Minted</span>
          <span style={styles.statValue}>{nftSupply?.toString() ?? '0'}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statEmoji}>⛏️</span>
          <span style={styles.statLabel}>Total Staked</span>
          <span style={styles.statValue}>{totalStaked?.toString() ?? '0'}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statEmoji}>⚡</span>
          <span style={styles.statLabel}>Base Reward</span>
          <span style={styles.statValue}>{rewardRate ? Number(rewardRate) / 1e18 : 1}/hr</span>
        </div>
      </div>

      {isConnected && arcticBalance !== undefined && (
        <div style={styles.userStats}>
          <h3>Your Stats</h3>
          <div style={styles.userRow}>
            <span>$ARCTIC Balance</span>
            <span style={styles.userValue}>{formatTokens(arcticBalance)}</span>
          </div>
        </div>
      )}

      <div style={styles.links}>
        <h3>🔗 Quick Links</h3>
        <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" style={linkStyle}>
          💧 Circle Faucet (Free USDC)
        </a>
        <a href={`https://testnet.arcscan.app/address/${contracts.ArcticBeasts}`} target="_blank" rel="noreferrer" style={linkStyle}>
          📜 NFT Contract
        </a>
        <a href={`https://testnet.arcscan.app/address/${contracts.ArcticStaking}`} target="_blank" rel="noreferrer" style={linkStyle}>
          ⛏️ Staking Contract
        </a>
        <a href={`https://testnet.arcscan.app/address/${contracts.ArcticToken}`} target="_blank" rel="noreferrer" style={linkStyle}>
          🪙 Token Contract
        </a>
      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'block',
  color: '#00b4d8',
  textDecoration: 'none',
  padding: '8px 0',
  fontSize: 14,
  borderBottom: '1px solid #1a1a2e',
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    border: '1px solid #2a2a4a',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' },
  statCard: { background: '#0f0f23', borderRadius: 12, padding: 16, textAlign: 'center' },
  statEmoji: { display: 'block', fontSize: 28, marginBottom: 4 },
  statLabel: { display: 'block', color: '#666', fontSize: 11 },
  statValue: { display: 'block', color: '#00b4d8', fontSize: 18, fontWeight: 700, marginTop: 4 },
  userStats: { background: '#0f0f23', borderRadius: 12, padding: 16, margin: '16px 0' },
  userRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0' },
  userValue: { color: '#4ade80', fontWeight: 700 },
  links: { marginTop: 16 },
};
