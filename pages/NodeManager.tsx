import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { Cpu, Activity, ShieldCheck, Clock, Zap, Terminal, Server, Target, Lock, ShieldAlert, Star } from 'lucide-react';
import { NODE_PASS_COST } from '../types';

export const NodeManager: React.FC = () => {
  const { chain, user, mineBlock, mintNodePass, voteForWitness } = useChain();
  const [logs, setLogs] = useState<{msg: string, time: string, type: string}[]>([]);
  const [voteInput, setVoteInput] = useState('');

  const hasNodePass = user.inventory.some(i => i.subType === 'NODE_PASS');

  useEffect(() => {
    if (!hasNodePass) return;
    const messages = [
      { msg: 'P2P Handshake: node_broadcast active', type: 'info' },
      { msg: `Consensus verified for Block #${chain.blocks.length}`, type: 'success' },
      { msg: `Next witness in queue: ${chain.currentWitness}`, type: 'info' },
      { msg: 'State Snapshot verified by local witness', type: 'success' },
    ];
    
    const interval = setInterval(() => {
      const log = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [{ ...log, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
    }, 5000);

    return () => clearInterval(interval);
  }, [chain.blocks.length, chain.currentWitness, hasNodePass]);

  const networkHealth = 100;
  const isUserTurn = user.username === chain.currentWitness;

  const handleVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (voteInput.trim()) {
      voteForWitness(voteInput.trim().toLowerCase());
      setVoteInput('');
    }
  };

  if (!hasNodePass) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Lock size={120}/></div>
          <ShieldAlert size={64} className="text-sci-cyan mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Access Unauthorized</h1>
          <p className="text-slate-400 font-mono mb-10 max-w-md mx-auto">
            Witness Node protocols require a verified <span className="text-sci-cyan font-bold">Node Access Pass</span> NFT. This module enables P2P consensus participation and block signing.
          </p>
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 mb-10 inline-block text-left">
             <p className="text-xs text-slate-500 font-mono uppercase mb-2">Required Module:</p>
             <div className="flex items-center space-x-4">
                <div className="p-3 bg-sci-cyan/10 rounded-lg border border-sci-cyan text-sci-cyan">
                  <Cpu size={24} />
                </div>
                <div>
                   <p className="text-white font-bold">NODE_PASS.v1</p>
                   <p className="text-xs text-sci-cyan font-mono">{NODE_PASS_COST} QUEST</p>
                </div>
             </div>
          </div>
          <button 
            onClick={mintNodePass}
            className="block w-full bg-sci-cyan text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            Mint Access Pass
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-tight">
          NODE <span className="text-sci-cyan">MANAGER</span>
        </h1>
        <p className="text-slate-400 font-mono text-sm">
          Real-time DPoS consensus monitoring and governance dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Node Info & Voting */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity size={80} className="text-sci-cyan" />
            </div>
            <h3 className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-4">Uplink Health</h3>
            <div className="flex items-end space-x-2">
              <span className="text-5xl font-black text-white">{networkHealth}%</span>
              <span className="text-green-500 font-mono text-xs mb-2">STABLE</span>
            </div>
            <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-sci-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
             <h3 className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-4">Governance Vote</h3>
             <form onSubmit={handleVote} className="space-y-4">
                <div className="relative">
                   <Target className="absolute left-3 top-2.5 text-slate-600" size={14} />
                   <input 
                      value={voteInput}
                      onChange={e => setVoteInput(e.target.value)}
                      placeholder="Witness username..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-sci-cyan outline-none font-mono"
                   />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-sci-cyan/10 border border-sci-cyan text-sci-cyan font-black py-2 rounded text-[10px] uppercase tracking-widest hover:bg-sci-cyan hover:text-slate-950 transition-all"
                >
                  Cast DPoS Vote
                </button>
             </form>
             <p className="mt-4 text-[9px] font-mono text-slate-500 leading-relaxed uppercase">
                Your <span className="text-white font-bold">{user.balance} QUEST</span> acts as your voting weight. Support nodes that maintain stable uptime.
             </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
             <h3 className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-4">Local Console</h3>
             <div className="bg-black/50 p-4 rounded-lg font-mono text-[10px] space-y-2 h-[200px] overflow-y-auto custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="flex space-x-2">
                    <span className="text-slate-700">[{log.time}]</span>
                    <span className={log.type === 'success' ? 'text-green-400' : 'text-sci-cyan'}>{log.msg}</span>
                  </div>
                ))}
                <div className="animate-pulse text-sci-cyan">{'>'} listening_for_peers...</div>
             </div>
          </div>
        </div>

        {/* Center: Witness Schedule */}
        <div className="lg:col-span-8 space-y-8">
           <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <ShieldCheck className="mr-2 text-sci-cyan" /> CONSENSUS RANKINGS
                </h3>
                <div className="flex items-center text-[10px] font-mono text-slate-500">
                  <Clock size={12} className="mr-1" /> NEXT BLOCK: #{chain.blocks.length}
                </div>
              </div>
              <div className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chain.witnesses.map((w, idx) => (
                      <div 
                        key={w} 
                        className={`p-5 rounded-2xl border transition-all duration-500 flex items-center justify-between ${
                          w === chain.currentWitness 
                            ? 'bg-sci-cyan/10 border-sci-cyan shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                              w === chain.currentWitness ? 'bg-sci-cyan text-slate-950' : 'bg-slate-900 text-slate-500'
                           }`}>
                             {idx + 1}
                           </div>
                           <div>
                              <p className="text-white font-black text-sm">@{w}</p>
                              <div className="flex items-center text-[10px] text-slate-500 font-mono">
                                 <Star size={10} className="mr-1 text-yellow-500" />
                                 <span>{idx < 2 ? 'CORE_WITNESS' : 'BACKUP_NODE'}</span>
                              </div>
                           </div>
                        </div>
                        {w === chain.currentWitness && (
                           <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-sci-cyan animate-pulse uppercase tracking-widest">ACTIVE_SIGNER</span>
                              {isUserTurn && (
                                <button onClick={() => mineBlock()} className="mt-2 bg-sci-cyan text-slate-950 px-3 py-1 rounded text-[10px] font-black uppercase">Seal Block</button>
                              )}
                           </div>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="bg-sci-panel/50 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-white font-black mb-4 flex items-center"><Zap size={18} className="mr-2 text-sci-purple" /> PROTOCOL SPECS</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">Block Time</p>
                    <p className="text-lg font-black text-white">Manual / On-Demand</p>
                 </div>
                 <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">TX Validation</p>
                    <p className="text-lg font-black text-white">Merkle / Root</p>
                 </div>
                 <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">Mining Reward</p>
                    <p className="text-lg font-black text-white">50 QUEST</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};