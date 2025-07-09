import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Doughnut } from "react-chartjs-2";
import { 
  Chart as ChartJS, 
  ArcElement, 
  BarElement, 
  CategoryScale, 
  LinearScale, 
  Tooltip, 
  Legend 
} from "chart.js";
import '../styles/Insights.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Insights = () => {
  const apiBase = process.env.REACT_APP_SERVER_URL;
  const [buys, setBuys] = useState(0);
  const [sells, setSells] = useState(0);
  const [protocolCounts, setProtocolCounts] = useState({});
  const [repeats, setRepeats] = useState({});

  useEffect(() => {
    const fetchAndProcess = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/transactions`);
        const txs = res.data.transactions;

        let buyCount = 0;
        let sellCount = 0;
        const protocols = {};
        const walletActivity = {};

        txs.forEach((tx) => {
          if (tx.type === "buy") buyCount++;
          else if (tx.type === "sell") sellCount++;

          protocols[tx.protocol] = (protocols[tx.protocol] || 0) + 1;
          walletActivity[tx.wallet_address] =
            (walletActivity[tx.wallet_address] || 0) + 1;
        });

        setBuys(buyCount);
        setSells(sellCount);
        setProtocolCounts(protocols);
        setRepeats(
          Object.fromEntries(
            Object.entries(walletActivity).filter(([_, count]) => count > 1)
          )
        );
      } catch (err) {
        console.error("Error in insights", err);
      }
    };

    fetchAndProcess();
  }, []);

  const buySellData = {
    labels: ["Buys", "Sells"],
    datasets: [
      {
        label: "Transaction Count",
        data: [buys, sells],
        backgroundColor: ["#4CAF50", "#F44336"],
      },
    ],
  };

  const protocolData = {
    labels: Object.keys(protocolCounts),
    datasets: [
      {
        label: "Protocol Usage",
        data: Object.values(protocolCounts),
        backgroundColor: [
          "#FF6384", "#36A2EB", "#FFCE56", "#9C27B0", "#00BCD4", "#4CAF50",
        ],
      },
    ],
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Insights Dashboard</h2>
      </div>

      <div className="insights-highlight">
        <div className="highlight-card buy-highlight">
          <div className="highlight-value">{buys}</div>
          <div className="highlight-label">Total Buys</div>
        </div>
        <div className="highlight-card sell-highlight">
          <div className="highlight-value">{sells}</div>
          <div className="highlight-label">Total Sells</div>
        </div>
        <div className="highlight-card protocol-highlight">
          <div className="highlight-value">{Object.keys(protocolCounts).length}</div>
          <div className="highlight-label">Protocols Used</div>
        </div>
      </div>

      <div className="insights-grid">
        <div className="chart-container">
          <h4 className="chart-title">Buys vs Sells</h4>
          <Bar data={buySellData} />
        </div>

        <div className="chart-container">
          <h4 className="chart-title">Protocol Usage</h4>
          <Doughnut data={protocolData} />
        </div>
      </div>

      <div className="repeats-list">
        <h4 className="chart-title">Wallets with Repeated Activity</h4>
        {Object.entries(repeats).map(([wallet, count]) => (
          <div className="repeats-item" key={wallet}>
            <span className="repeats-wallet">
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </span>
            <span className="repeats-count">{count} transactions</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Insights;