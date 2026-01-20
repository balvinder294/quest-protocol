
import React from 'react';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';
import { ChainProvider, useChain } from './context/ChainContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Explorer } from './pages/Explorer';
import { Admin } from './pages/Admin';
import { Games } from './pages/Games';
import { Swap } from './pages/Swap';
import { Inventory } from './pages/Inventory';
import { NodeManager } from './pages/NodeManager';
import { MinesweeperGame } from './pages/games/MinesweeperGame';
import { BlockMergeGame } from './pages/games/BlockMergeGame';
import { BlockLinkGame } from './pages/games/BlockLinkGame';
import { TetrisGame } from './pages/games/TetrisGame';
import { FruitSlasherGame } from './pages/games/FruitSlasherGame';
import { BlockRunnerGame } from './pages/games/BlockRunnerGame';
import { AlienHuntGame } from './pages/games/AlienHuntGame';
import { SpaceAttackGame } from './pages/games/SpaceAttackGame';

const { HashRouter, Routes, Route, Navigate } = RouterDOM;

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useChain();
  if (!user.username) {
    return <Navigate to="/login" replace />;
  }
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
            
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/nodes" element={
              <ProtectedRoute>
                <NodeManager />
              </ProtectedRoute>
            } />

            <Route path="/inventory" element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            } />
            
            <Route path="/swap" element={
              <ProtectedRoute>
                <Swap />
              </ProtectedRoute>
            } />
            
            <Route path="/games" element={
              <ProtectedRoute>
                <Games />
              </ProtectedRoute>
            } />
            
            <Route path="/games/minesweeper" element={
              <ProtectedRoute>
                <MinesweeperGame />
              </ProtectedRoute>
            } />

            <Route path="/games/block-merge" element={
              <ProtectedRoute>
                <BlockMergeGame />
              </ProtectedRoute>
            } />

            <Route path="/games/block-link" element={
              <ProtectedRoute>
                <BlockLinkGame />
              </ProtectedRoute>
            } />

            <Route path="/games/tetris" element={
              <ProtectedRoute>
                <TetrisGame />
              </ProtectedRoute>
            } />

            <Route path="/games/fruit-slasher" element={
              <ProtectedRoute>
                <FruitSlasherGame />
              </ProtectedRoute>
            } />

            <Route path="/games/block-runner" element={
              <ProtectedRoute>
                <BlockRunnerGame />
              </ProtectedRoute>
            } />

            <Route path="/games/alien-hunt" element={
              <ProtectedRoute>
                <AlienHuntGame />
              </ProtectedRoute>
            } />

            <Route path="/games/space-attack" element={
              <ProtectedRoute>
                <SpaceAttackGame />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />

            <Route path="/explorer" element={<Explorer />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        
        {/* Footer / Status Bar */}
        <footer className="border-t border-slate-900 bg-slate-950 py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-[10px] font-mono text-slate-600">
             <div>QUEST_PROTOCOL_V1.2.0 [BETA]</div>
             <div>NODE_STATUS: BROWSER_ACTIVE</div>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <ChainProvider>
      <AppContent />
    </ChainProvider>
  );
};

export default App;
