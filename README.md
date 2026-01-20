
# Quest Protocol Deployment Guide

Welcome to the **Quest Protocol** sidechain. This protocol operates as a Layer 2 solution on the Blurt Blockchain, utilizing a Delegated Proof of Stake (DPoS) witness consensus mechanism.

## 🚀 Deployment Options

### 1. Browser Node (Standard)
The protocol is designed to run directly in the browser using SQLite (sql.js). 
- **Setup**: Simply open `index.html` (or serve the `dist` folder after building).
- **Identity**: Authenticate via Blurt Keychain.
- **Persistence**: Data is saved to `localStorage` automatically.

### 2. Linux Server Deployment
To host the frontend and the witness node on a Linux server (Ubuntu/Debian recommended):

#### Frontend (Nginx)
1.  **Install Node.js**: Ensure Node.js v18+ is installed.
2.  **Upload Files**: Copy the project to `/var/www/quest-protocol`.
3.  **Build**:
    ```bash
    cd /var/www/quest-protocol
    npm install
    npm run build
    ```
4.  **Configure Nginx**:
    Create `/etc/nginx/sites-available/quest` with:
    ```nginx
    server {
        listen 80;
        server_name your-domain.com;
        location / {
            root /var/www/quest-protocol/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }
    }
    ```
5.  **Restart Nginx**: `sudo systemctl restart nginx`.

#### Witness Node (Backend)
For high-availability block production:
1.  **Install PM2**: `npm install -g pm2`
2.  **Start Node**:
    ```bash
    export WITNESS_NAME=your_witness_name
    pm2 start witness-node.js --name quest-witness
    ```
3.  **Save List**: `pm2 save && pm2 startup`

### 3. Standalone Witness Node (Local)
- **Requirements**: Node.js v16+, `npm install ws sqlite3`.
- **Run**: `WITNESS_NAME=yourusername node witness-node.js`.
- **Default Port**: `8089`

---

## 🛠 Management Tasks

### 📦 Snapshots
Snapshots allow new nodes to sync instantly without replaying history.
1. Go to the **Admin Panel**.
2. Click **Export Snapshot** to generate a `.qps` binary file.
3. Distribution: Upload this file to a public CDN or IPFS for other node operators.
4. Restoring: Use the **Import Snapshot** tool to bootstrap a new environment.

### 🛡 Consensus & Witnessing
- **Turn-based Mining**: Blocks can only be signed by the scheduled witness.
- **Rewards**: Witnesses earn 50 QUEST per block signed.
- **Voting**: Users can vote for witnesses (feature in v1.3) to determine the rotation schedule.

### ⚖ Governance
- **Treasury**: The protocol treasury manages the token supply.
- **Game Pass**: Fee-based access control for simulations, burning QUEST to maintain deflationary pressure.

---

## 📈 Roadmap
- [x] v1.2: Snapshot System & Basic Witnessing
- [x] v1.2.1: Ascension System & Deployment Configs
- [ ] v1.3: Delegated Voting & On-chain Governance
- [ ] v1.4: Cross-chain NFT Bridge for Game Assets