
import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { Cpu, Activity, ShieldCheck, Zap, Terminal, Globe, Settings, Save, Wifi, RefreshCw, Key, ShieldAlert, Download, Copy, CheckCircle, Upload } from 'lucide-react';
import { NODE_PASS_COST, DEFAULT_P2P_GATEWAY, STORAGE_KEYS } from '../types';
import { simpleHash } from '../services/chainUtils';

export const NodeManager: React.FC = () => {
  const { chain, user, mineBlock, mintNodePass, nodeUrl, setNodeUrl, updateSignerKey } = useChain();
  const [logs, setLogs] = useState<{msg: string, time: string, type: string}[]>([]);
  const [customNodeUrl, setCustomNodeUrl] = useState(nodeUrl);
  const [isSavingNode, setIsSavingNode] = useState(false);
  
  // Validator Key States
  const [tempPrivKey, setTempPrivKey] = useState('');
  const [tempPubKey, setTempPubKey] = useState('');
  const [showKeyGen, setShowKeyGen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasNodePass = user.inventory.some(i => i.subType === 'NODE_PASS');

  const generateValidatorKey = () => {
    const entropy = Math.random().toString(36) + Date.now();
    const priv = simpleHash(entropy);
    const pub = simpleHash(priv).substring(0, 32); // Derived Public Key
    setTempPrivKey(priv);
    setTempPubKey(pub);
    setShowKeyGen(true);
  };

  const registerKey = () => {
    if (!tempPubKey) return;
    localStorage.setItem(STORAGE_KEYS.SIGNER_PRIVATE, tempPrivKey);
    updateSignerKey(tempPubKey);
    setShowKeyGen(false);
    alert("Signer registered on-chain. Key stored in browser RAM.");
  };

  useEffect(() => {
    if (!hasNodePass) return;
    const messages = [
      { msg: 'P2P Handshake: node_broadcast active', type: 'info' },
      { msg: `Consensus verified for Block #${chain.height}`, type: 'success' },
      { msg: `Next witness in queue: ${chain.currentWitness}`, type: 'info' },
    ];
    const interval = setInterval(() => {
      const log = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [{ ...log, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
    }, 5000);
    return () => clearInterval(interval);
  }, [chain.height, hasNodePass]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-tight">NODE <span className="text-sci-cyan">MANAGER</span></h1>
           <p className="text-slate-400 font-mono text-sm">Cluster Status: {chain.isP2PConnected ? 'SYNCED' : 'OFFLINE'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Validator Configuration */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
             <h3 className="text-white font-black text-xs uppercase tracking-tighter mb-6 flex items-center">
                <Key size={16} className="text-sci-cyan mr-2" /> Validator Identity
             </h3>
             
             {user.signerKey ? (
               <div className="space-y-4">
                 <div className="bg-slate-950 p-4 rounded-xl border border-sci-cyan/30">
                   <p className="text-[9px] text-sci-cyan font-mono uppercase mb-1">Active Signer PubKey</p>
                   <p className="text-xs text-white font-mono break-all">{user.signerKey}</p>
                 </div>
                 <button onClick={generateValidatorKey} className="w-full bg-slate-800 text-slate-300 py-2 rounded text-[10px] uppercase font-black hover:text-white">Rotate Key</button>
               </div>
             ) : (
               <div className="text-center py-4">
                 <ShieldAlert size={32} className="text-yellow-500 mx-auto mb-4" />
                 <p className="text-[10px] text-slate-500 font-mono mb-6">No signing key registered for this account.</p>
                 <button onClick={generateValidatorKey} className="w-full bg-sci-cyan text-slate-950 py-3 rounded-xl text-[10px] font-black uppercase">Setup Validator Key</button>
               </div>
             )}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
             <h3 className="text-white font-black text-xs uppercase tracking-tighter mb-6 flex items-center">
                <Settings size={16} className="text-sci-cyan mr-2" /> P2P Gateway
             </h3>
             <input value={customNodeUrl} onChange={e => setCustomNodeUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white mb-4 font-mono" />
             <button onClick={() => setNodeUrl(customNodeUrl)} className="w-full bg-slate-800 text-white py-2 rounded text-[10px] uppercase font-black border border-slate-700">Switch Provider</button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
             <h3 className="text-slate-500 font-mono text-[10px] uppercase mb-4 tracking-widest">Local RPC Console</h3>
             <div className="bg-black/50 p-4 rounded-lg font-mono text-[9px] space-y-2 h-[150px] overflow-y-auto custom-scrollbar">
                {logs.map((log, i) => <div key={i} className="flex space-x-2"><span className="text-slate-700">[{log.time}]</span><span className={log.type === 'success' ? 'text-green-400' : 'text-sci-cyan'}>{log.msg}</span></div>)}
                <div className="animate-pulse text-sci-cyan">{'>'} mesh_active...</div>
             </div>
          </div>
        </div>

        {/* Schedule & Signing */}
        <div className="lg:col-span-8 space-y-8">
           {showKeyGen && (
             <div className="bg-yellow-500/10 border-2 border-yellow-500/50 p-8 rounded-3xl animate-in zoom-in duration-300">
                <h3 className="text-yellow-500 font-black mb-4 flex items-center uppercase"><ShieldAlert className="mr-2" /> BACKUP REQUIRED</h3>
                <p className="text-xs text-slate-300 font-mono mb-6 leading-relaxed">Generated unique entropy for your Node Validator. You MUST save the Private Key. Loss of this key prevents you from signing blocks if you change devices.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                   <div className="bg-black/60 p-4 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-500 font-mono uppercase mb-2">Private Key (SECRET)</p>
                      <p className="text-[10px] text-red-400 font-mono break-all">{tempPrivKey}</p>
                   </div>
                   <div className="bg-black/60 p-4 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-500 font-mono uppercase mb-2">Public Key (SIGNER)</p>
                      <p className="text-[10px] text-white font-mono break-all">{tempPubKey}</p>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={registerKey} className="flex-1 bg-yellow-500 text-slate-900 font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-white transition-all">Register Signer On-Chain</button>
                   <button onClick={() => setShowKeyGen(false)} className="px-6 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold border border-slate-700">Cancel</button>
                </div>
             </div>
           )}

           <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <ShieldCheck className="mr-2 text-sci-cyan" /> Witness Cohort
                </h3>
                {!hasNodePass && <span className="text-red-500 text-[10px] font-black animate-pulse">NODE_PASS_REQUIRED</span>}
              </div>
              <div className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chain.witnesses.map((w, idx) => (
                      <div key={w} className={`p-5 rounded-2xl border transition-all duration-500 flex items-center justify-between ${w === chain.currentWitness ? 'bg-sci-cyan/10 border-sci-cyan' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
                        <div className="flex items-center space-x-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${w === chain.currentWitness ? 'bg-sci-cyan text-slate-950' : 'bg-slate-900 text-slate-500'}`}>{idx + 1}</div>
                           <p className="text-white font-black text-sm uppercase">@{w}</p>
                        </div>
                        {w === chain.currentWitness && (
                           <div className="flex flex-col items-end">
                              {user.username === w ? (
                                <button onClick={() => mineBlock()} className="bg-sci-cyan text-slate-950 px-4 py-2 rounded text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">Sign Block</button>
                              ) : <span className="text-[10px] font-black text-sci-cyan animate-pulse uppercase">WAITING...</span>}
                           </div>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
