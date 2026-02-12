
# 🌌 Quest Protocol | Decentralized MongoDB Sidechain

Quest Protocol is a high-performance Layer 2 (L2) sidechain built for the **Blurt Blockchain**. It transitions state management from local browser storage to a distributed **MongoDB Cluster**, allowing for a truly decentralized gaming economy.

---

## 🛠 Node Operator Guide (Decentralization)

To support the network and earn **QUEST Mining Rewards**, you can run your own protocol node.

### 1. Requirements
- Node.js v18+
- MongoDB Instance (Local or Cloud)
- Blurt Account with a **Node Access Pass** NFT.

### 2. Deployment
Clone the protocol files to your server and run:
```bash
# Install dependencies
npm install

# Start the Witness Node
# Replace --name with your Blurt username
# Replace --peers with existing node ports
node witness-node.js --port 8089 --name yourusername --mongo mongodb://localhost:27017 --peers 8090,8091
```

### 3. Client Linking
Community members can connect to your node by navigating to the **Node Manager** in the UI and entering your WebSocket endpoint (e.g., `ws://your-ip:8089`).

---

## 💎 Tokenomics & Assets

- **Native Token**: QUEST
- **Consensus**: DPoS (Delegated Proof of Stake).
- **L1 Bridge**: Fixed 1:10 BLURT-to-QUEST ratio.
- **Quest Power (QP)**: Staked tokens that determine your influence in the witness rotation.

---

## 🚀 Getting Started

### 1. Establish Identity
Login using **WhaleVault**, **Posting Key**, or **SideVault (Seed)**. Note that Seed accounts operate in **Guest Mode** with simulated rewards.

### 2. Enter Simulation Deck
Earn tokens through arcade-style training modules. Requires a one-time burn of 500 QUEST for a Gaming Pass.

### 3. NFT Management
Provision, level, and refit character modules in the **Hangar**. Characters are anchored to the MongoDB global state, ensuring persistence across all nodes in the cluster.

---

## 👨‍💻 Protocol Architecture
Quest Protocol treats the Blurt Mainnet as a **Data Availability (DA)** layer. Blocks produced on the sidechain are hashed and anchored to Blurt via `custom_json` (ID: `quest_p_v1`). The MongoDB instance acts as the **State Projection**, providing instant finality for gaming interactions.

**Lead Architects**: [@tekraze](https://blurt.blog/@tekraze) & [@kamranrkploy](https://blurt.blog/@kamranrkploy)
*Version: 1.8.0-MONGO | Status: OPERATIONAL*
