
import React, { useState, useEffect, useRef } from 'react';
import { useChain } from '../../context/ChainContext';
import { ChevronLeft, Cpu, Target, Zap, Activity } from 'lucide-react';
// Fix: Use standard named import for Link
import { Link } from 'react-router-dom';

interface HitEffect {
  id: number;
  x: number;
  y: number;
  isCritical: boolean;
}

export const WhackAMoleGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'OVER'>('IDLE');
  const [hits, setHits] = useState<HitEffect[]>([]);
  const timerRef = useRef<any>(null);
  const moleRef = useRef<any>(null);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setCombo(0);
    setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            clearInterval(moleRef.current);
            setGameState('OVER');
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      const spawnInterval = () => Math.max(400, 1000 - (score / 10));
      
      const nextMole = () => {
        if (gameState !== 'PLAYING') return;
        setActiveMole(Math.floor(Math.random() * 9));
        moleRef.current = setTimeout(nextMole, spawnInterval());
      };
      nextMole();
    }
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(moleRef.current);
    };
  }, [gameState, score]);

  const handleWhack = (idx: number, e: React.MouseEvent) => {
    if (idx === activeMole && gameState === 'PLAYING') {
      const isCritical = Math.random() > 0.8;
      const points = isCritical ? 50 : 10;
      const multiplier = Math.floor(combo / 5) + 1;
      const totalPoints = points * multiplier;

      setScore(s => s + totalPoints);
      setCombo(c => c + 1);
      setActiveMole(null);

      // Add hit effect
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const newHit = {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        isCritical
      };
      setHits(prev => [...prev, newHit]);
      setTimeout(() => setHits(prev => prev.filter(h => h.id !== newHit.id)), 600);

      if (score > 0 && score % 200 === 0) addGameReward(15, 'Pulse Strike');
    } else if (gameState === 'PLAYING') {
      setCombo(0);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1" /> BACK TO DECK
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-black text-sci-cyan tracking-widest uppercase">Pulse Strike</h1>
          <div className="h-1 w-32 bg-sci-cyan/20 mx-auto mt-1 rounded-full overflow-hidden">
             <div className="h-full bg-sci-cyan animate-pulse" style={{ width: `${(timeLeft/30)*100}%` }}></div>
          </div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Target size={48}/></div>
             <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <p className="text-[10px] font-mono text-sci-cyan mb-1 uppercase tracking-widest">Bounty Earned</p>
                  <div className="text-4xl font-black text-white">{score}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <p className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-widest">Signal Combo</p>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-black text-yellow-500">x{Math.floor(combo / 5) + 1}</div>
                    <div className="text-xs text-slate-500 font-mono">{combo} Hits</div>
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <p className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-widest">Remaining Link</p>
                  <div className={`text-2xl font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                </div>
             </div>
             <button onClick={startGame} className="w-full mt-6 bg-sci-cyan text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {gameState === 'IDLE' ? 'Initialize Link' : 'Reboot Session'}
             </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl font-mono text-[10px] text-slate-500 space-y-2">
            <p className="text-sci-cyan font-bold uppercase mb-2">Protocol Instructions:</p>
            <p>1. Neutralize data anomalies (pulsing cores) immediately.</p>
            <p>2. Maintain combos to increase QUEST reward multipliers.</p>
            <p>3. Rare "Critical Cores" grant 5x base points.</p>
          </div>
        </div>

        <div className="lg:col-span-3 bg-slate-950 border-4 border-slate-900 p-12 rounded-3xl relative min-h-[600px] flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none"></div>

          {gameState === 'OVER' && (
             <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center rounded-3xl backdrop-blur-md animate-in fade-in">
                <Target size={80} className="text-sci-cyan mb-6 animate-bounce" />
                <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter">Bounty Verified</h2>
                <p className="text-slate-400 mb-8 font-mono text-xl">Protocol Packets: {score}</p>
                <button onClick={startGame} className="bg-white text-slate-950 px-16 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-sci-cyan transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">Restart Sync</button>
             </div>
          )}

          <div className="grid grid-cols-3 gap-8 max-w-lg w-full relative z-10">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="relative group">
                <button 
                  onClick={(e) => handleWhack(i, e)}
                  className={`aspect-square w-full rounded-3xl border-4 transition-all duration-150 flex items-center justify-center overflow-hidden ${
                    activeMole === i 
                    ? 'bg-sci-cyan/10 border-sci-cyan shadow-[0_0_40px_rgba(6,182,212,0.4)] scale-105 active:scale-95' 
                    : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  {activeMole === i && (
                    <div className="relative">
                      <div className="absolute inset-0 bg-sci-cyan blur-2xl opacity-20 animate-pulse"></div>
                      <Cpu size={64} className="text-sci-cyan animate-pulse-slow relative z-10" />
                      <div className="absolute -top-4 -left-4 w-full h-full border border-sci-cyan/30 rounded-full animate-ping"></div>
                    </div>
                  )}

                  {/* Hit Effects overlay */}
                  {hits.map(hit => (
                    <div 
                      key={hit.id} 
                      className={`absolute pointer-events-none font-black animate-out fade-out slide-out-to-top-12 duration-500 ${hit.isCritical ? 'text-yellow-400 text-xl' : 'text-sci-cyan text-sm'}`}
                    >
                      {hit.isCritical ? 'CRITICAL!' : `+${10 * (Math.floor(combo/5)+1)}`}
                    </div>
                  ))}
                </button>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-800 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
