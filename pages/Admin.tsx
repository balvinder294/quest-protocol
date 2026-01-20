
import React, { useState, useRef } from 'react';
import { useChain } from '../context/ChainContext';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';
import { ShieldAlert, Zap, Users, RefreshCw, Database, Download, Upload, Cpu } from 'lucide-react';
import { ADMIN_USER } from '../types';

const { Navigate } = RouterDOM;

export const Admin: React.FC = () => {
  const { user, chain, mintTokens, mineBlock, sendTransaction, createSnapshot, restoreSnapshot } = useChain();
  const [mintAmount, setMintAmount] = useState('');
  const [targetUser, setTargetUser] = useState(user.username || '');
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user.isAdmin) return <Navigate to="/" replace />;

  const handleMint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintAmount || !targetUser) return;
    mintTokens(Number(mintAmount));
    setStatusMsg(`Minted ${mintAmount} to self.`);
    setMintAmount('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm("WARNING: This will overwrite your current chain state. Proceed?")) {
        await restoreSnapshot(file);
      }
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
        {/* Consensus Module */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white flex items-center">
              <RefreshCw className="mr-2 text-sci-cyan animate-spin-slow" /> ACTIVE CONSENSUS
            </h3>
            <span className="text-[10px] font-mono text-slate-500">SCHEDULING: ROUND_ROBIN</span>
          </div>
          
          <div className="space-y-4">
             {chain.witnesses.map(w => (
               <div key={w} className={`p-4 rounded-lg border flex justify-between items-center ${w === chain.currentWitness ? 'bg-sci-cyan/10 border-sci-cyan/50' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-4 ${w === chain.currentWitness ? 'bg-sci-cyan animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-slate-700'}`}></div>
                    <div>
                      <p className="text-sm font-bold text-white">@{w}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Status: {w === chain.currentWitness ? 'ACTIVE_VALIDATOR' : 'WAITING_FOR_TURN'}</p>
                    </div>
                  </div>
                  {w === user.username && (
                    <button onClick={mineBlock} className="bg-sci-cyan text-slate-950 px-4 py-1.5 rounded-md text-xs font-black hover:scale-105 transition">
                      SIGN BLOCK
                    </button>
                  )}
               </div>
             ))}
          </div>
        </div>

        {/* Treasury Module */}
        <div className="space-y-8">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Zap className="mr-2 text-yellow-400" /> TREASURY MINT
            </h3>
            <form onSubmit={handleMint} className="space-y-4">
               <input 
                 value={targetUser} onChange={e => setTargetUser(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-700 px-4 py-2 rounded text-white font-mono text-sm"
                 placeholder="target_user"
               />
               <input 
                 type="number" value={mintAmount} onChange={e => setMintAmount(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-700 px-4 py-2 rounded text-white font-mono text-sm"
                 placeholder="amount_to_mint"
               />
               <button className="w-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 px-6 py-3 rounded font-bold hover:bg-yellow-500 hover:text-black transition">
                   EXECUTE MINT
               </button>
            </form>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Database className="mr-2 text-sci-purple" /> SNAPSHOT INFO
            </h3>
            <div className="font-mono text-[10px] text-slate-500 space-y-2">
              <p>LAST_HEIGHT: {chain.blocks.length}</p>
              <p>ACCOUNT_COUNT: {Object.keys(chain.accounts).length}</p>
              <p>TREASURY_RESERVE: {chain.accounts['PROTOCOL_TREASURY'] || 0} QUEST</p>
              <div className="h-0.5 bg-slate-800 w-full mt-4"></div>
              <p className="text-sci-purple">Consensus healthy. Nodes synchronized.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
