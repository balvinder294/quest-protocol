
import React, { useState, useEffect } from 'react';
import { useChain } from '../../context/ChainContext';
import { Bomb, RefreshCw, Flag, ChevronLeft, Trophy, Info, ShieldAlert, Cpu } from 'lucide-react';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';

const { Link } = RouterDOM;

export const MinesweeperGame: React.FC = () => {
  const { addGameReward } = useChain();
  const SIZE = 10;
  const MINES = 12;
  const [grid, setGrid] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [flags, setFlags] = useState(0);
  const [showRules, setShowRules] = useState(true);
  const [flagMode, setFlagMode] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const initGame = () => {
    let newGrid = Array(SIZE * SIZE).fill(null).map((_, i) => ({
      id: i, isMine: false, revealed: false, count: 0, flagged: false
    }));
    
    let minesPlanted = 0;
    while (minesPlanted < MINES) {
      const idx = Math.floor(Math.random() * (SIZE * SIZE));
      if (!newGrid[idx].isMine) {
        newGrid[idx].isMine = true;
        minesPlanted++;
      }
    }

    for(let i=0; i<SIZE*SIZE; i++) {
      if(newGrid[i].isMine) continue;
      let count = 0;
      const x = i % SIZE;
      const y = Math.floor(i / SIZE);
      for(let dx=-1; dx<=1; dx++) {
        for(let dy=-1; dy<=1; dy++) {
          if(dx===0 && dy===0) continue;
          const nx = x+dx, ny = y+dy;
          if(nx>=0 && nx<SIZE && ny>=0 && ny<SIZE) {
            if(newGrid[ny*SIZE+nx].isMine) count++;
          }
        }
      }
      newGrid[i].count = count;
    }
    setGrid(newGrid);
    setGameOver(false);
    setWin(false);
    setFlags(0);
  };

  useEffect(() => {
    initGame();
  }, [gameKey]);

  const reveal = (idx: number, currentGrid: any[]) => {
    if (idx < 0 || idx >= SIZE * SIZE || currentGrid[idx].revealed || currentGrid[idx].flagged) return;
    
    currentGrid[idx].revealed = true;
    
    if (currentGrid[idx].count === 0 && !currentGrid[idx].isMine) {
      const x = idx % SIZE;
      const y = Math.floor(idx / SIZE);
      for(let dx=-1; dx<=1; dx++) {
        for(let dy=-1; dy<=1; dy++) {
          const nx = x+dx, ny = y+dy;
          if(nx>=0 && nx<SIZE && ny>=0 && ny<SIZE) {
            reveal(ny*SIZE+nx, currentGrid);
          }
        }
      }
    }
  };

  const handleClick = (idx: number) => {
    if (gameOver || win) return;
    
    if (flagMode) {
      toggleFlag(idx);
      return;
    }

    const newGrid = [...grid];
    if (newGrid[idx].flagged || newGrid[idx].revealed) return;

    if (newGrid[idx].isMine) {
      newGrid[idx].revealed = true;
      setGameOver(true);
      newGrid.forEach(c => {
        if(c.isMine) c.revealed = true;
      });
      setGrid(newGrid);
    } else {
      reveal(idx, newGrid);
      setGrid(newGrid);
      checkWin(newGrid);
    }
  };

  const toggleFlag = (idx: number) => {
    if (gameOver || win || grid[idx].revealed) return;
    const newGrid = [...grid];
    newGrid[idx].flagged = !newGrid[idx].flagged;
    setGrid(newGrid);
    setFlags(prev => newGrid[idx].flagged ? prev + 1 : prev - 1);
  };

  const handleContextMenu = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    toggleFlag(idx);
  };

  const checkWin = (currentGrid: any[]) => {
    const revealedCount = currentGrid.filter(c => c.revealed).length;
    if (revealedCount === (SIZE * SIZE - MINES)) {
      setWin(true);
      addGameReward(50, 'Void Sweeper');
    }
  };

  const resetGame = () => {
    setGameKey(p => p + 1);
    setShowRules(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black font-sans text-sci-cyan tracking-widest uppercase">Void Sweeper</h1>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls & Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Diagnostic HUD</h3>
            
            <div className="space-y-4">
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-slate-500 mb-1">SENSOR STATUS</p>
                <div className={`text-lg font-black font-sans tracking-tight ${gameOver ? 'text-red-500' : win ? 'text-green-400' : 'text-sci-cyan'}`}>
                  {gameOver ? 'LINK SEVERED' : win ? 'SCAN COMPLETE' : 'ACTIVE_SCAN'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-slate-500 mb-1">ANOMALY COUNT</p>
                <div className="text-3xl font-black font-mono text-red-400">{Math.max(0, MINES - flags)}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button 
                onClick={() => setFlagMode(!flagMode)}
                className={`w-full font-black py-3 rounded uppercase tracking-widest transition-all border flex items-center justify-center text-xs ${
                  flagMode ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Flag size={14} className="mr-2" /> {flagMode ? 'FLAG_ON' : 'FLAG_OFF'}
              </button>

              <button 
                onClick={resetGame}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded uppercase tracking-widest transition-all border border-slate-700 text-xs flex items-center justify-center"
              >
                <RefreshCw size={14} className="mr-2" /> REBOOT_PROBE
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center">
              <Info size={12} className="mr-2" /> INSTRUCTIONS
            </h3>
            <ul className="space-y-3 text-[11px] font-mono text-slate-400">
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">01.</span> Clear the 10x10 grid without triggering any anomalies (mines).
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">02.</span> Numbers indicate how many anomalies are in adjacent sectors.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">03.</span> Right-click or use Flag Mode to mark suspected anomalies.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">04.</span> Reward: 50 QUEST for successful sector clearance.
              </li>
            </ul>
          </div>
        </div>

        {/* Game Area */}
        <div className="lg:col-span-3 flex justify-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl shadow-inner relative overflow-hidden min-h-[500px]">
          {/* Background decorative scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_4px,3px_100%]"></div>

          {showRules && !win && !gameOver && (
            <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md animate-in fade-in duration-500">
              <ShieldAlert size={64} className="text-sci-cyan mb-6 animate-pulse" />
              <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Sector Initialization</h2>
              <p className="text-slate-400 mb-8 max-w-md font-mono text-sm">
                Unidentified interference detected in Sector 7G. Use the high-frequency probe to map the area. Caution: Volatile energy nodes present.
              </p>
              <button 
                onClick={() => setShowRules(false)} 
                className="bg-sci-cyan hover:bg-white text-slate-950 font-black px-12 py-4 rounded uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                Deploy Probe
              </button>
            </div>
          )}

          {win && (
             <div className="absolute inset-0 z-20 bg-sci-bg/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md animate-in zoom-in duration-300">
              <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
              <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Sector Secured</h2>
              <p className="text-sci-cyan mb-8 font-mono text-lg tracking-widest">+50 QUEST RECEIVED</p>
              <button onClick={resetGame} className="bg-white text-slate-950 font-black px-12 py-4 rounded uppercase tracking-widest transition-all hover:scale-105">New Mission</button>
            </div>
          )}

          {gameOver && (
             <div className="absolute inset-0 z-20 bg-red-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md animate-in fade-in duration-500">
              <Bomb size={64} className="text-white mb-6 animate-ping" />
              <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Probe Lost</h2>
              <p className="text-red-300 mb-8 font-mono text-sm">Thermal detonation detected. Connection terminated.</p>
              <button onClick={resetGame} className="bg-white text-red-600 font-black px-12 py-4 rounded uppercase tracking-widest transition-all hover:bg-red-500 hover:text-white">Retry Link</button>
            </div>
          )}

          <div 
            className="grid gap-1 bg-slate-950/50 p-3 rounded-lg border border-slate-800 shadow-2xl relative z-10" 
            style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {grid.map((cell, i) => (
              <div
                key={i}
                onClick={() => handleClick(i)}
                onContextMenu={(e) => handleContextMenu(e, i)}
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 
                  flex items-center justify-center text-sm md:text-lg font-black rounded-sm cursor-pointer transition-all duration-150 border
                  ${cell.revealed 
                    ? (cell.isMine ? 'bg-red-500 border-red-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-900 border-slate-800 text-sci-cyan') 
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 shadow-inner'
                  }
                  ${!cell.revealed && cell.flagged ? 'border-yellow-500' : ''}
                `}
              >
                {cell.revealed && cell.isMine && <Cpu size={20} className="animate-pulse" />}
                {cell.revealed && !cell.isMine && cell.count > 0 && (
                  <span className={`${
                    cell.count === 1 ? 'text-blue-400' : 
                    cell.count === 2 ? 'text-green-400' : 
                    cell.count === 3 ? 'text-red-400' : 
                    cell.count === 4 ? 'text-sci-purple' : 'text-yellow-400'
                  }`}>
                    {cell.count}
                  </span>
                )}
                {!cell.revealed && cell.flagged && <Flag size={16} className="text-yellow-400 animate-bounce" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
