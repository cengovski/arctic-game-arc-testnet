import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { arcTestnet } from './arcChain';

export default function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const handleSwitchChain = async () => {
    try {
      await switchChain({ chainId: arcTestnet.id });
    } catch (err) {
      console.error('Switch chain failed:', err);
    }
  };

  const isOnArc = chain?.id === arcTestnet.id;

  return (
    <div style={styles.card}>
      <h2>🔗 Wallet</h2>
      {!isConnected ? (
        <button style={styles.button} onClick={handleConnect}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <p style={styles.address}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          {balance && (
            <p style={styles.balance}>
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </p>
          )}
          {!isOnArc && (
            <button style={{ ...styles.button, background: '#ff9800' }} onClick={handleSwitchChain}>
              Switch to ARC Testnet
            </button>
          )}
          {isOnArc && <p style={styles.badge}>✅ ARC Testnet</p>}
          <button style={styles.buttonSecondary} onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
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
  button: {
    background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  buttonSecondary: {
    background: '#2a2a4a',
    color: '#aaa',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
  },
  address: {
    fontFamily: 'monospace',
    color: '#00b4d8',
    fontSize: 14,
  },
  balance: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: 700,
  },
  badge: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 600,
  },
};
