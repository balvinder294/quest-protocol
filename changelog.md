# Changelog

## v1.2.1 (Current)
- **Deployment**: Added `package.json` and Vite configuration for standard Linux builds.
- **Gameplay**: Added **Ascension Module** in Space Attack Hangar. Players can now refit basic units into Elite units while keeping their XP and Level.
- **UI**: Added "PRIME" visual indicators for Elite NFTs in the inventory.
- **Core**: Added `promoteNFT` transaction type to the chain logic.

## v1.2.0
- **Storage**: Migrated to `sql.js` (SQLite) for robust in-browser data persistence.
- **Snapshot**: Added Export/Import Snapshot functionality in Admin Panel for node syncing.
- **Games**: Added `Space Attack` turn-based strategy game.
- **NFTs**: Implemented Character and Augment NFT standards with leveling logic.

## v1.1.0
- **Games**: Added Arcade Suite (`Minesweeper`, `Tetris`, `Block Link`, `Block Merge`, `Fruit Slasher`, `Alien Hunt`, `Block Runner`).
- **Economy**: Implemented Gaming Pass system (Fee burn mechanism).
- **Network**: Added "Witness Node" simulation in the browser (Proof of Authority/Round Robin).

## v1.0.0
- **Launch**: Initial release of Quest Protocol.
- **Features**:
  - Blurt Blockchain Authentication.
  - QUEST Token (Genesis Supply: 1,000,000).
  - Basic Wallet & Transaction History.
  - Block Explorer & Mempool visualization.