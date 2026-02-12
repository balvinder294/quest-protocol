import React from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ChainProvider, useChain } from './context/ChainContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Explorer } from './pages/Explorer';
import { Admin } from './pages/Admin';
import { AdminNFTManager } from './pages/AdminNFTManager';
import { Games } from './pages/Games';
import { Swap } from './pages/Swap';
import { Inventory } from './pages/Inventory';
import { NodeManager } from './pages/NodeManager';
import { DepositClaim } from './pages/DepositClaim';
import { Leaderboard } from './pages/Leaderboard';
import { Predictor } from './pages/Predictor';
import { Team } from './pages/Team';
import { Staking } from './pages/Staking';
import { Visualizer } from './pages/Visualizer';
import { MinesweeperGame } from './pages/games/MinesweeperGame';
import { BlockMergeGame } from './pages/games/BlockMergeGame';
import { BlockLinkGame } from './pages/games/BlockLinkGame';
import { TetrisGame } from './pages/games/TetrisGame';
import { FruitSlasherGame } from './pages/games/FruitSlasherGame';
import { BlockRunnerGame } from './pages/games/BlockRunnerGame';
import { AlienHuntGame } from './pages/games/AlienHuntGame';
import { SpaceAttackGame } from './pages/games/SpaceAttackGame';
import { WhackAMoleGame } from './pages/games/WhackAMoleGame';
import { LudoGame } from './pages/games/LudoGame';
import { SnakesAndLaddersGame } from './pages/games/SnakesAndLaddersGame';
import { GridHuntGame } from './pages/games/GridHuntGame';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useChain();
  if (!user.username) return <Navigate to="/login" replace />;
  return children;
};

const AppContent: React.FC = () => {
  const { user } = useChain();

  return (
    <HashRouter>
      <div className="min-h-screen bg-sci-bg text-slate-200 selection:bg-sci-cyan selection:text-black flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/login" element={user.username ? <Navigate to="/" /> : <Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/nodes" element={<ProtectedRoute><NodeManager /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/swap" element={<ProtectedRoute><Swap /></ProtectedRoute>} />
            <Route path="/claim" element={<ProtectedRoute><DepositClaim /></ProtectedRoute>} />
            <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/gov" element={<ProtectedRoute><Staking /></ProtectedRoute>} />
            <Route path="/visualizer" element={<ProtectedRoute><Visualizer /></ProtectedRoute>} />
            
            <Route path="/games/predictor" element={<ProtectedRoute><Predictor /></ProtectedRoute>} />
            <Route path="/games/minesweeper" element={<ProtectedRoute><MinesweeperGame /></ProtectedRoute>} />
            <Route path="/games/block-merge" element={<ProtectedRoute><BlockMergeGame /></ProtectedRoute>} />
            <Route path="/games/block-link" element={<ProtectedRoute><BlockLinkGame /></ProtectedRoute>} />
            <Route path="/games/tetris" element={<ProtectedRoute><TetrisGame /></ProtectedRoute>} />
            <Route path="/games/fruit-slasher" element={<ProtectedRoute><FruitSlasherGame /></ProtectedRoute>} />
            <Route path="/games/block-runner" element={<ProtectedRoute><BlockRunnerGame /></ProtectedRoute>} />
            <Route path="/games/alien-hunt" element={<ProtectedRoute><AlienHuntGame /></ProtectedRoute>} />
            <Route path="/games/space-attack" element={<ProtectedRoute><SpaceAttackGame /></ProtectedRoute>} />
            <Route path="/games/whack-a-mole" element={<ProtectedRoute><WhackAMoleGame /></ProtectedRoute>} />
            <Route path="/games/ludo" element={<ProtectedRoute><LudoGame /></ProtectedRoute>} />
            <Route path="/games/snakes" element={<ProtectedRoute><SnakesAndLaddersGame /></ProtectedRoute>} />
            <Route path="/games/grid-hunt" element={<ProtectedRoute><GridHuntGame /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/admin/nfts" element={<ProtectedRoute><AdminNFTManager /></ProtectedRoute>} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-[10px] font-mono text-slate-600">
             <div>QUEST_PROTOCOL_V1.7.5 [STABLE]</div>
             <div className="flex gap-4">
                <Link to="/team" className="hover:text-sci-cyan transition">COMMAND_TEAM</Link>
                <span>NODE_STATUS: TRIPLE_CLUSTER_SYNC</span>
             </div>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
};

const App: React.FC = () => (
  <ChainProvider>
    <AppContent />
  </ChainProvider>
);

export default App;