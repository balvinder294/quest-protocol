
import React, { useState, useEffect } from 'react';
import { useChain } from '../../context/ChainContext';
import { ChevronLeft, Target, Trophy, RefreshCw, Zap, Cpu, Activity } from 'lucide-react';
// Fix: Use standard named import for Link
import { Link } from 'react-router-dom';

export const LudoGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [pos, setPos] = useState(0);
  const [dice, setDice] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [win, setWin] = useState(false);
  const [lastBonus, setLastBonus] = useState<string | null>(null);
  const GOAL = 24; // Circle path count

  const roll = () => {
    if (win || isRolling) return;
    setIsRolling(true);
    setLastBonus(null);
    
    // Dice animation
    let count = 0;
    const interval = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finalDice = Math.floor(Math.random() * 6) + 1;
        setDice(finalDice);
        executeMove(finalDice);
        setIsRolling(false);
      }
    }, 60);
  };

  const executeMove = (val: number) => {
    let nextPos = pos + val;
    
    // Check for special tiles
    if (nextPos === 6 || nextPos === 12 || nextPos === 18) {
      nextPos += 2;
      setLastBonus('NODE_OVERCHARGE: +2');
    }

    if (nextPos >= GOAL) {
      setPos(GOAL);
      setWin(true);
      addGameReward(60, 'Node Race');
    } else {
      setPos(nextPos);
    }
  };

  const reset = () => { setPos(0); setDice(0); setWin(false); setLastBonus(null); };

  // Calculate position on board
  const getCoordinates = (index: number) => {
    // 24 slots total: 8 per side (roughly)
    const size = 350; // container size
    const radius = 140;
    const angle = (index / GOAL) * (Math.PI * 2) - Math.PI/2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-10">
        <Link to="/games" className="text-slate-400 hover:text-white flex items-center group transition">
          <ChevronLeft className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-sci-purple tracking-widest uppercase">Node Race</h1>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Protocol v1.3 Speed Test</p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl grid grid-cols-1 lg:grid-cols-3 gap-12 shadow-2xl">
        {/* Controls */}
        <div className="flex flex-col justify-center space-y-8 bg-slate-950 p-8 rounded-2xl border border-slate-800">
          <div className="text-center">
            <p className="text-slate-500 font-mono text-xs uppercase mb-6 tracking-widest">Entropy Generator</p>
            <div className={`text-8xl font-black mb-8 transition-all duration-100 ${isRolling ? 'scale-110 blur-sm text-sci-purple/50' : 'text-sci-purple animate-in zoom-in'}`}>
              {dice || '?'}
            </div>
            
            {lastBonus && (
              <div className="mb-4 text-xs font-black text-sci-cyan animate-bounce uppercase">{lastBonus}</div>
            )}

            <button 
              onClick={roll} 
              disabled={win || isRolling} 
              className="w-full bg-sci-purple text-white py-5 rounded-2xl font-black text-lg hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              {isRolling ? 'CALCULATING...' : win ? 'PROTOCOL VERIFIED' : 'INITIATE RACE'}
            </button>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800">
             <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-500">CONSENSUS PROGRESS</span>
                <span className="text-sci-purple font-bold">{Math.floor((pos/GOAL)*100)}%</span>
             </div>
             <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-sci-purple shadow-[0_0_10px_rgba(139,92,246,0.8)] transition-all duration-700" style={{ width: `${(pos/GOAL)*100}%` }}></div>
             </div>
          </div>
        </div>

        {/* Board View */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl relative min-h-[500px] flex items-center justify-center overflow-hidden shadow-inner">
           {/* Decorative Grid */}
           <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(139,92,246,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
           
           <div className="relative w-[350px] h-[350px] flex items-center justify-center">
              {/* Circular Path */}
              <div className="absolute w-[280px] h-[280px] border-8 border-slate-900 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)]"></div>
              
              {/* Path Slots */}
              {Array(GOAL).fill(0).map((_, i) => {
                const { x, y } = getCoordinates(i);
                const isSpecial = i === 6 || i === 12 || i === 18;
                return (
                  <div 
                    key={i}
                    className={`absolute w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
                      pos > i ? 'bg-sci-purple/20 border-sci-purple text-sci-purple' : 
                      isSpecial ? 'bg-sci-cyan/10 border-sci-cyan/50 animate-pulse' :
                      'bg-slate-900 border-slate-800 text-slate-700'
                    }`}
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                  >
                    {isSpecial ? <Zap size={14} className="text-sci-cyan" /> : <span className="text-[10px] font-mono">{i}</span>}
                  </div>
                );
              })}

              {/* Destination Core */}
              <div className="absolute w-24 h-24 bg-slate-900 rounded-full border-4 border-slate-800 flex items-center justify-center">
                 <Activity size={32} className={`transition-colors duration-1000 ${win ? 'text-sci-purple animate-pulse' : 'text-slate-800'}`} />
              </div>

              {/* Player Token */}
              <div 
                className="absolute w-14 h-14 bg-sci-purple rounded-full shadow-[0_0_30px_rgba(139,92,246,0.8)] border-4 border-white flex items-center justify-center transition-all duration-700 ease-out z-20"
                style={{ 
                  transform: `translate(${getCoordinates(pos).x}px, ${getCoordinates(pos).y}px)`,
                  visibility: pos === 0 && !win ? 'hidden' : 'visible'
                }}
              >
                <Cpu size={24} className="text-white" />
              </div>

              {/* Win Overlay */}
              {win && (
                <div className="absolute inset-0 z-30 bg-slate-950/80 flex flex-col items-center justify-center text-center animate-in zoom-in">
                   <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
                   <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Chain Sync Complete</h2>
                   <p className="text-sci-cyan font-mono text-sm mb-8 tracking-widest">+60 QUEST Dispatched</p>
                   <button onClick={reset} className="bg-white text-slate-950 px-10 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-sci-purple hover:text-white transition-colors">Start New Loop</button>
                </div>
              )}

              {/* Start Trigger */}
              {pos === 0 && !win && (
                <div className="absolute z-10 flex flex-col items-center">
                   <p className="text-[10px] font-mono text-slate-500 mb-2">AWAITING START</p>
                   <div className="w-12 h-12 bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center">
                      <Target size={20} className="text-slate-700" />
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
