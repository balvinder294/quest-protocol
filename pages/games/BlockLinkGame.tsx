
import React, { useState, useEffect } from 'react';
import { useChain } from '../../context/ChainContext';
import { RefreshCw, ChevronLeft, Link as LinkIcon, Info, Target, Zap, Activity } from 'lucide-react';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';

const { Link } = RouterDOM;

export const BlockLinkGame: React.FC = () => {
  const { addGameReward } = useChain();
  const COLS = 6;
  const ROWS = 8;
  const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
  const MAX_MOVES = 20;
  const TARGET_SCORE = 1000;

  const [grid, setGrid] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MAX_MOVES);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');

  const initGame = () => {
    const newGrid = Array(COLS * ROWS).fill(0).map(() => Math.floor(Math.random() * COLORS.length));
    setGrid(newGrid);
    setScore(0);
    setMoves(MAX_MOVES);
    setGameOver(false);
    setMessage('');
    setSelected([]);
  };

  useEffect(() => initGame(), []);

  const isAdjacent = (idx1: number, idx2: number) => {
    const x1 = idx1 % COLS, y1 = Math.floor(idx1 / COLS);
    const x2 = idx2 % COLS, y2 = Math.floor(idx2 / COLS);
    return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
  };

  const handleTileClick = (idx: number) => {
    if (gameOver || moves <= 0) return;
    
    if (selected.length > 0 && selected[selected.length - 1] === idx) {
      setSelected(prev => prev.slice(0, -1));
      return;
    }

    if (selected.length === 0) {
      setSelected([idx]);
      return;
    }

    const lastIdx = selected[selected.length - 1];
    if (isAdjacent(lastIdx, idx) && grid[idx] === grid[lastIdx] && !selected.includes(idx)) {
      setSelected([...selected, idx]);
    } else if (grid[idx] !== grid[lastIdx]) {
      setSelected([idx]);
    }
  };

  const executeLink = () => {
    if (selected.length < 2) return;

    const newGrid = [...grid];
    const points = selected.length * 10 * selected.length;
    setScore(prev => prev + points);
    setMoves(prev => prev - 1);

    selected.forEach(i => newGrid[i] = -1);

    for (let col = 0; col < COLS; col++) {
      let writePtr = ROWS - 1;
      for (let row = ROWS - 1; row >= 0; row--) {
        const idx = row * COLS + col;
        if (newGrid[idx] !== -1) {
          const val = newGrid[idx];
          newGrid[idx] = -1;
          newGrid[writePtr * COLS + col] = val;
          writePtr--;
        }
      }
      while (writePtr >= 0) {
        newGrid[writePtr * COLS + col] = Math.floor(Math.random() * COLORS.length);
        writePtr--;
      }
    }

    setGrid(newGrid);
    setSelected([]);

    if (moves - 1 <= 0 || score + points >= TARGET_SCORE) {
       setGameOver(true);
       if (score + points >= TARGET_SCORE) {
         setMessage('PROTOCOL STABILIZED. REWARD DISPATCHED.');
         addGameReward(30, 'Node Link');
       } else {
         setMessage('CONNECTION TIMEOUT. SIGNAL LOST.');
       }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black font-sans text-sci-cyan tracking-widest uppercase">Node Link</h1>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         {/* Sidebar Controls */}
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
              <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Connection Stats</h3>
              
              <div className="space-y-4">
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <p className="text-[10px] font-mono text-sci-cyan mb-1 flex items-center">
                    <Target size={10} className="mr-1" /> SYNC_TARGET
                  </p>
                  <div className="text-xl font-black text-white">{score} / {TARGET_SCORE}</div>
                  <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-sci-cyan transition-all duration-500" style={{ width: `${Math.min(100, (score/TARGET_SCORE)*100)}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <p className="text-[10px] font-mono text-slate-500 mb-1 flex items-center">
                    <Activity size={10} className="mr-1" /> SIGNAL_LIFE
                  </p>
                  <div className={`text-2xl font-black font-mono ${moves < 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{moves} Ops</div>
                </div>
              </div>

              <button 
                onClick={initGame} 
                className="w-full mt-6 bg-slate-800 border border-slate-700 text-slate-300 font-black py-4 rounded uppercase tracking-widest transition-all text-xs flex items-center justify-center hover:bg-slate-700 hover:text-white"
              >
                <RefreshCw size={14} className="mr-2" /> Reset_Nodes
              </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
              <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center">
                <Info size={12} className="mr-2" /> SIGNAL LINKING
              </h3>
              <ul className="space-y-3 text-[11px] font-mono text-slate-400">
                <li className="flex items-start">
                  <span className="text-sci-cyan mr-2">01.</span> Link adjacent nodes of the same frequency (color).
                </li>
                <li className="flex items-start">
                  <span className="text-sci-cyan mr-2">02.</span> Longer chains provide exponential signal stability.
                </li>
                <li className="flex items-start">
                  <span className="text-sci-cyan mr-2">03.</span> Reach 1000 SYNC points before operations expire.
                </li>
                <li className="flex items-start">
                  <span className="text-sci-cyan mr-2">04.</span> Reward: 30 QUEST for network stabilization.
                </li>
              </ul>
            </div>
         </div>

         {/* Game Area */}
         <div className="lg:col-span-3 flex flex-col items-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl shadow-inner relative overflow-hidden min-h-[600px]">
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_4px,3px_100%]"></div>
            
            {gameOver && (
              <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md animate-in fade-in zoom-in duration-300">
                 <div className={`text-5xl font-black mb-4 uppercase tracking-tighter ${score >= TARGET_SCORE ? 'text-sci-cyan' : 'text-red-500'}`}>
                   {score >= TARGET_SCORE ? 'Sync Complete' : 'Signal Failure'}
                 </div>
                 <p className="text-slate-400 mb-10 font-mono text-lg">{message}</p>
                 <button onClick={initGame} className="bg-white text-slate-950 font-black px-12 py-4 rounded uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]">Retry Uplink</button>
              </div>
            )}

            <div className="grid gap-3 relative z-10" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
               {grid.map((colorIdx, i) => (
                 <button
                   key={i}
                   onClick={() => handleTileClick(i)}
                   className={`
                     w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all duration-300 border-4 
                     ${COLORS[colorIdx]}
                     ${selected.includes(i) ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10 animate-pulse' : 'border-slate-950/50 opacity-80 hover:opacity-100 hover:scale-105'}
                   `}
                 />
               ))}
            </div>
            
            <div className="mt-12 h-20 w-full flex justify-center relative z-10">
              {selected.length >= 2 && (
                <button 
                  onClick={executeLink}
                  className="bg-white text-slate-950 font-black px-10 py-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.4)] animate-in slide-in-from-bottom-4 duration-300 flex items-center uppercase tracking-widest text-sm"
                >
                  <Zap size={18} className="mr-2 text-yellow-500 fill-current" /> Initialize Link (+{selected.length * 10 * selected.length})
                </button>
              )}
            </div>
         </div>
      </div>
    </div>
  );
};
