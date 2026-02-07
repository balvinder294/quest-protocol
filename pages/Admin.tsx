import React, { useState, useRef } from 'react';
import { useChain } from '../context/ChainContext';
// Fix: Use standard named import for Navigate
import { Navigate } from 'react-router-dom';
import { ShieldAlert, Zap, RefreshCw, Database, Download, Upload, Lock } from 'lucide-react';
import { ADMIN_USER } from '../types';

export const Admin: React.FC = () => {
  const { user, chain, mintTokens, mineBlock, createSnapshot, restoreSnapshot } = useChain();
  const [mintAmount, setMintAmount] = useState('');
  const [targetUser, setTargetUser] = useState(user.username || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // STRICT WHITELIST
  if (!user.isAdmin || user.username !== ADMIN_USER) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
         <Lock size={80} className="mx-auto mb-6 text-red-500" />
         <h1 className="text-3xl font-black text-white uppercase">Whitelisted Access Only</h1>
         <p className="text-slate-500 font-mono mt-4">This control panel is restricted to the lead witness: @{ADMIN_USER}</p>
         <Navigate to="/" replace />
      </div>
    );
  }

  const handleMint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintAmount || !targetUser) return;
    // Updated to pass targetUser to mintTokens
    mintTokens(Number(mintAmount), targetUser);
    setMintAmount('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && confirm("WARNING: This will overwrite your current chain state. Proceed?")) {
      await restoreSnapshot(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-lg mb-8 flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold text-red-500 flex items-center mb-2">
            <ShieldAlert className="mr-3" /> COMMAND CENTER
          </h1>
          <p className="text-red-400/60 font-mono text-sm">
            AUTH_LEVEL: ROOT | PROTOCOL_TURN: {chain.currentWitness}
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={createSnapshot} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center text-xs border border-slate-700">
            <Download size={14} className="mr-2" /> EXPORT SNAPSHOT
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center text-xs border border-slate-700">
            <Upload size={14} className="mr-2" /> IMPORT SNAPSHOT
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".qps" onChange={handleFileChange} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 lg:col-span-2">
          <h3 className="text-lg font-bold text-white flex items-center mb-6">
            <RefreshCw className="mr-2 text-sci-cyan animate-spin-slow" /> ACTIVE CONSENSUS
          </h3>
          <div className="space-y-4">
             {chain.witnesses.map(w => (
               <div key={w} className={`p-4 rounded-lg border flex justify-between items-center ${w === chain.currentWitness ? 'bg-sci-cyan/10 border-sci-cyan/50' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-4 ${w === chain.currentWitness ? 'bg-sci-cyan animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-slate-700'}`}></div>
                    <div>
                      <p className="text-sm font-bold text-white">@{w}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{w === chain.currentWitness ? 'ACTIVE_VALIDATOR' : 'WAITING_FOR_TURN'}</p>
                    </div>
                  </div>
                  {w === user.username && (
                    <button onClick={mineBlock} className="bg-sci-cyan text-slate-950 px-4 py-1.5 rounded-md text-xs font-black">SIGN BLOCK</button>
                  )}
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Zap className="mr-2 text-yellow-400" /> TREASURY MINT</h3>
            <form onSubmit={handleMint} className="space-y-4">
               <input value={targetUser} onChange={e => setTargetUser(e.target.value)} className="w-full bg-slate-950 border border-slate-700 px-4 py-2 rounded text-white font-mono text-sm" placeholder="target_user" />
               <input type="number" value={mintAmount} onChange={e => setMintAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-700 px-4 py-2 rounded text-white font-mono text-sm" placeholder="amount" />
               <button className="w-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 px-6 py-3 rounded font-bold">EXECUTE MINT</button>
            </form>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Database className="mr-2 text-sci-purple" /> SNAPSHOT INFO</h3>
            <div className="font-mono text-[10px] text-slate-500 space-y-2">
              <p>LAST_HEIGHT: {chain.blocks.length}</p>
              <p>ACCOUNT_COUNT: {Object.keys(chain.accounts).length}</p>
              <p className="text-sci-purple">Consensus healthy. v1.3 active.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};