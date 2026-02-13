
import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
import { ShieldAlert, Plus, User, Box, Cpu, Sword, Shield, Zap, CheckCircle, Ticket } from 'lucide-react';
import { ADMIN_USER } from '../types';
import { Navigate } from 'react-router-dom';

export const AdminNFTManager: React.FC = () => {
  const { user, provisionNFT } = useChain();
  const [targetUser, setTargetUser] = useState('');
  const [nftType, setNftType] = useState<'CHARACTER' | 'AUGMENT' | 'ACCESS'>('CHARACTER');
  const [subType, setSubType] = useState('TRAVELLER');
  const [value, setValue] = useState('0');
  const [cost, setCost] = useState('0');
  const [successMsg, setSuccessMsg] = useState('');

  if (user.username !== ADMIN_USER) return <Navigate to="/" replace />;

  const handleMint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser.trim()) return;
    provisionNFT(nftType, subType, Number(value), Number(cost), targetUser.trim());
    setSuccessMsg(`Module ${subType} successfully provisioned for @${targetUser}`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const getSubTypes = () => {
    if (nftType === 'CHARACTER') return ['TRAVELLER', 'CADET', 'ENGINEER', 'PILOT', 'COMMANDER', 'CYBORG'];
    if (nftType === 'AUGMENT') return ['HEALTH', 'ATTACK', 'LUCK'];
    if (nftType === 'ACCESS') return ['GAME_PASS', 'NODE_PASS'];
    return [];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-3xl mb-12 flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-red-500 uppercase tracking-tighter flex items-center mb-1">
             <ShieldAlert size={32} className="mr-3" /> NFT_FORGE
           </h1>
           <p className="text-red-400/60 font-mono text-xs uppercase tracking-widest">Root Authority: Asset Injection Protocol</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
           <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl">
              <form onSubmit={handleMint} className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-mono text-slate-500 uppercase mb-2">Recipient Identity</label>
                   <input value={targetUser} onChange={e => setTargetUser(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-sci-cyan outline-none font-mono" placeholder="username" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-mono text-slate-500 uppercase mb-2">Module Class</label>
                       <select value={nftType} onChange={e => { setNftType(e.target.value as any); setSubType(e.target.value === 'ACCESS' ? 'GAME_PASS' : e.target.value === 'AUGMENT' ? 'HEALTH' : 'TRAVELLER'); }} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-sci-cyan font-mono">
                         <option value="CHARACTER">CHARACTER</option>
                         <option value="AUGMENT">AUGMENT</option>
                         <option value="ACCESS">ACCESS_PASS</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-mono text-slate-500 uppercase mb-2">Sub-Type</label>
                       <select value={subType} onChange={e => setSubType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-sci-cyan font-mono uppercase">
                         {getSubTypes().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase mb-2">Injection Stat Value</label>
                    <input type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-sci-cyan outline-none font-mono" />
                 </div>

                 {successMsg && (
                    <div className="bg-green-500/10 border border-green-500 text-green-400 p-4 rounded-xl flex items-center text-xs font-mono">
                       <CheckCircle size={16} className="mr-3" /> {successMsg}
                    </div>
                 )}

                 <button className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg flex items-center justify-center transition-all">
                    <Plus size={20} className="mr-2" /> Inject Module NFT
                 </button>
              </form>
           </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
           <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-white font-black uppercase tracking-tighter mb-4 flex items-center"><Box className="mr-2 text-sci-cyan" /> Forge Specs</h3>
              <div className="space-y-4 text-[10px] font-mono text-slate-400 uppercase">
                 <div className="flex items-center space-x-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <Ticket className="text-sci-purple" size={24} />
                    <p>Access Passes bypass standard marketplace fees.</p>
                 </div>
                 <div className="flex items-center space-x-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <Cpu className="text-sci-cyan" size={24} />
                    <p>Characters create permanent gaming identities.</p>
                 </div>
                 <div className="p-4 bg-red-950/20 rounded-xl border border-red-900/50">
                   <p className="text-red-400 font-bold mb-2">MAX SUPPLY WARNING</p>
                   <p>System enforces 1,000,000,000 QUEST limit. Minting beyond this is rejected by the consensus engine.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
