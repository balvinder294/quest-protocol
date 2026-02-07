import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
import { Vote, Zap, ShieldCheck, TrendingUp, ArrowUpCircle, ArrowDownCircle, Info, Lock } from 'lucide-react';

export const Staking: React.FC = () => {
  const { user, stakeTokens, unstakeTokens, voteForWitness, chain } = useChain();
  const [stakeAmount, setStakeAmount] = useState('');
  const [voteInput, setVoteInput] = useState('');

  const handleStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeAmount || Number(stakeAmount) <= 0) return;
    stakeTokens(Number(stakeAmount));
    setStakeAmount('');
  };

  const handleUnstake = () => {
    const amt = prompt("Enter amount of Quest Power to Power Down (Unstake):");
    if (amt && Number(amt) > 0) unstakeTokens(Number(amt));
  };

  const handleVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (voteInput.trim()) {
      voteForWitness(voteInput.trim().toLowerCase());
      setVoteInput('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">GOVERNANCE & <span className="text-sci-purple">POWER</span></h1>
        <p className="text-slate-400 font-mono text-sm max-w-2xl">Lock your tokens to increase your influence. Quest Power (QP) determines your voting weight and Resource Credits regeneration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
           {/* Staking Panel */}
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={160} /></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                 <div>
                    <h3 className="text-slate-500 font-mono text-[10px] uppercase tracking-widest mb-6">Module: Staking Bridge</h3>
                    <div className="space-y-8">
                       <div>
                          <p className="text-xs text-slate-400 font-mono mb-2 uppercase">Your Influence</p>
                          <div className="flex items-end space-x-2">
                             <p className="text-6xl font-black text-sci-purple tracking-tighter">{user.stakedBalance.toLocaleString()}</p>
                             <p className="text-xs font-mono text-slate-600 mb-2">QP</p>
                          </div>
                       </div>
                       <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                          <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Available to Power Up</p>
                          <p className="text-2xl font-black text-white">{user.balance.toLocaleString()} QUEST</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col justify-center">
                    <form onSubmit={handleStake} className="space-y-4">
                       <label className="text-[10px] font-mono text-sci-purple uppercase font-bold">Staking Amount</label>
                       <input 
                         type="number" 
                         value={stakeAmount}
                         onChange={e => setStakeAmount(e.target.value)}
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white font-black text-lg outline-none focus:border-sci-purple transition shadow-inner"
                         placeholder="0.00"
                       />
                       <button className="w-full bg-sci-purple text-white font-black py-5 rounded-xl uppercase tracking-widest hover:scale-[1.02] transition shadow-lg flex items-center justify-center">
                          <ArrowUpCircle size={20} className="mr-2" /> Power Up
                       </button>
                    </form>
                    <button onClick={handleUnstake} className="mt-4 text-[10px] font-mono text-slate-600 hover:text-white uppercase tracking-widest flex items-center justify-center">
                       <ArrowDownCircle size={14} className="mr-2" /> Power Down (Manual Unstake)
                    </button>
                 </div>
              </div>
           </div>

           {/* Witness Ranking */}
           <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                 <h3 className="text-white font-black uppercase tracking-tighter flex items-center">
                   <ShieldCheck className="mr-3 text-sci-cyan" /> Network Signatories
                 </h3>
                 <span className="text-[10px] font-mono text-slate-500 uppercase">Weight: {user.stakedBalance} QP</span>
              </div>
              <div className="divide-y divide-slate-800/50">
                 {chain.witnesses.map((w, idx) => (
                   <div key={w} className="p-6 flex justify-between items-center hover:bg-slate-800/20 transition group">
                      <div className="flex items-center space-x-6">
                         <span className="w-8 font-mono text-slate-700 text-lg">#{idx + 1}</span>
                         <div>
                            <p className="text-white font-black text-lg">@{w}</p>
                            <p className="text-[10px] text-slate-500 font-mono uppercase">Node Protocol Active</p>
                         </div>
                      </div>
                      <div className="text-right flex items-center space-x-8">
                         <div>
                            <p className="text-sci-cyan font-black text-sm uppercase">{chain.accounts[w] || 0}</p>
                            <p className="text-[9px] text-slate-600 font-mono uppercase">Votes Recieved</p>
                         </div>
                         <button onClick={() => voteForWitness(w)} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 group-hover:text-sci-cyan group-hover:border-sci-cyan transition">
                           <Vote size={18} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-sci-purple/10 border border-sci-purple/30 p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Info size={40} className="text-sci-purple" /></div>
              <h3 className="text-white font-black mb-4 uppercase tracking-tighter">The Power Protocol</h3>
              <ul className="space-y-6 text-[11px] font-mono text-slate-400">
                 <li>
                    <span className="text-sci-purple block mb-1">INFLUENCE</span>
                    QUEST Power is non-transferable. It represents your direct stake in the network security.
                 </li>
                 <li>
                    <span className="text-sci-purple block mb-1">RESOURCES</span>
                    Higher Quest Power increases your Max Mana, allowing for more daily chain operations without exhaustion.
                 </li>
                 <li>
                    <span className="text-sci-purple block mb-1">GOVERNANCE</span>
                    The Top 20 witnesses (sorted by QP votes) produce all blocks. Use your power to support stable nodes.
                 </li>
              </ul>
           </div>

           <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-white font-black mb-6 uppercase tracking-tighter flex items-center"><Vote className="mr-2 text-sci-cyan" /> Manual Vote</h3>
              <form onSubmit={handleVote} className="space-y-4">
                 <input 
                    value={voteInput}
                    onChange={e => setVoteInput(e.target.value)}
                    placeholder="Candidate username..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-sci-cyan transition"
                 />
                 <button className="w-full bg-sci-cyan text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest hover:bg-white transition-all shadow-lg">Cast Weight</button>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
};