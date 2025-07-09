const express = require('express');
const cors = require('cors');
const { Connection, PublicKey } = require('@solana/web3.js');
const dotenv = require('dotenv');
const pool = require('./db');
const bs58 = require('bs58');
dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_MINT = process.env.TOKEN_MINT;
const RPC_URL = process.env.RPC_URL;

const connection = new Connection(RPC_URL);


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeParsedAccountInfo(pubkey) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await connection.getParsedAccountInfo(pubkey); 
    } catch (err) {
      if (err.message.includes('429') || err.message.includes('rate limited')) {
        console.warn(`Rate limited on getParsedAccountInfo. Retrying (attempt ${attempt + 1})...`);
        await sleep(1500 * (attempt + 1)); 
      } else {
        throw err;
      }
    }
  }
  throw new Error('Failed after multiple retries');
}



const BATCH_SIZE = 3;



app.get('/api/top-wallets', async (req, res) => {
  try {
    const mintPubkey = new PublicKey(process.env.TOKEN_MINT);

    
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: 165 },
        {
          memcmp: {
            offset: 0, 
            bytes: mintPubkey.toBase58(),
          },
        },
      ],
    });

    
    const accountInfos = accounts
      .map(({ pubkey, account }) => {
        const data = account.data;
        const amount = Number(data.slice(64, 72).readBigUInt64LE()) / 1e6;
        return {
          address: pubkey.toBase58(),
          amount,
        };
      })
      .filter(acc => acc.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 60); 

    const totalSupply = accountInfos.reduce((sum, acc) => sum + acc.amount, 0);
    const wallets = [];

    
    for (let i = 0; i < accountInfos.length; i += BATCH_SIZE) {
      const batch = accountInfos.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async ({ address, amount }) => {
        try {
          await sleep(200);
          const accInfo = await safeParsedAccountInfo(new PublicKey(address));
          const owner = accInfo.value.data.parsed.info.owner;

          wallets.push({
            walletAddress: owner,
            tokenAmount: amount,
            percentageShare: ((amount / totalSupply) * 100).toFixed(2),
          });

          await pool.query(
            `INSERT INTO top_wallets (wallet_address, token_amount, percentage_share)
             VALUES ($1, $2, $3)
             ON CONFLICT (wallet_address) DO UPDATE
             SET token_amount = EXCLUDED.token_amount, percentage_share = EXCLUDED.percentage_share`,
            [owner, amount, ((amount / totalSupply) * 100).toFixed(2)]
          );
        } catch (err) {
          console.error(`Error processing account ${address}:`, err.message);
        }
      }));

      await sleep(800); 
    }

    res.json({ topWallets: wallets });
  } catch (err) {
    console.error('Error fetching top wallets:', err.message);
    res.status(500).json({ error: 'Failed to fetch top wallets' });
  }
});



app.get('/api/transactions', async (req, res) => {
  try {
    const { wallet, type, from, to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let baseQuery = 'SELECT wallet_address, amount, type, protocol, "timestamp" FROM transactions WHERE 1=1';
    const values = [];
    let count = 1;

    if (wallet) {
      baseQuery += ` AND wallet_address = $${count++}`;
      values.push(wallet);
    }

    if (type) {
      baseQuery += ` AND type = $${count++}`;
      values.push(type);
    }

    if (from) {
      baseQuery += ` AND "timestamp" >= $${count++}`;
      values.push(new Date(from));
    }

    if (to) {
      baseQuery += ` AND "timestamp" <= $${count++}`;
      values.push(new Date(to));
    }

    baseQuery += ` ORDER BY "timestamp" DESC LIMIT $${count++} OFFSET $${count++}`;
    values.push(limit, offset);

    const result = await pool.query(baseQuery, values);

    res.json({
      page: Number(page),
      limit: Number(limit),
      transactions: result.rows,
    });
  } catch (err) {
    console.error('Error fetching transactions:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});




let topWalletSet = new Set();

async function loadTopWallets() {
  const result = await pool.query('SELECT wallet_address FROM top_wallets');
  topWalletSet = new Set(result.rows.map(r => r.wallet_address));
}


(async () => {
  await loadTopWallets();
  await fetchHistoricalTransactions(topWalletSet);
})();


async function safeParsedTransaction(txSig) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await sleep(200); // soft delay before attempt
      return await connection.getParsedTransaction(txSig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
    } catch (err) {
      if (err.message.includes('429') || err.message.includes('rate limited')) {
        console.warn(`Rate limited on getParsedTransaction. Retrying (attempt ${attempt + 1})...`);
        await sleep(1500 * (attempt + 1));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Failed to fetch parsed transaction');
}

function identifyProtocol(tx) {
  const PROGRAM_IDS = {
    jupiter: [
      'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
      'JupT2iA2Zx9ZGzvq9xUCUWh6aX1tg6zVLFqzQoCvHZr',
    ],
    raydium: [
      '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
      'EhhTKYdzFi7VrUfto5fMgDpmeJK7Fznv97kk8YvXNkmB',
    ],
    orca: [
      '82yxjeMs8Tz3bXjQ58vByb6Q9FYc8kKa3nLJN6y3o5qN',
      '9WwGCeFJYgTt6SdwSBsXRWUnkJGw3Myk8Fjovj5zzKhN',
    ],
  };

  // Extract top-level account keys
  const accountKeys = tx?.transaction?.message?.accountKeys?.map(k =>
    k.pubkey?.toBase58?.() || k.toBase58?.()
  ) || [];

  // Extract inner instruction programIds
  const innerInstructions = tx?.meta?.innerInstructions || [];
  const innerProgramIds = innerInstructions.flatMap(ix =>
    ix.instructions.map(instr => instr.programId?.toBase58?.())
  ).filter(Boolean); // filter out undefined

  const allKeys = [...accountKeys, ...innerProgramIds];

  console.log('ACCOUNT KEYS:', accountKeys);
  console.log('INNER PROGRAM IDs:', innerProgramIds);

  for (const [protocol, ids] of Object.entries(PROGRAM_IDS)) {
    if (allKeys.some(k => ids.includes(k))) {
      return protocol;
    }
  }

  console.log(' No protocol matched for TX');
  return 'Unknown';
}



async function fetchHistoricalTransactions(topWalletSet) {
  const TX_BATCH_SIZE = 4;

  for (const walletAddress of topWalletSet) {
    const ownerPubKey = new PublicKey(walletAddress);

    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPubKey, {
      mint: new PublicKey(process.env.TOKEN_MINT),
    });

    for (const { pubkey: tokenAccountPubkey } of tokenAccounts.value) {
      const tokenAddress = tokenAccountPubkey.toBase58();

      
      const signatures = await connection.getSignaturesForAddress(tokenAccountPubkey, { limit: 100 });

      

      for (let i = 0; i < signatures.length; i += TX_BATCH_SIZE) {
        const batch = signatures.slice(i, i + TX_BATCH_SIZE);

        const txResults = await Promise.allSettled(
          batch.map(async sig => {
            await sleep(200);
            return await safeParsedTransaction(sig.signature);
          })
        );

        for (const result of txResults) {
          if (result.status !== "fulfilled" || !result.value) continue;

          const tx = result.value;
          const protocol = identifyProtocol(tx);
          

          const instructions = [
  ...(tx?.transaction?.message?.instructions || []),
  ...((tx?.meta?.innerInstructions || []).flatMap(i => i.instructions) || []),
];

          for (const ix of instructions) {
  const program = ix.program || ix.programId?.toBase58?.();
  const parsed = ix.parsed;

  if (program === 'spl-token' && parsed?.type === 'transfer') {
    const amount = parsed.info.amount / 1e6;
    const source = parsed.info.source;
    const destination = parsed.info.destination;
    const timestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();

    let sender = null;
    let receiver = null;

              try {
                const [srcInfo, dstInfo] = await Promise.all([
                  safeParsedAccountInfo(new PublicKey(source)),
                  safeParsedAccountInfo(new PublicKey(destination)),
                ]);

                sender = srcInfo?.value?.data?.parsed?.info?.owner || null;
                receiver = dstInfo?.value?.data?.parsed?.info?.owner || null;
              } catch (err) {
                sender = ix.parsed.info.authority || null;
              }

              let type = null;
              let wallet = null;

              if (topWalletSet.has(sender)) {
              type = 'sell';
              wallet = sender;
              } else if (topWalletSet.has(receiver)) {
              type = 'buy';
              wallet = receiver;
              }


              if (type && wallet) {
                console.log(`[LOG] ${type.toUpperCase()} - ${wallet} - ${amount}`);
                await pool.query(
                  `INSERT INTO transactions (wallet_address, amount, type, protocol, timestamp)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT DO NOTHING`,
                  [wallet, amount, type, protocol, timestamp]
                );
              }
            }
          }
        }

        await sleep(500); 
      }
    }
  }

  console.log(`[DONE] All historical transactions fetched for top wallets.]`);
}

let logQueue = [];
let isProcessingLogs = false;

connection.onLogs(new PublicKey(TOKEN_MINT), async (log) => {
  logQueue.push(log);
  if (!isProcessingLogs) processLogQueue();
});

async function processLogQueue() {
  isProcessingLogs = true;
  while (logQueue.length) {
    const log = logQueue.shift();
    try {
      await sleep(1000);
      const txSig = log.signature;
      const txDetails = await safeParsedTransaction(txSig);
      const protocol = identifyProtocol(txDetails);

      const instructions = [
  ...(txDetails?.transaction?.message?.instructions || []),
  ...((txDetails?.meta?.innerInstructions || []).flatMap(i => i.instructions) || []),
];

for (const ix of instructions) {
  const program = ix.program || ix.programId?.toBase58?.();
  const parsed = ix.parsed;

  if (program === 'spl-token' && parsed?.type === 'transfer') {
    const amount = parsed.info.amount / 1e6;
    const source = parsed.info.source;
    const destination = parsed.info.destination;

    let sender = null;
    let receiver = null;

          try {
            const [srcInfo, dstInfo] = await Promise.all([
              safeParsedAccountInfo(new PublicKey(source)),
              safeParsedAccountInfo(new PublicKey(destination)),
            ]);

            sender = srcInfo?.value?.data?.parsed?.info?.owner || null;
            receiver = dstInfo?.value?.data?.parsed?.info?.owner || null;
          } catch (err) {
            console.warn("Realtime: Account fetch failed. Using fallback authority");
            sender = ix.parsed.info.authority || null;
          }

          let type = null;
          let wallet = null;

          if (topWalletSet.has(sender)) {
            type = 'sell';
            wallet = sender;
          } else if (topWalletSet.has(receiver)) {
            type = 'buy';
            wallet = receiver;
          }

          const timestamp = txDetails.blockTime ? new Date(txDetails.blockTime * 1000) : new Date();

          if (type && wallet) {
            await pool.query(
              `INSERT INTO transactions (wallet_address, amount, type, protocol, timestamp)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT DO NOTHING`,
              [wallet, amount, type, protocol, timestamp]
            );
            
          }
        }
      }
    } catch (err) {
      console.error(' Error in real-time transaction:', err.message);
    }
  }
  isProcessingLogs = false;
}



app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});