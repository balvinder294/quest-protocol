# Prompt History

## 1. Initial Protocol Creation
**User:** "Use Blurt Blockchain to create a side chain for gaming with a side chain token Quest. Initially mint 1 M tokens."
**Result:** Created the core `Quest Protocol` application, including:
- `ChainContext` for state management (Balances, Blocks, Transactions).
- SQLite-based browser storage.
- Basic UI (Dashboard, Explorer, Wallet).
- Authentication via Blurt.

## 2. Space Attack Game Update
**User:** "Add option to change a different card from basic to premium minted for the attack game"
**Result:**
- Enhanced `SpaceAttackGame.tsx` with a "Hangar" tab.
- Implemented `Ascension` mechanic allowing Basic cards (Traveller, Cadet, Engineer) to upgrade to Elite cards (Pilot, Commander, Cyborg) for a fee.
- Added Multi-character selection logic.
- Updated `ChainContext` with `promoteNFT` function to preserve XP/Level during upgrade.

## 3. Deployment & Documentation
**User:** "ok, let me know steps to deploy on my linux server. Also document prompt history in prompts.md changelog in changelog.md instructions in readme. md"
**Result:**
- Created `package.json`, `vite.config.ts`, `tsconfig.json` for build processes.
- Updated `README.md` with specific Linux/Nginx deployment steps.
- Created `prompts.md` (this file).
- Created `changelog.md` tracking version history.