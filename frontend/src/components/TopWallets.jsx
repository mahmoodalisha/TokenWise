import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';
import "../styles/TopWallets.css";
import "../styles/Dashboard.css";

const TopWallets = () => {
  const [wallets, setWallets] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "percentageShare", direction: "desc" });

  useEffect(() => {
    const fetchTopWallets = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/top-wallets");
        setWallets(res.data.topWallets);
      } catch (err) {
        console.error("Error fetching top wallets", err);
      }
    };

    fetchTopWallets();
  }, []);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedWallets = React.useMemo(() => {
    let sortableWallets = [...wallets];
    if (sortConfig.key) {
      sortableWallets.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableWallets;
  }, [wallets, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Top Wallets</h2>
        <a href="/all-wallets" className="view-all">
  View All <FiExternalLink size={14} />
</a>
      </div>
      <div className="table-container">
        <table className="wallets-table">
          <thead>
            <tr>
              <th onClick={() => requestSort("walletAddress")}>
                <div className="flex items-center gap-1">
                  Wallet Address {getSortIcon("walletAddress")}
                </div>
              </th>
              <th onClick={() => requestSort("tokenAmount")}>
                <div className="flex items-center gap-1">
                  Token Amount {getSortIcon("tokenAmount")}
                </div>
              </th>
              <th onClick={() => requestSort("percentageShare")}>
                <div className="flex items-center gap-1">
                  Share % {getSortIcon("percentageShare")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedWallets.map((wallet, index) => (
              <tr key={index}>
                <td className="wallet-address">
                  {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                </td>
                <td>{Number(wallet.tokenAmount).toLocaleString()}</td>
                <td className="percentage-cell">
                  <span>{wallet.percentageShare}%</span>
                  <div 
                    className="percentage-bar" 
                    style={{ width: `${wallet.percentageShare}%` }}
                  ></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopWallets;