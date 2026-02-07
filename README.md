# 🌌 Quest Protocol | Blurt Gaming Sidechain (L2)

Quest Protocol is a decentralized Layer 2 (L2) gaming sidechain built on top of the **Blurt Blockchain**. It leverages Blurt for **Data Availability (DA)** through block anchoring, while maintaining a high-performance, low-fee environment for gaming transactions and NFT management.

---

## 💎 Tokenomics & Assets

- **Native Token**: QUEST
- **Genesis Supply**: 1,000,000 QUEST (Minted to Genesis Anchor)
- **Max Supply**: 1,000,000,000 QUEST
- **Mining Reward**: 50 QUEST per block (Distributed to active Witness)
- **L1 Bridge**: 1 BLURT = 10 QUEST (Fixed rate bridge)
- **Quest Power (QP)**: Staked QUEST used for governance voting and Resource Credit (Mana) regeneration.

---

## 🚀 Getting Started

### 1. Establish Identity
Login using one of three secure methods:
- **WhaleVault (Recommended)**: Use your existing Blurt account.
- **Private Posting Key**: Direct entry (Session RAM storage only).
- **SideVault (Mnemonic)**: Create a standalone 12-word identity independent of Blurt Mainnet.

### 2. Synchronize with Mainnet
Since Quest is a sidechain, its "source of truth" is anchored to the Blurt Blockchain.
1. Go to the **Explorer** tab.
2. Click **Sync with Mainnet**.
3. The protocol will scan the Blurt history of the Genesis Anchor and current Witnesses to rebuild the ledger in your local browser database (SQLite).

---

## 🕹 The Simulation Deck
Earn tokens through various protocol training modules:
- **Gaming Pass**: Access requires a one-time burn of 500 QUEST.
- **Simulation Rewards**: Tokens are dispatched for successful simulation completions (Minesweeper, Tetris, Space Tactics, etc.).
- **NFT Ascension**: Characters gain XP. Use the **Hangar** to refit basic units into **Elite (Prime)** classes.

---

## 🛠 Node Operation & Witnessing

The network is secured by **Delegated Proof of Stake (DPoS)**.

### How to become a Witness (Node):
1. **Mint a Node Pass**: Purchase a Node Access NFT (1000 QUEST) in the **Nodes** section.
2. **Activate Node**: Ensure your node session is active to participate in the consensus rotation.
3. **Earn Votes**: Other users must **Stake** their QUEST and vote for your username.
4. **Sign Blocks**: When it is your "Consensus Turn," you can sign the pending transactions and anchor the block to Blurt to receive the **50 QUEST reward**.

---

## 👨‍💻 Developer & Network Setup

### Change the Genesis Anchor
To launch your own version of Quest Protocol or to fork the network:
1. Open `types.ts`.
2. Change `ADMIN_USER` to your Blurt username.
3. The first time you login, the 1,000,000 QUEST Genesis supply will be minted to your account.
4. Your account history will then become the "Sync Target" for all other nodes.

### Deployment
- **Browser**: Simply host `index.html` on any web server or IPFS.
- **Server**: Run `node witness-node.js` on a Linux server for 24/7 P2P propagation.

---

## ⚖ Protocol Integrity
- **Consensus**: DPoS (Round Robin based on QP Votes).
- **Anchoring**: Blocks are sealed to Blurt using `custom_json` with ID `quest_p_v1`.
- **Database**: SQL.js (SQLite via WASM).

**Lead Architects**: [@tekraze](https://blurt.blog/@tekraze) & [@kamranrkploy](https://blurt.blog/@kamranrkploy)
*Version: 1.6.0-DECENTRALIZED | Status: OPERATIONAL*