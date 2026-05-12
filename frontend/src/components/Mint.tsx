import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { arcTestnet } from '../lib/arcChain';
import contracts from '../lib/contracts.json';

const NFT_ABI = [
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'quantity', type: 'uint256' }], outputs: [] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'tokenRarity', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'tokenStakingPower', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
];

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', '#9ca3af', '#3b82f6', '#a855f7', '#f59e0b'];
const RARITY_EMOJIS = ['', '🦊', '🐧', '🐻‍❄️', '🐉'];

export default function Mint() {
  const { address, isConnected } = useAccount();
  const [quantity, setQuantity] = useState(1);
  const [myNFTs, setMyNFTs] = useState<number[]>([]);

  const { data: totalSupply } = useReadContract({
    address: contracts.ArcticBeasts as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'totalSupply',
    chainId: arcTestnet.id,
  });

  const { data: myBalance } = useReadContract({
    address: contracts.ArcticBeasts as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleMint = () => {
    if (!isConnected) return;
    writeContract({
      address: contracts.ArcticBeasts as `0x${string}`,
      abi: NFT_ABI,
      functionName: 'mint',
      args: [BigInt(quantity)],
      chainId: arcTestnet.id,
    });
  };

  return (
    <div style={styles.card}>
      <h2>🎨 Mint Arctic Beasts</h2>
      <p style={styles.subtitle}>FREE mint on ARC Testnet • Max 10 per tx</p>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Total Minted</span>
          <span style={styles.statValue}>{totalSupply?.toString() ?? '...'} / 10,000</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Your NFTs</span>
          <span style={styles.statValue}>{myBalance?.toString() ?? '0'}</span>
        </div>
      </div>

      <div style={styles.rarityInfo}>
        <h3>Rarity Tiers</h3>
        {RARITY_NAMES.slice(1).map((name, i) => (
          <div key={name} style={styles.rarityRow}>
            <span>{RARITY_EMOJIS[i + 1]} {name}</span>
            <span style={{ color: RARITY_COLORS[i + 1] }}>{[1, 3, 8, 20][i]}x rewards</span>
          </div>
        ))}
      </div>

      <div style={styles.mintControls}>
        <label>Quantity:</label>
        <input
          type="range"
          min={1}
          max={10}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.quantityLabel}>{quantity}</span>
      </div>

      <button
        style={{ ...styles.button, opacity: !isConnected || isPending ? 0.5 : 1 }}
        onClick={handleMint}
        disabled={!isConnected || isPending}
      >
        {isConfirming ? '⏳ Confirming...' : isPending ? '📝 Signing...' : `❄️ Mint ${quantity} FREE`}
      </button>

      {isSuccess && hash && (
        <p style={styles.success}>
          ✅ Minted! <a href={`https://testnet.arcscan.app/tx/${hash}`} target="_blank" rel="noreferrer">View on ArcScan</a>
        </p>
      )}
    </div>
  );
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
  stats: { display: 'flex', gap: 16, margin: '16px 0' },
  stat: { flex: 1, background: '#0f0f23', borderRadius: 8, padding: 12, textAlign: 'center' },
  statLabel: { display: 'block', color: '#666', fontSize: 12 },
  statValue: { display: 'block', color: '#00b4d8', fontSize: 18, fontWeight: 700 },
  rarityInfo: { margin: '16px 0' },
  rarityRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 },
  mintControls: { display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' },
  slider: { flex: 1 },
  quantityLabel: { color: '#00b4d8', fontWeight: 700, fontSize: 18, minWidth: 24, textAlign: 'center' },
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
  success: { color: '#4ade80', marginTop: 12, fontSize: 14 },
};
