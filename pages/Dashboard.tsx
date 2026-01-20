import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { Wallet, Ticket, Activity, Send, Cpu, Pickaxe, Zap, Clock, RefreshCw, Info } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, chain, buyGamePass, sendTransaction, mineBlock, activateNode } = useChain();
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isMining, setIsMining] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTo || !transferAmount) return;
    sendTransaction(transferTo, Number(transferAmount), 'User Transfer');
    setTransferTo('');
    setTransferAmount('');
  };

  const toggleMining = async () => {
    if (Date.now() > user.nodeActiveUntil) return;
    if (isMining) return;
    
    setIsMining(true);
    try {
      await mineBlock();
    } catch (e) {
      console.error("Mining failed", e);
    } finally {
      setIsMining(false);
    }
  };

  // Node life countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = user.nodeActiveUntil - Date.now();
      if (remaining <= 0) {
        setTimeLeft('EXPIRED');
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [user.nodeActiveUntil]);

  const nodeIsActive = user.nodeActiveUntil > Date.now();
  const userTxs = chain.pendingTransactions.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Beta Notice */}
      <div className="bg-sci-cyan/5 border border-sci-cyan/20 rounded-lg p-4 flex items-center space-x-4 animate-in fade-in slide-in-from-top-2 duration-700">
        <div className="bg-sci-cyan/20 p-2 rounded-full text-sci-cyan">
          <Info size={16} />
        </div>
        <p className="text-xs font-mono text-slate-400">
          <span className="text-sci-cyan font-bold">BETA TEST PHASE:</span> Simulation rewards and sidechain state may be reset during major protocol upgrades. Report anomalies via terminal logs.
        </p>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-sci-panel border border-slate-700 rounded-lg p-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-sci-cyan/5 rounded-full blur-3xl group-hover:bg-sci-cyan/10 transition"></div>
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-slate-800 rounded-lg text-sci-cyan border border-slate-700">
              <Wallet size={24} />
            </div>
            <h3 className="text-slate-400 font-mono text-sm">AVAILABLE BALANCE</h3>
          </div>
          <p className="text-4xl font-bold text-white font-sans tracking-tight">
            {user.balance.toLocaleString()} <span className="text-sm text-sci-cyan">QUEST</span>
          </p>
        </div>

        {/* Pass Card */}
        <div className={`relative overflow-hidden rounded-xl p-6 border transition-all duration-500 group ${
          user.hasGamePass 
            ? 'bg-sci-panel border-sci-purple/50 shadow-[0_0_30px_rgba(139,92,246,0.15)]' 
            : 'bg-sci-panel border-slate-700 hover:border-slate-600'
        }`}>
          {user.hasGamePass && (
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.2)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>
            </div>
          )}
          <div className={`absolute -right-10 -top-10 w-48 h-48 rounded-full blur-[60px] transition-all duration-700 ${
            user.hasGamePass ? 'bg-sci-purple/20 group-hover:bg-sci-purple/30' : 'bg-slate-800/20'
          }`}></div>
          <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg border backdrop-blur-md transition-colors duration-300 ${
                  user.hasGamePass 
                    ? 'bg-sci-purple/10 border-sci-purple text-sci-purple shadow-[0_0_15px_rgba(139,92,246,0.4)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  <Ticket size={24} className={user.hasGamePass ? 'animate-pulse' : ''} />
                </div>
                <div>
                   <h3 className={`font-mono text-[10px] tracking-[0.2em] uppercase ${user.hasGamePass ? 'text-sci-purple' : 'text-slate-500'}`}>
                    Protocol Clearance
                  </h3>
                   <div className={`h-0.5 w-full mt-1 transition-colors duration-300 ${user.hasGamePass ? 'bg-sci-purple shadow-[0_0_5px_rgba(139,92,246,0.8)]' : 'bg-slate-700'}`}></div>
                </div>
              </div>
               <div className={`px-2 py-1 rounded text-[10px] font-mono font-bold border backdrop-blur-md transition-colors duration-300 ${
                 user.hasGamePass 
                   ? 'bg-sci-purple/20 border-sci-purple text-sci-purple' 
                   : 'bg-slate-800 border-slate-600 text-slate-500'
               }`}>
                 {user.hasGamePass ? 'TIER: ELITE' : 'TIER: BASIC'}
               </div>
            </div>
            <div className="flex items-end justify-between mt-2">
              <div>
                <p className={`text-2xl font-black font-sans tracking-tight uppercase ${
                  user.hasGamePass 
                    ? 'text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]' 
                    : 'text-slate-300'
                }`}>
                  {user.hasGamePass ? 'GAMING PASS' : 'STANDARD ID'}
                </p>
                <p className="text-xs font-mono text-slate-400 mt-1 max-w-[180px]">
                  {user.hasGamePass ? 'Unlimited access to all simulation modules.' : 'Restricted access. Upgrade required.'}
                </p>
              </div>
              {!user.hasGamePass && (
                <button 
                  onClick={buyGamePass}
                  className="relative overflow-hidden px-5 py-2.5 bg-sci-panel text-sci-purple text-xs font-bold border border-sci-purple hover:bg-sci-purple hover:text-white transition-all duration-300 rounded-md group/btn shadow-[0_0_10px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.6)]"
                >
                  <span className="relative z-10 flex items-center tracking-wider">
                    MINT PASS
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Browser Node Mining */}
        <div className="bg-sci-panel border border-slate-700 rounded-lg p-6 relative overflow-hidden">
           <div className="flex items-center space-x-4 mb-4">
            <div className={`p-3 rounded-lg border ${nodeIsActive ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500' : 'bg-red-500/10 text-red-500 border-red-500/50'}`}>
              {nodeIsActive ? <Cpu size={24} className="animate-pulse" /> : <Clock size={24} />}
            </div>
            <div className="flex flex-col">
              <h3 className="text-slate-400 font-mono text-xs uppercase tracking-widest">Node Session Life</h3>
              <span className={`text-lg font-bold font-mono ${nodeIsActive ? 'text-white' : 'text-red-500'}`}>
                {timeLeft}
              </span>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-500 mb-4 font-mono leading-relaxed">
             CONTRIBUTION: 50 QUEST / BLOCK. <br/>
             REQUIREMENT: Re-authorize validation node every 24 hours to prevent minting suspension.
          </p>

          {!nodeIsActive ? (
            <button 
              onClick={activateNode}
              className="w-full py-3 bg-sci-cyan text-slate-950 font-black text-sm tracking-tighter rounded-md flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all"
            >
              <Zap size={16} fill="currentColor" />
              <span>ACTIVATE NODE SESSION</span>
            </button>
          ) : (
            <button 
              onClick={toggleMining}
              disabled={isMining}
              className={`w-full py-3 rounded-md font-bold transition-all flex items-center justify-center space-x-2 ${
                 isMining 
                 ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.5)] cursor-not-allowed' 
                 : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
              }`}
            >
               {isMining ? (
                 <>
                   <RefreshCw size={18} className="animate-spin" />
                   <span>MINING BLOCK...</span>
                 </>
               ) : (
                 <>
                   <Pickaxe size={18} />
                   <span>START MINING</span>
                 </>
               )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transfer Module */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Send className="mr-2 text-sci-cyan" size={20}/> TRANSFER ASSETS
          </h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">RECIPIENT (BLURT USERNAME)</label>
              <input 
                value={transferTo}
                onChange={e => setTransferTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-sci-cyan outline-none font-mono"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">AMOUNT</label>
              <input 
                type="number"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-sci-cyan outline-none font-mono"
                placeholder="0.00"
              />
            </div>
            <button className="w-full bg-sci-cyan/10 hover:bg-sci-cyan hover:text-slate-900 text-sci-cyan border border-sci-cyan font-bold py-2 rounded transition">
              INITIATE TRANSFER
            </button>
          </form>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Activity className="mr-2 text-sci-purple" size={20}/> RECENT TRANSACTIONS
          </h3>
          <div className="space-y-3">
            {userTxs.length === 0 && <p className="text-slate-600 font-mono text-sm">No recent activity.</p>}
            {userTxs.map(tx => (
              <div key={tx.id} className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase">{tx.type}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className={`font-mono font-bold ${
                  tx.to === user.username ? 'text-green-400' : 'text-red-400'
                }`}>
                  {tx.to === user.username ? '+' : '-'}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};