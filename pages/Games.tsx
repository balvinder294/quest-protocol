import React from 'react';
import { useChain } from '../context/ChainContext';
import { Lock, Play, Bomb, Grid, Cpu, Layers, Activity, Crosshair, Sword, MousePointer2, Dice5, Target, Map, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GAME_PASS_COST } from '../types';

export const Games: React.FC = () => {
  const { user, buyGamePass, authMethod } = useChain();

  const isBypassed = authMethod === 'MNEMONIC';

  const games = [
    {
      id: 'predictor',
      name: 'VOID PREDICTOR',
      icon: <Sparkles size={32} />,
      desc: 'Predict the daily 24h consensus transmission. High stakes daily reward pool.',
      path: '/games/predictor',
      color: 'text-sci-purple',
      borderColor: 'group-hover:border-sci-purple/50'
    },
    {
      id: 'grid-hunt',
      name: 'GRID HUNTER',
      icon: <Map size={32} />,
      desc: 'Satelite scanning module. Identify and salvage buried protocol ships.',
      path: '/games/grid-hunt',
      color: 'text-sci-cyan',
      borderColor: 'group-hover:border-sci-cyan/50'
    },
    {
      id: 'space-tactics',
      name: 'VOID STRATEGIST',
      icon: <Sword size={32} />,
      desc: 'Provision simulation NFTs and battle the Protocol Bot in turn-based combat.',
      path: '/games/space-attack',
      color: 'text-orange-400',
      borderColor: 'group-hover:border-orange-500/50'
    },
    {
      id: 'whack-a-mole',
      name: 'PULSE STRIKE',
      icon: <MousePointer2 size={32} />,
      desc: 'Intercept random data anomalies. High reaction speed required.',
      path: '/games/whack-a-mole',
      color: 'text-sci-cyan',
      borderColor: 'group-hover:border-sci-cyan/50'
    },
    {
      id: 'ludo',
      name: 'NODE RACE',
      icon: <Target size={32} />,
      desc: 'Simplified protocol race. Navigate through the grid to reach consensus.',
      path: '/games/ludo',
      color: 'text-sci-purple',
      borderColor: 'group-hover:border-sci-purple/50'
    },
    {
      id: 'snakes',
      name: 'SIGNAL LADDERS',
      icon: <Dice5 size={32} />,
      desc: 'Classic dice-based signal boost. Watch out for transmission drops.',
      path: '/games/snakes',
      color: 'text-green-400',
      borderColor: 'group-hover:border-green-500/50'
    },
    {
      id: 'minesweeper',
      name: 'VOID SWEEPER',
      icon: <Bomb size={32} />,
      desc: 'Scan the sector grid for anomalies. Avoid corrupted nodes.',
      path: '/games/minesweeper',
      color: 'text-red-400',
      borderColor: 'group-hover:border-red-500/50'
    },
    {
      id: 'block-merge',
      name: 'CONSENSUS CORE',
      icon: <Grid size={32} />,
      desc: 'Merge data blocks to increase protocol version. Reach v2048.',
      path: '/games/block-merge',
      color: 'text-sci-cyan',
      borderColor: 'group-hover:border-sci-cyan/50'
    },
    {
      id: 'tetris',
      name: 'STACK OVERFLOW',
      icon: <Layers size={32} />,
      desc: 'Arrange falling data blocks to clear memory lines.',
      path: '/games/tetris',
      color: 'text-yellow-400',
      borderColor: 'group-hover:border-yellow-500/50'
    },
    {
      id: 'alien-hunt',
      name: 'VOID DEFENDER',
      icon: <Crosshair size={32} />,
      desc: 'Defend the protocol against intruding entities.',
      path: '/games/alien-hunt',
      color: 'text-blue-400',
      borderColor: 'group-hover:border-blue-500/50'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12">
        <div className="mb-4 md:mb-0">
           <h1 className="text-4xl font-bold text-white mb-2 font-sans tracking-wide">
            SIMULATION <span className="text-sci-cyan">DECK</span>
          </h1>
          <p className="text-slate-400 font-mono text-sm max-w-2xl">
            Execute training protocols to earn QUEST tokens. {isBypassed ? <span className="text-sci-cyan font-bold">[SEED_BYPASS_ACTIVE]</span> : 'Requires active Gaming Pass.'}
          </p>
        </div>
        
        {!user.hasGamePass && !isBypassed && (
          <div className="w-full md:w-auto bg-red-950/20 border border-red-500/50 p-4 rounded-lg flex items-center justify-between md:justify-start">
            <div className="flex items-center">
              <Lock className="text-red-500 mr-3" />
              <div className="mr-6">
                <p className="text-red-400 font-bold text-sm">ACCESS RESTRICTED</p>
                <p className="text-red-400/60 text-xs">Clearance Level Too Low</p>
              </div>
            </div>
            <button 
              onClick={buyGamePass} 
              className="bg-red-500 hover:bg-red-400 text-white text-xs font-bold px-4 py-2 rounded transition"
            >
              BUY PASS ({GAME_PASS_COST})
            </button>
          </div>
        )}

        {isBypassed && (
          <div className="w-full md:w-auto bg-sci-cyan/10 border border-sci-cyan/30 p-4 rounded-lg flex items-center">
            <Zap className="text-sci-cyan mr-3 animate-pulse" size={20} />
            <div>
              <p className="text-sci-cyan font-bold text-sm uppercase">Guest Protocol Uplink</p>
              <p className="text-sci-cyan/60 text-[10px] font-mono">Bypassing mandatory license requirements</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {games.map(game => {
          const isLocked = !user.hasGamePass && !isBypassed;
          return (
            <Link 
              to={isLocked ? '#' : game.path}
              key={game.id}
              className={`relative group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ${isLocked ? 'cursor-not-allowed opacity-70' : 'hover:bg-slate-900 hover:scale-[1.02] hover:shadow-2xl ' + game.borderColor}`}
            >
              <div className="p-6 relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-lg bg-slate-950 border border-slate-800 ${game.color}`}>
                    {game.icon}
                  </div>
                  {isLocked && <Lock size={16} className="text-red-500" />}
                  {isBypassed && !user.hasGamePass && <Zap size={14} className="text-sci-cyan animate-pulse" />}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 font-sans group-hover:text-sci-cyan transition-colors">{game.name}</h3>
                <p className="text-sm text-slate-400 font-mono flex-grow">{game.desc}</p>
                <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{isLocked ? 'LOCKED' : isBypassed && !user.hasGamePass ? 'GUEST_ACCESS' : 'READY'}</span>
                  {!isLocked && (
                    <div className="flex items-center text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-full group-hover:bg-sci-cyan group-hover:text-black">
                      <Play size={12} className="mr-1 fill-current" /> EXECUTE
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};