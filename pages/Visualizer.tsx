
import React, { useMemo } from 'react';
import { useChain } from '../context/ChainContext';
import { Box, Share2, Zap, Shield, Cpu, Activity, Database } from 'lucide-react';

export const Visualizer: React.FC = () => {
  const { chain } = useChain();

  const blocks = useMemo(() => {
    return [...chain.blocks].reverse().slice(0, 12);
  }, [chain.blocks]);

  return (
    <div className="min-h-screen bg-slate-950 p-8 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none"></div>
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:100px_100px]"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
           <div>
              <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 flex items-center">
                <Share2 className="mr-4 text-sci-cyan animate-pulse" size={48} /> CHAIN_<span className="text-sci-cyan">MAP</span>
              </h1>
              <p className="text-slate-500 font-mono text-sm max-w-xl">
                 Real-time spatial visualization of block propagation. Each node represents a sealed consensus event authenticated by the witness cohort.
              </p>
           </div>
           <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex gap-12 backdrop-blur-xl">
              <div className="text-center">
                 <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">Height</p>
                 <p className="text-2xl font-black text-white">{chain.height}</p>
              </div>
              <div className="text-center border-l border-slate-800 pl-12">
                 <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">Validator</p>
                 <p className="text-2xl font-black text-sci-cyan uppercase tracking-tighter truncate max-w-[120px]">@{chain.currentWitness}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {blocks.map((block, i) => (
             <div 
               key={block.hash} 
               className="group relative animate-in fade-in slide-in-from-bottom-8 duration-700"
               style={{ animationDelay: `${i * 100}ms` }}
             >
                {/* Connector Line to next block */}
                {i < blocks.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 w-8 h-0.5 bg-gradient-to-r from-sci-cyan to-transparent z-0 opacity-20"></div>
                )}
                
                <div className="relative z-10 bg-slate-900/40 border border-slate-800 hover:border-sci-cyan transition-all duration-500 p-6 rounded-3xl backdrop-blur-md overflow-hidden hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                   <div className="absolute top-0 right-0 p-3 opacity-10"><Database size={48} /></div>
                   
                   <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center space-x-2">
                         <div className="w-10 h-10 rounded-xl bg-sci-cyan text-slate-950 flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                            {block.index}
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] text-slate-500 font-mono">{new Date(block.timestamp).toLocaleTimeString()}</p>
                         <p className="text-[9px] font-black text-sci-cyan uppercase tracking-widest">Sealed</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div>
                         <p className="text-[9px] text-slate-600 font-mono uppercase">Signatory</p>
                         <p className="text-sm font-black text-white truncate">@{block.validator}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                            <p className="text-[8px] text-slate-600 font-mono uppercase mb-1">TX_CNT</p>
                            <p className="text-xs font-black text-white">{block.transactions.length}</p>
                         </div>
                         <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                            <p className="text-[8px] text-slate-600 font-mono uppercase mb-1">VERSION</p>
                            <p className="text-xs font-black text-sci-purple">v1.5</p>
                         </div>
                      </div>
                      <div className="pt-4 opacity-40">
                         <div className="flex justify-between text-[8px] font-mono mb-1">
                            <span>Hash_Sum</span>
                            <span>Integrity 100%</span>
                         </div>
                         <div className="w-full bg-slate-800 h-0.5 rounded-full overflow-hidden">
                            <div className="h-full bg-sci-cyan" style={{ width: '100%' }}></div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* Global Stats Matrix */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
           {[
             { label: 'Circulating Supply', val: `${(chain.totalSupply/1000000).toFixed(2)}M`, color: 'text-white', icon: <Zap size={16}/> },
             { label: 'Witness Rotation', val: 'Round Robin', color: 'text-sci-cyan', icon: <Activity size={16}/> },
             { label: 'Average Block Time', val: 'On-Demand', color: 'text-sci-purple', icon: <Cpu size={16}/> },
             { label: 'Consensus Mode', val: 'DPoS v1.5', color: 'text-orange-500', icon: <Shield size={16}/> },
           ].map((stat, i) => (
             <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center space-x-6">
                <div className={`p-4 rounded-xl bg-slate-950 border border-slate-800 ${stat.color}`}>{stat.icon}</div>
                <div>
                   <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">{stat.label}</p>
                   <p className={`text-xl font-black ${stat.color}`}>{stat.val}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
