
import React from 'react';
import { useChain } from '../context/ChainContext';
import { Lock, Play, Bomb, Grid, Link as LinkIcon, Cpu, Layers, Scissors, Activity, Crosshair, Sword } from 'lucide-react';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';
import { GAME_PASS_COST } from '../types';

const { Link } = RouterDOM;

export const Games: React.FC = () => {
  const { user, buyGamePass } = useChain();

  const games = [
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
      id: 'block-link',
      name: 'NODE LINK',
      icon: <LinkIcon size={32} />,
      desc: 'Connect matching nodes to stabilize the network.',
      path: '/games/block-link',
      color: 'text-sci-purple',
      borderColor: 'group-hover:border-sci-purple/50'
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
      id: 'fruit-slasher',
      name: 'DATA SLICER',
      icon: <Scissors size={32} />,
      desc: 'Slice through incoming data packets. Avoid firewalls.',
      path: '/games/fruit-slasher',
      color: 'text-pink-400',
      borderColor: 'group-hover:border-pink-500/50'
    },
    {
      id: 'block-runner',
      name: 'CYBER RUN',
      icon: <Activity size={32} />,
      desc: 'Infinite runner. Dodge glitches in the data stream.',
      path: '/games/block-runner',
      color: 'text-green-400',
      borderColor: 'group-hover:border-green-500/50'
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
            Execute training protocols to earn QUEST tokens. Requires active Gaming Pass.
            Simulations run locally on your browser node.
          </p>
        </div>
        
        {!user.hasGamePass && (
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {games.map(game => {
          const isLocked = !user.hasGamePass;
          
          return (
            <Link 
              to={isLocked ? '#' : game.path}
              key={game.id}
              className={`relative group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ${isLocked ? 'cursor-not-allowed opacity-70' : 'hover:bg-slate-900 hover:scale-[1.02] hover:shadow-2xl ' + game.borderColor}`}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-800/50 group-hover:to-slate-800 transition-all"></div>
              
              <div className="p-6 relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-lg bg-slate-950 border border-slate-800 ${game.color} transition-colors group-hover:border-opacity-50`}>
                    {game.icon}
                  </div>
                  {isLocked && <Lock size={16} className="text-red-500" />}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 font-sans group-hover:text-sci-cyan transition-colors">
                  {game.name}
                </h3>
                
                <p className="text-sm text-slate-400 font-mono flex-grow">
                  {game.desc}
                </p>

                <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    {isLocked ? 'LOCKED' : 'READY'}
                  </span>
                  {!isLocked && (
                    <div className="flex items-center text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-full group-hover:bg-sci-cyan group-hover:text-black transition-colors">
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
