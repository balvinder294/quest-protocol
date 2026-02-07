import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { Wallet, Ticket, Activity, Send, Cpu, Pickaxe, Zap, Clock, RefreshCw, Flame, ShieldCheck, Fingerprint, Battery, Sparkles } from 'lucide-react';
// Fix: Added missing import for GAME_PASS_COST
import { BURN_ACCOUNT, GAME_PASS_COST } from '../types';

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
    setTransferTo(''); setTransferAmount('');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = user.nodeActiveUntil - Date.now();
      if (remaining <= 0) setTimeLeft('EXPIRED');
      else {
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [user.nodeActiveUntil]);

  const nodeIsActive = user.nodeActiveUntil > Date.now();
  const manaPercent = Math.min(100, (user.mana / user.maxMana) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Network Resource HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-sci-cyan/10 rounded-xl border border-sci-cyan text-sci-cyan"><Battery size={20}/></div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Resource Credits</span>
           </div>
           <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-black text-white">{Math.floor(manaPercent)}%</p>
              <p className="text-[10px] text-slate-500 font-mono">REGEN_ACTIVE</p>
           </div>
           <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-sci-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000" style={{ width: `${manaPercent}%` }}></div>
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-sci-purple/10 rounded-xl border border-sci-purple text-sci-purple"><Zap size={20}/></div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Quest Power</span>
           </div>
           <div className="flex items-end justify-between">
              <p className="text-3xl font-black text-white">{user.stakedBalance.toLocaleString()}</p>
              <p className="text-[10px] text-sci-purple font-black">QP</p>
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500 text-yellow-500"><Wallet size={20}/></div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Liquid Balance</span>
           </div>
           <p className="text-3xl font-black text-white">{user.balance.toLocaleString()} <span className="text-xs text-yellow-500">QUEST</span></p>
        </div>

        <div className="bg-sci-accent/5 border border-sci-accent/20 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
           <Flame size={24} className="text-sci-accent mb-2 animate-pulse" />
           <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Protocol Burn</p>
           <p className="text-xl font-black text-white">{chain.totalBurned.toLocaleString()} QUEST</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Fingerprint size={120}/></div>
              <div className="flex items-center space-x-6 mb-8">
                 <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-sci-cyan flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                   {user.username?.charAt(0).toUpperCase()}
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-white">@{user.username}</h2>
                    <p className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest">Node Level 1 Access</p>
                 </div>
              </div>
              <div className="space-y-4">
                 <button onClick={buyGamePass} disabled={user.hasGamePass} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition ${user.hasGamePass ? 'bg-sci-purple/20 text-sci-purple border border-sci-purple/30 cursor-default' : 'bg-sci-purple text-white shadow-lg hover:scale-105'}`}>
                    {user.hasGamePass ? 'GAMING_PASS_ACTIVE' : `ACTIVATE PASS (${GAME_PASS_COST})`}
                 </button>
                 <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Node Session</span>
                    <span className={`text-xs font-black ${nodeIsActive ? 'text-green-400' : 'text-red-500'}`}>{timeLeft}</span>
                 </div>
              </div>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-lg font-black text-white mb-6 flex items-center"><Send className="mr-2 text-sci-cyan" size={18} /> QUICK_SEND</h3>
              <form onSubmit={handleSend} className="space-y-4">
                 <input value={transferTo} onChange={e => setTransferTo(e.target.value)} placeholder="Recipient username" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-sci-cyan transition" />
                 <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00 QUEST" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-sci-cyan transition" />
                 <button className="w-full bg-sci-cyan text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all shadow-lg">Initiate Broadcast</button>
              </form>
           </div>
        </div>

        {/* History / News */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 h-full">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-white flex items-center uppercase tracking-tighter"><Activity className="mr-3 text-sci-purple" /> Network Activity</h3>
                 <span className="text-[10px] font-mono text-slate-500">Mempool: {chain.pendingTransactions.length}</span>
              </div>
              <div className="space-y-4">
                 {chain.pendingTransactions.length === 0 && <div className="py-20 text-center text-slate-600 font-mono text-sm">No live transmissions in pool...</div>}
                 {chain.pendingTransactions.slice(0, 8).map(tx => (
                   <div key={tx.id} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 flex justify-between items-center animate-in slide-in-from-right-4">
                      <div className="flex items-center space-x-4">
                         <div className={`p-2 rounded-lg ${tx.type === 'REWARD' ? 'bg-green-500/10 text-green-500' : 'bg-sci-cyan/10 text-sci-cyan'}`}><Sparkles size={14}/></div>
                         <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">{tx.type} | @{tx.from}</p>
                            <p className="text-[9px] text-slate-600 font-mono">{tx.memo || 'Broadcast ID: ' + tx.id.substring(0,8)}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-black text-white">{tx.amount} Q</p>
                         <p className="text-[8px] text-slate-700 font-mono uppercase">Status: PENDING</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};