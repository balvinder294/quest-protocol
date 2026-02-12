import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { Link } from 'react-router-dom';
import { ChevronLeft, Sparkles, TrendingUp, History, Info, Zap, Dice5, AlertCircle } from 'lucide-react';

export const Predictor: React.FC = () => {
  const { user, chain, placePredictorBet, myBets, authMethod } = useChain();
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [lastResults, setLastResults] = useState<{drawId: number, number: number, hash: string}[]>([]);

  const currentDrawId = chain.blocks.length + 1;
  const isBypassed = authMethod === 'MNEMONIC';

  useEffect(() => {
    const results = [...chain.blocks].reverse().slice(0, 10).map(b => ({
      drawId: b.index,
      number: parseInt(b.hash.slice(-1), 16) % 10,
      hash: b.hash
    }));
    setLastResults(results);
  }, [chain.blocks]);

  const handleBet = () => {
    if (selectedNumber === null || !betAmount || Number(betAmount) <= 0) return;
    if (isBypassed) return alert("Simulated bets only in Guest Mode.");
    placePredictorBet(selectedNumber, Number(betAmount));
    setSelectedNumber(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-sci-purple tracking-widest uppercase">Void Predictor</h1>
          <div className="h-0.5 w-48 bg-gradient-to-r from-transparent via-sci-purple to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5"><Sparkles size={64}/></div>
             <div className="flex justify-between items-start mb-8">
               <div>
                 <h2 className="text-xl font-black text-white uppercase mb-1 font-sans">Initialize Signal Bet</h2>
                 <p className="text-slate-500 font-mono text-xs">Targeting MongoDB Draw #{currentDrawId}</p>
               </div>
               <div className="bg-sci-purple/10 text-sci-purple border border-sci-purple/30 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                 Signal Live
               </div>
             </div>

             <div className="mb-8">
               <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Select Consensus Digit (0-9)</p>
               <div className="grid grid-cols-5 gap-3">
                 {[0,1,2,3,4,5,6,7,8,9].map(num => (
                   <button 
                     key={num}
                     onClick={() => setSelectedNumber(num)}
                     className={`aspect-square rounded-xl border-2 font-black text-lg transition-all duration-200 ${
                       selectedNumber === num 
                        ? 'bg-sci-purple border-white text-white scale-105 shadow-[0_0_20px_rgba(139,92,246,0.5)]' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-sci-purple/50'
                     }`}
                   >
                     {num}
                   </button>
                 ))}
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
               <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-2">Transmission Load (QUEST)</label>
                  <input 
                    type="number"
                    value={betAmount}
                    onChange={e => setBetAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-sci-purple transition font-mono"
                  />
               </div>
               <button 
                onClick={handleBet}
                disabled={selectedNumber === null}
                className="w-full bg-sci-purple text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition disabled:opacity-50"
               >
                 Broadcast Bet
               </button>
             </div>

             {isBypassed && <p className="mt-4 text-xs text-yellow-500 font-mono uppercase text-center">[GUEST_MODE: REWARDS_SUPPRESSED]</p>}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
             <h3 className="text-white font-black mb-6 flex items-center uppercase tracking-tighter font-sans">
               <History className="mr-2 text-sci-purple" /> Personal Signal History
             </h3>
             <div className="space-y-3">
               {myBets.length === 0 && <p className="text-slate-600 font-mono text-xs italic">No MongoDB signals detected.</p>}
               {myBets.map(bet => {
                 const resultBlock = chain.blocks.find(b => b.index === bet.draw_id);
                 const winningNum = resultBlock ? (parseInt(resultBlock.hash.slice(-1), 16) % 10) : null;
                 const isWinner = winningNum !== null && winningNum === bet.number;

                 return (
                   <div key={bet._id || bet.timestamp} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-sci-purple/30 transition">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg border-2 ${isWinner ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                          {bet.number}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase">Draw Sequence #{bet.draw_id}</p>
                          <p className="text-[10px] text-slate-500 font-mono uppercase">{new Date(bet.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-white">{bet.amount} QUEST</p>
                        <p className={`text-[9px] font-mono uppercase font-black tracking-widest ${
                          !resultBlock ? 'text-yellow-500 animate-pulse' : 
                          isWinner ? 'text-green-400' : 'text-slate-700'
                        }`}>
                          {!resultBlock ? 'PENDING_SEAL' : isWinner ? 'PAYOUT_STABILIZED' : 'NULL_SIGNAL'}
                        </p>
                      </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
             <h3 className="text-white font-black mb-4 flex items-center uppercase tracking-tighter font-sans">
               <TrendingUp className="mr-2 text-sci-purple" /> Recent Consensuses
             </h3>
             <div className="space-y-2">
               {lastResults.map((res, i) => (
                 <div key={res.drawId} className={`flex justify-between items-center p-3 rounded-lg border ${i === 0 ? 'bg-sci-purple/10 border-sci-purple/30' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
                    <div className="flex items-center space-x-3 overflow-hidden">
                       <span className="text-[10px] font-mono text-slate-500 shrink-0">#{res.drawId}</span>
                       <span className="text-[10px] font-mono text-slate-300 truncate opacity-50">{res.hash}</span>
                    </div>
                    <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center text-white font-black text-sm shadow-inner">
                      {res.number}
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