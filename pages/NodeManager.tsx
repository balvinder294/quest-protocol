
import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { Cpu, Activity, ShieldCheck, Clock, Zap, Terminal, Server, Target, Lock, ShieldAlert, Star, Globe, Settings, Save, Wifi, RefreshCw } from 'lucide-react';
import { NODE_PASS_COST, DEFAULT_P2P_GATEWAY } from '../types';

export const NodeManager: React.FC = () => {
  const { chain, user, mineBlock, mintNodePass, voteForWitness, nodeUrl, setNodeUrl } = useChain();
  const [logs, setLogs] = useState<{msg: string, time: string, type: string}[]>([]);
  const [voteInput, setVoteInput] = useState('');
  const [customNodeUrl, setCustomNodeUrl] = useState(nodeUrl);
  const [isSavingNode, setIsSavingNode] = useState(false);

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

  const handleSaveNode = () => {
    setIsSavingNode(true);
    setTimeout(() => {
        setNodeUrl(customNodeUrl);
        setIsSavingNode(false);
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-tight">
            NODE <span className="text-sci-cyan">MANAGER</span>
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Real-time DPoS consensus monitoring and MongoDB cluster control.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
           <div className={`w-2 h-2 rounded-full mr-2 ${chain.isP2PConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
           <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Provider: {chain.connectedNodeName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Node Configuration */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
             <h3 className="text-white font-black text-xs uppercase tracking-tighter mb-6 flex items-center">
                <Settings size={16} className="text-sci-cyan mr-2" /> Node Uplink Settings
             </h3>
             <div className="space-y-4">
                <div>
                   <label className="block text-[10px] font-mono text-slate-500 uppercase mb-2">WebSocket RPC Endpoint</label>
                   <div className="relative">
                      <Globe className="absolute left-3 top-2.5 text-slate-600" size={14} />
                      <input 
                         value={customNodeUrl}
                         onChange={e => setCustomNodeUrl(e.target.value)}
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-sci-cyan outline-none font-mono"
                         placeholder="ws://localhost:8089"
                      />
                   </div>
                </div>
                <div className="flex gap-2">
                   <button 
                     onClick={handleSaveNode}
                     disabled={isSavingNode}
                     className="flex-1 bg-sci-cyan text-slate-950 font-black py-2 rounded text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center"
                   >
                     {isSavingNode ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} className="mr-1.5" />}
                     Switch Provider
                   </button>
                   <button 
                     onClick={() => setCustomNodeUrl(DEFAULT_P2P_GATEWAY)}
                     className="bg-slate-800 text-slate-400 font-bold px-3 py-2 rounded text-[10px] uppercase border border-slate-700 hover:text-white"
                   >
                     Reset
                   </button>
                </div>
             </div>
             <p className="mt-4 text-[9px] font-mono text-slate-600 leading-relaxed">
                Connect to community MongoDB instances to maintain consensus redundancy. Default: <span className="text-sci-cyan opacity-60 break-all">{DEFAULT_P2P_GATEWAY}</span>
             </p>
          </div>

          {!hasNodePass ? (
            <div className="bg-red-950/10 border border-red-500/30 p-8 rounded-2xl text-center">
              <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
              <h4 className="text-white font-black uppercase text-sm mb-2">Witness Access Locked</h4>
              <p className="text-slate-500 font-mono text-[10px] mb-6">You must mint a Node Pass NFT module to sign blocks and join the DPoS rotation.</p>
              <button 
                onClick={mintNodePass}
                className="w-full bg-red-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg"
              >
                Mint Module ({NODE_PASS_COST} Q)
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Activity size={80} className="text-sci-cyan" />
               </div>
               <h3 className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-4">Uplink Health</h3>
               <div className="flex items-end space-x-2">
                 <span className="text-5xl font-black text-white">100%</span>
                 <span className="text-green-500 font-mono text-xs mb-2">SYNCED</span>
               </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
             <h3 className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-4">Local RPC Console</h3>
             <div className="bg-black/50 p-4 rounded-lg font-mono text-[9px] space-y-2 h-[150px] overflow-y-auto custom-scrollbar border border-slate-800">
                {logs.map((log, i) => (
                  <div key={i} className="flex space-x-2">
                    <span className="text-slate-700">[{log.time}]</span>
                    <span className={log.type === 'success' ? 'text-green-400' : 'text-sci-cyan'}>{log.msg}</span>
                  </div>
                ))}
                <div className="animate-pulse text-sci-cyan">{'>'} listening_on_socket...</div>
             </div>
          </div>
        </div>

        {/* Center: Witness Schedule */}
        <div className="lg:col-span-8 space-y-8">
           <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <ShieldCheck className="mr-2 text-sci-cyan" /> CLUSTER SIGNATORIES
                </h3>
                <div className="flex items-center text-[10px] font-mono text-slate-500 uppercase">
                  <Wifi size={12} className="mr-1.5 text-green-500" /> P2P_MESH_READY
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
                            : 'bg-slate-950 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                              w === chain.currentWitness ? 'bg-sci-cyan text-slate-950' : 'bg-slate-900 text-slate-500'
                           }`}>
                             {idx + 1}
                           </div>
                           <div>
                              <p className="text-white font-black text-sm uppercase">@{w}</p>
                              <div className="flex items-center text-[10px] text-slate-500 font-mono">
                                 <Star size={10} className="mr-1 text-yellow-500" />
                                 <span>{idx < 2 ? 'CORE_CLUSTER' : 'EDGE_NODE'}</span>
                              </div>
                           </div>
                        </div>
                        {w === chain.currentWitness && (
                           <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-sci-cyan animate-pulse uppercase tracking-widest">SIGNING...</span>
                              {user.username === w && (
                                <button onClick={() => mineBlock()} className="mt-2 bg-sci-cyan text-slate-950 px-3 py-1 rounded text-[10px] font-black uppercase shadow-lg">Process Block</button>
                              )}
                           </div>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="bg-sci-panel/50 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-white font-black mb-6 flex items-center"><Zap size={18} className="mr-2 text-sci-purple" /> NETWORK PARAMETERS</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">State Engine</p>
                    <p className="text-lg font-black text-white">MongoDB 6.5+</p>
                 </div>
                 <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">Consensus Turn</p>
                    <p className="text-lg font-black text-white">12s Nominal</p>
                 </div>
                 <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono uppercase mb-1">Peer Discovery</p>
                    <p className="text-lg font-black text-white">Active Mesh</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
