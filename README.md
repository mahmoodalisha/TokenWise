# 🧠 TokenWise — Solana Token Intelligence Dashboard

TokenWise is a real-time analytics tool that tracks the top 60 holders of a specific token on the **Solana blockchain**, analyzes their **buy/sell activity**, identifies the **protocol used** (Jupiter, Raydium, Orca), and visualizes these insights on an intuitive dashboard.

<img width="1920" height="1080" alt="Screenshot 2025-07-07 153623" src="https://github.com/user-attachments/assets/ec876f89-602a-4ab5-9759-9a80d2c6debd" />


<img width="1920" height="1080" alt="Screenshot 2025-07-09 002425" src="https://github.com/user-attachments/assets/0e4ae563-cc31-46ed-ab60-3daeaecfb325" />

<img width="1905" height="1027" alt="Screenshot 2025-07-09 162808" src="https://github.com/user-attachments/assets/f8259a1a-3ac3-4982-9fbb-4d058e736ffc" />


> 🔍 **Target Token:**  
> `9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump`

---

## 🌐 Live Demo

- **Backend API:** [https://tokenwise-8dfv.onrender.com](https://tokenwise-8dfv.onrender.com)  
- **Frontend Dashboard:** https://token-wise-silk.vercel.app/

---

## 🛠 Tech Stack

| Layer        | Tools Used                                       |
|--------------|--------------------------------------------------|
| **Backend**  | Node.js, Express, PostgreSQL, Solana Web3.js     |
| **Database** | Neon PostgreSQL Cloud                            |
| **Frontend** | React.js + Chart.js                              |
| **Deployment** | Backend on Render, Frontend on Vercel         |

---

## 🚀 Features

- 🪙 Track top 60 token holders on Solana
- 📊 Visualize real-time buys/sells using pie and bar charts
- 🔍 Identify protocols used: Jupiter, Raydium, Orca
- 🕒 Historical transaction querying with pagination
- 🧠 Detect repeated wallet behavior and market trends
- 🧼 Handles rate-limiting (429) gracefully using retries and delays

---

## 📦 Setup Instructions

### 1. Clone the repository
git clone https://github.com/mahmoodalisha/TokenWise.git
cd frontend

### Install Dependency
npm install

### To start the backend
Run node server.js in the root directory

### Create .env file in the root of the project directory
PORT=5000
DATABASE_URL=your_postgresql_connection_url
TOKEN_MINT=9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump
RPC_URL=your_quiknode_or_solana_rpc_url

📈 API Endpoints
GET /api/top-wallets
Returns the current top 60 wallets by token amount.

GET /api/transactions
Query historical transactions.

Supports filters: wallet, type, from, to, page, limit

Notes
Built with MVP-first mindset: Only the most essential real-time features first.
Handles rate-limits (429 errors) with exponential backoff & retries.
Uses batching and throttling to reduce RPC spam.
Future enhancements: Wallet linking, CSV exports, multi-token support.
