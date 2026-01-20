# Quest Protocol Versioning & Upgrade Guide

Quest Protocol follows a structured versioning system to ensure sidechain stability and consensus across distributed browser/server nodes.

## 🏷 Protocol Versions

- **Major (X.0.0)**: Hard Fork. Requires all nodes to upgrade. Incompatible with previous chain state without a migration snapshot.
- **Minor (0.X.0)**: Soft Fork. New features (e.g., new game rewards, transaction types) that are backwards compatible.
- **Patch (0.0.X)**: Maintenance. Bug fixes in the UI or client logic.

## 🔄 Upgrade Procedure

### 1. Hard Fork via Snapshots
When a Major upgrade is released (e.g., v1.2 -> v2.0):
1. The Lead Witness (@tekraze) creates a **Final State Snapshot** of the v1.x chain.
2. All nodes stop mining on the old protocol.
3. The new protocol binary (UI/Node code) is deployed.
4. Nodes restore the **Migration Snapshot** to initialize the v2.0 chain with existing balances.

### 2. Version Verification
The `witness-node.js` and browser client include a `PROTOCOL_VERSION` constant.
- Blocks produced by outdated versions are rejected by the P2P network.
- The `index_id` of the first block in a new version is recorded as the **Upgrade Height**.

## 🛡 Security & Consensus
Versioned updates must be signed by the Admin or approved via a Witness Vote (v1.3 feature). 
Current authorized versioning key: `tekraze.blurt`

---
*Protocol Version: 1.2.0-STABLE*
