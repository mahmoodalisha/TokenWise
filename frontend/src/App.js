import React from 'react';
import TopWallets from './components/TopWallets';
import Transactions from './components/Transactions';
import Insights from './components/Insights';
import './styles/Dashboard.css';

function App() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">TokenWise</h1>
        <p className="dashboard-subtitle">Real-Time Wallet Intelligence on Solana</p>
      </header>

      <div className="grid-container">
        <TopWallets />
        <Transactions />
        <Insights />
      </div>
    </div>
  );
}

export default App;

