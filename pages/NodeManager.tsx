import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { Cpu, Activity, ShieldCheck, Clock, Zap, Terminal, Server, Globe } from 'lucide-react';

export const NodeManager: React.FC = () => {
  const { chain, user, mineBlock } = useChain();
  const [logs, setLogs] = useState<{msg: string, time: string, type: string}[]>([]);

  // Simulate network logs
  useEffect(() => {
    const messages = [
      { msg: 'P2P Handshake: node_774 active', type: 'info' },
      { msg: `Consensus verified for Block #${chain.blocks.length}`, type: 'success' },
      { msg: `Next witness in queue: ${chain.currentWitness}`, type: 'info' },
      { msg: 'State Snapshot verified by 4 peers', type: 'success' },
    ];
    
    const interval = setInterval(() => {
      const log = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [{ ...log, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
    }, 5000);

    return () => clearInterval(interval);
  }, [chain.blocks.length, chain.currentWitness]);

  const networkHealth = 100; // Mock stat
  const isUserTurn = user.username === chain.currentWitness;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-tight">
          NODE <span className="text-sci-cyan">MANAGER</span>
        </h1>
        <p className="text-slate-400 font-mono text-sm">
          Real-time consensus monitoring and witness synchronization status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Health */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity size={80} className="text-sci-cyan" />
            </div>
            <h3 className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-4">Network Health</h3>
            <div className="flex items-end space-x-2">
              <span className="text-5xl font-black text-white">{networkHealth}%</span>
              <span className="text-green-500 font-mono text-xs mb-2">STABLE</span>
            </div>
            <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-sci-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
             <h3 className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-4">Node Identity</h3>
             <div className="flex items-center space-x-4 mb-4">
                <div className={`p-3 rounded-lg ${user.username ? 'bg-sci-cyan/10 text-sci-cyan' : 'bg-slate-800 text-slate-500'}`}>
                  <Server size={24} />
                </div>
                <div>
                   <p className="text-white font-bold">@{user.username || 'ANONYMOUS'}</p>
                   <p className="text-[10px] text-slate-500 font-mono">ID: {user.username ? `NODE_${user.username.toUpperCase()}` : 'DISCONNECTED'}</p>
                </div>
             </div>
             {isUserTurn && (
               <button 
                 onClick={() => mineBlock()}
                 className="w-full bg-sci-cyan text-slate-950 font-black py-3 rounded uppercase tracking-tighter hover:bg-white transition flex items-center justify-center"
               >
                 <Zap size={16} className="mr-2" /> SIGN NEXT BLOCK
               </button>
             )}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl font-mono text-[10px] space-y-3">
             <div className="flex justify-between">
                <span className="text-slate-500">PEERS CONNECTED</span>
                <span className="text-white">12</span>
             </div>
             <div className="flex justify-between">
                <span className="text-slate-500">LATEST_HASH</span>
                <span className="text-sci-cyan truncate ml-4">{chain.blocks[chain.blocks.length-1]?.hash || 'N/A'}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-slate-500">BLOCK_TIME_AVG</span>
                <span className="text-white">3.2s</span>
             </div>
          </div>
        </div>

        {/* Center: Witness Schedule */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <ShieldCheck className="mr-2 text-sci-cyan" /> MINING SCHEDULE
                </h3>
                <div className="flex items-center text-[10px] font-mono text-slate-500">
                  <Clock size={12} className="mr-1" /> NEXT ROTATION: {Math.floor(Math.random()*60)}s
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {chain.witnesses.map((w, idx) => (
                  <div 
                    key={w} 
                    className={`p-4 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                      w === chain.currentWitness 
                        ? 'bg-sci-cyan/10 border-sci-cyan shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                        : 'bg-slate-950 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                          w === chain.currentWitness ? 'bg-sci-cyan text-black' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {w.substring(0,2).toUpperCase()}
                        </div>
                        {w === chain.currentWitness && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-ping"></div>
                        )}
                      </div>
                      <div className="ml-4">
                         <p className="text-sm font-bold text-white">@{w}</p>
                         <p className="text-[10px] text-slate-500 font-mono">Pos: {idx + 1} in queue</p>
                      </div>
                    </div>
                    {w === chain.currentWitness && (
                      <div className="text-sci-cyan animate-pulse">
                         <Zap size={18} fill="currentColor" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
           </div>

           {/* Console Logs */}
           <div className="bg-black border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[300px] flex flex-col">
              <div className="bg-slate-900 p-3 border-b border-slate-800 flex items-center">
                 <Terminal size={14} className="text-slate-500 mr-2" />
                 <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Protocol Console Output</span>
              </div>
              <div className="p-4 font-mono text-xs space-y-1 overflow-y-auto flex-1 custom-scrollbar">
                 <div className="text-slate-600 mb-2">Initializing Quest Protocol v1.2.0-STABLE...</div>
                 {logs.map((log, i) => (
                   <div key={i} className="flex space-x-4">
                      <span className="text-slate-700">[{log.time}]</span>
                      <span className={log.type === 'success' ? 'text-green-400' : 'text-sci-cyan'}>
                        {log.msg}
                      </span>
                   </div>
                 ))}
                 <div className="flex items-center space-x-2 animate-pulse">
                    <span className="text-sci-cyan">{'>'}</span>
                    <span className="w-2 h-4 bg-sci-cyan"></span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
