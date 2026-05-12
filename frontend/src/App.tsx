import { useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, walletConnect } from 'wagmi/connectors';
import { arcTestnet } from './lib/arcChain';
import WalletConnectComponent from './components/WalletConnect';
import Mint from './components/Mint';
import Stake from './components/Stake';
import Claim from './components/Claim';

const config = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: 'arctic-game-arc',
      metadata: {
        name: 'Arctic Game',
        description: 'Arctic - Polar Profit Web3 Game on ARC Testnet',
        url: 'https://arctic-arc-testnet.github.io',
        icons: ['https://arctic-arc-testnet.github.io/icon.png'],
      },
    }),
  ],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

function GameUI() {
  const [activeTab, setActiveTab] = useState<'mint' | 'stake' | 'stats'>('mint');

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>❄️ Arctic</h1>
        <p style={styles.tagline}>Polar Profit • Web3 Game on ARC Testnet</p>
      </header>

      <WalletConnectComponent />

      <nav style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'mint' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('mint')}
        >
          🎨 Mint
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'stake' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('stake')}
        >
          ⛏️ Stake
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'stats' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
      </nav>

      <main>
        {activeTab === 'mint' && <Mint />}
        {activeTab === 'stake' && <Stake />}
        {activeTab === 'stats' && <Claim />}
      </main>

      <footer style={styles.footer}>
        <p>Arctic Game v1.0 • ARC Testnet • Built with ❤️ for the community</p>
        <p style={styles.footerLinks}>
          <a href="https://docs.arc.network" target="_blank" rel="noreferrer">Arc Docs</a>
          {' • '}
          <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">ArcScan</a>
          {' • '}
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">Faucet</a>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <GameUI />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: 16,
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: { textAlign: 'center', marginBottom: 24 },
  title: {
    fontSize: 36,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #00b4d8, #0077b6, #4ade80)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  tagline: { color: '#666', fontSize: 14, marginTop: 4 },
  tabs: { display: 'flex', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    background: '#1a1a2e',
    color: '#666',
    border: '1px solid #2a2a4a',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
    color: '#fff',
    borderColor: '#00b4d8',
  },
  footer: { textAlign: 'center', marginTop: 32, padding: 16, color: '#444', fontSize: 12 },
  footerLinks: { marginTop: 8 },
};
