
import React, { useState } from 'react';
import { useChain } from '../../context/ChainContext';
import { ChevronLeft, Trophy, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
// Fix: Use standard named import for Link
import { Link } from 'react-router-dom';

export const SnakesAndLaddersGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [pos, setPos] = useState(1);
  const [dice, setDice] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [log, setLog] = useState<string[]>(['Signal uplink ready. Generate entropy.']);
  const [win, setWin] = useState(false);

  const LADDERS: Record<number, number> = { 3: 15, 8: 22, 17: 35, 29: 45 };
  const SNAKES: Record<number, number> = { 12: 2, 25: 10, 38: 20, 47: 30 };
  const GOAL = 50;

  const roll = () => {
    if (win || isRolling) return;
    setIsRolling(true);
    
    let count = 0;
    const interval = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 8) {
        clearInterval(interval);
        const val = Math.floor(Math.random() * 6) + 1;
        setDice(val);
        setIsRolling(false);
        executeMove(val);
      }
    }, 80);
  };

  const executeMove = (val: number) => {
    let next = pos + val;
    let msg = `Entropy ${val} -> Moved to ${next}`;

    if (next >= GOAL) {
      setPos(GOAL);
      setWin(true);
      addGameReward(70, 'Signal Ladders');
      setLog([`PROTOCOL v50 VERIFIED. DISPATCHING REWARDS.`, ...log]);
      return;
    }

    if (LADDERS[next]) {
      msg = `Entropy ${val} -> SIGNAL BOOST! Link established to ${LADDERS[next]}`;
      next = LADDERS[next];
    } else if (SNAKES[next]) {
      msg = `Entropy ${val} -> SIGNAL DROP! Connection failed to ${SNAKES[next]}`;
      next = SNAKES[next];
    }

    setPos(next);
    setLog([msg, ...log].slice(0, 5));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-10">
        <Link to="/games" className="text-slate-400 hover:text-white flex items-center group transition">
          <ChevronLeft className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-black text-green-500 tracking-widest uppercase">Signal Ladders</h1>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Network Integrity Simulation</p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Stats & Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 left-0 w-full h-1 bg-green-500 opacity-20"></div>
             <p className="text-slate-500 font-mono text-xs uppercase mb-6">Probability Core</p>
             <div className={`bg-slate-950 w-32 h-32 rounded-3xl border-2 border-green-500/30 mx-auto mb-8 flex items-center justify-center text-7xl font-black transition-all ${isRolling ? 'blur-sm scale-90 text-green-900' : 'text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]'}`}>
               {dice || '?'}
             </div>
             <button 
               onClick={roll} 
               disabled={win || isRolling} 
               className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-xl text-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter"
             >
               {isRolling ? 'Processing...' : 'Generate Sync'}
             </button>
          </div>

          <div className="bg-black/40 border border-slate-800 p-6 rounded-2xl h-[250px] flex flex-col shadow-inner">
             <p className="text-[10px] font-mono text-slate-500 uppercase mb-4 tracking-widest flex items-center">
                <Activity size={12} className="mr-2 text-green-500" /> Connection Log
             </p>
             <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar">
               {log.map((m, i) => (
                 <div key={i} className={`text-[10px] font-mono leading-relaxed p-2 rounded border-l-2 ${i===0 ? 'text-green-400 border-green-500 bg-green-500/5' : 'text-slate-500 border-slate-800 bg-slate-800/5'}`}>
                   {'>'} {m}
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Right: Board */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 p-6 rounded-3xl relative overflow-hidden min-h-[600px] shadow-2xl flex flex-col">
           <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,#22c55e_0%,transparent_70%)]"></div>
           
           <div className="grid grid-cols-10 gap-2 flex-1 relative z-10">
             {Array(50).fill(0).map((_, i) => {
               const cell = 50 - i;
               const isLadder = LADDERS[cell];
               const isSnake = SNAKES[cell];
               const isActive = pos === cell;
               
               return (
                 <div 
                   key={cell} 
                   className={`aspect-square border flex flex-col items-center justify-center relative rounded-xl transition-all duration-500 ${
                     isActive ? 'bg-green-500/30 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105 z-20' : 
                     pos > cell ? 'bg-slate-900 border-slate-800/50 opacity-40' :
                     'bg-slate-900 border-slate-800'
                   }`}
                 >
                    <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-white' : 'text-slate-700'}`}>{cell}</span>
                    {isActive && (
                      <div className="mt-1">
                        <Zap size={16} fill="currentColor" className="text-white animate-pulse" />
                      </div>
                    )}
                    {isLadder && (
                      <div className="absolute top-1 right-1">
                        <TrendingUp size={12} className="text-sci-cyan animate-pulse" />
                      </div>
                    )}
                    {isSnake && (
                      <div className="absolute top-1 right-1">
                        <TrendingDown size={12} className="text-red-500 animate-pulse" />
                      </div>
                    )}
                    
                    {/* Visual Jump Paths */}
                    {isLadder && <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-t from-sci-cyan/50 to-transparent opacity-20 pointer-events-none"></div>}
                 </div>
               );
             })}
           </div>

           {/* Win HUD */}
           {win && (
             <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center text-center backdrop-blur-md animate-in fade-in duration-500">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 animate-pulse"></div>
                  <Trophy size={100} className="text-yellow-400 relative z-10 animate-bounce" />
                </div>
                <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter">Signal Verified</h2>
                <p className="text-green-400 font-mono text-xl mb-12 tracking-[0.3em]">+70 QUEST SECURED</p>
                <button 
                  onClick={() => {setPos(1); setDice(0); setWin(false);}} 
                  className="bg-white text-slate-950 px-16 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                  Clear Protocol
                </button>
             </div>
           )}

           <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex items-center">
                 <div className="w-3 h-3 bg-sci-cyan rounded-full mr-3 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                 <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Signal Boost (L1 Relay)</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex items-center">
                 <div className="w-3 h-3 bg-red-500 rounded-full mr-3 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                 <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Protocol Drop (Sync Failure)</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
