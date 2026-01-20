import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
import { ArrowRightLeft, RefreshCw, Wallet, ExternalLink, Activity } from 'lucide-react';

export const Swap: React.FC = () => {
  const { user, swapTokens, syncWithBlurt } = useChain();
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN'); // IN = BLURT -> QUEST
  const [amount, setAmount] = useState('');
  
  const RATE = 10; // 1 BLURT = 10 QUEST

  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    swapTokens(Number(amount), direction);
    setAmount('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-wide">
            LIQUIDITY <span className="text-sci-cyan">BRIDGE</span>
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Atomic swap interface between Blurt L1 and Quest L2.
          </p>
        </div>
        <button 
          onClick={() => syncWithBlurt()}
          className="flex items-center text-xs bg-slate-800 hover:bg-slate-700 text-sci-cyan px-3 py-2 rounded border border-slate-700 transition"
        >
          <RefreshCw size={14} className="mr-2" /> SYNC BLURT CHAIN
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Swap Card */}
        <div className="bg-sci-panel border border-slate-700 rounded-xl p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-sci-cyan/5 rounded-full blur-3xl"></div>
           
           <form onSubmit={handleSwap} className="relative z-10 space-y-6">
             {/* FROM */}
             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
               <label className="block text-xs font-mono text-slate-500 mb-2">FROM ASSET</label>
               <div className="flex items-center justify-between">
                 <input 
                    type="number" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="bg-transparent text-2xl font-bold text-white outline-none w-full"
                    placeholder="0.00"
                 />
                 <span className="bg-slate-800 px-3 py-1 rounded text-sm font-bold text-white border border-slate-700">
                    {direction === 'IN' ? 'BLURT' : 'QUEST'}
                 </span>
               </div>
               <div className="text-right mt-2 text-xs text-slate-500 font-mono">
                  Balance: {direction === 'IN' ? '∞ (Simulated)' : user.balance.toLocaleString()}
               </div>
             </div>

             {/* Switcher */}
             <div className="flex justify-center -my-3 relative z-20">
               <button 
                 type="button"
                 onClick={() => setDirection(prev => prev === 'IN' ? 'OUT' : 'IN')}
                 className="bg-sci-panel border border-slate-600 p-2 rounded-full hover:border-sci-cyan text-sci-cyan transition"
               >
                 <ArrowRightLeft size={20} />
               </button>
             </div>

             {/* TO */}
             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
               <label className="block text-xs font-mono text-slate-500 mb-2">TO ASSET</label>
               <div className="flex items-center justify-between">
                 <div className="text-2xl font-bold text-slate-300">
                   {amount ? (direction === 'IN' ? Number(amount) * RATE : Number(amount) / RATE) : '0.00'}
                 </div>
                 <span className="bg-slate-800 px-3 py-1 rounded text-sm font-bold text-white border border-slate-700">
                    {direction === 'IN' ? 'QUEST' : 'BLURT'}
                 </span>
               </div>
               <div className="text-right mt-2 text-xs text-slate-500 font-mono">
                  Rate: 1 BLURT = {RATE} QUEST
               </div>
             </div>

             <button className="w-full bg-sci-cyan hover:bg-cyan-400 text-slate-900 font-bold py-4 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center">
               <Wallet size={20} className="mr-2" /> 
               {direction === 'IN' ? 'BRIDGE TO L2' : 'WITHDRAW TO L1'}
             </button>
           </form>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
           <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Activity className="mr-2 text-sci-purple" /> BRIDGE STATUS
              </h3>
              <div className="space-y-4 font-mono text-sm">
                 <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                   <span className="text-slate-500">Gateway Status</span>
                   <span className="text-green-400">ONLINE</span>
                 </div>
                 <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                   <span className="text-slate-500">L1 Block Height</span>
                   <span className="text-white">Active</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-slate-500">Pending Withdrawals</span>
                   <span className="text-white">0</span>
                 </div>
              </div>
           </div>

           <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
             <h3 className="text-white font-bold mb-2">How it works</h3>
             <ul className="list-disc pl-4 space-y-2 text-sm text-slate-400 font-mono">
               <li>Deposits require sending BLURT to <span className="text-sci-cyan">@quest-protocol</span> with memo matching your username.</li>
               <li>Withdrawals burn QUEST tokens and trigger an automated BLURT transfer.</li>
               <li>Sync chain manually if deposits are delayed.</li>
             </ul>
             <a href="https://blurt.blog" target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-sci-cyan mt-4 hover:underline">
               View Gateway on Blurt <ExternalLink size={10} className="ml-1"/>
             </a>
           </div>
        </div>

      </div>
    </div>
  );
};
