import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiExternalLink } from "react-icons/fi";
import '../styles/Transactions.css';

const Transactions = () => {
  const apiBase = process.env.REACT_APP_SERVER_URL;
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/transactions`);
        setTransactions(res.data.transactions);
      } catch (err) {
        console.error("Error fetching transactions", err);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(tx => 
    tx.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.protocol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const indexOfLastTx = currentPage * transactionsPerPage;
  const indexOfFirstTx = indexOfLastTx - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTx, indexOfLastTx);
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Recent Transactions</h2>
        <a href="/all-transactions" className="view-all">
  View All <FiExternalLink size={14} />
</a>
      </div>

      <div className="table-controls">
        <input
          type="text"
          placeholder="Search wallets or protocols..."
          className="search-input"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Protocol</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {currentTransactions.map((tx, i) => (
              <tr key={i}>
                <td className="tx-wallet">
                  {tx.wallet_address.slice(0, 6)}...{tx.wallet_address.slice(-4)}
                </td>
                <td className="tx-amount">{Number(tx.amount).toLocaleString()}</td>
                <td className={tx.type === "buy" ? "tx-buy" : "tx-sell"}>
                  {tx.type}
                </td>
                <td>
                  <span className="tx-protocol">{tx.protocol}</span>
                </td>
                <td className="tx-time">
                  {new Date(tx.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;