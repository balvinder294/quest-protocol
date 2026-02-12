
import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
import { Link2, Cpu, ShieldCheck, AlertCircle, Key, Fingerprint, Copy, CheckCircle, RefreshCw, ShieldAlert, AlertTriangle } from 'lucide-react';
import { validatePostingKeyFormat } from '../services/blurtService';

export const Login: React.FC = () => {
  const { login, isLoading } = useChain();
  const [username, setUsername] = useState('');
  const [postingKey, setPostingKey] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [loginMethod, setLoginMethod] = useState<'WHALEVAULT' | 'POSTING_KEY' | 'MNEMONIC'>('WHALEVAULT');
  const [showMnemonicGen, setShowMnemonicGen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
        alert("Username is required to establish identity link.");
        return;
    }
    
    let keyToPass = undefined;
    if (loginMethod === 'POSTING_KEY') {
        if (!validatePostingKeyFormat(postingKey)) {
            alert("Invalid WIF Format. Posting key usually starts with 5, K, or L.");
            return;
        }
        keyToPass = postingKey;
    } else if (loginMethod === 'MNEMONIC') {
        if (mnemonic.split(' ').length < 12) {
            alert("Invalid Mnemonic. Requires 12 words.");
            return;
        }
        keyToPass = mnemonic;
    }

    const res = await login(username.trim(), loginMethod, keyToPass);
    if (!res.success) alert(res.msg);
  };

  const generateNewMnemonic = () => {
    const words = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega nebula pulsar quasar vector matrix vertex logic cipher vault ghost shadow phantom".split(' ');
    const generated = Array(12).fill(0).map(() => words[Math.floor(Math.random() * words.length)]).join(' ');
    setMnemonic(generated);
    setShowMnemonicGen(true);
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        {/* Decor */}
        <div className="absolute -top-10 -left-10 w-20 h-20 border-t-2 border-l-2 border-sci-cyan/30 rounded-tl-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-20 h-20 border-b-2 border-r-2 border-sci-purple/30 rounded-br-3xl"></div>

        <div className="bg-sci-panel border border-slate-700 p-8 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.1)]">
          <div className="flex justify-center mb-6">
            <div className="bg-slate-900 p-4 rounded-full border border-sci-cyan/20 shadow-inner">
              <Link2 className="w-10 h-10 text-sci-cyan" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-white mb-2 font-sans uppercase tracking-tight">
            Identity <span className="text-sci-cyan">Uplink</span>
          </h2>
          <p className="text-center text-slate-400 text-xs font-mono mb-8 uppercase tracking-widest">
            Protocol Selection Required
          </p>

          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 mb-8 overflow-x-auto">
            <button 
              onClick={() => setLoginMethod('WHALEVAULT')}
              className={`flex-1 min-w-[100px] py-2 text-[9px] font-black uppercase tracking-widest rounded transition-all ${loginMethod === 'WHALEVAULT' ? 'bg-sci-cyan text-slate-950' : 'text-slate-500 hover:text-white'}`}
            >
              WhaleVault
            </button>
            <button 
              onClick={() => setLoginMethod('POSTING_KEY')}
              className={`flex-1 min-w-[100px] py-2 text-[9px] font-black uppercase tracking-widest rounded transition-all ${loginMethod === 'POSTING_KEY' ? 'bg-sci-cyan text-slate-950' : 'text-slate-500 hover:text-white'}`}
            >
              L1 Key
            </button>
            <button 
              onClick={() => setLoginMethod('MNEMONIC')}
              className={`flex-1 min-w-[100px] py-2 text-[9px] font-black uppercase tracking-widest rounded transition-all ${loginMethod === 'MNEMONIC' ? 'bg-sci-cyan text-slate-950' : 'text-slate-500 hover:text-white'}`}
            >
              Mnemonic
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono text-sci-cyan mb-2 uppercase tracking-widest">
                Choose Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 pl-10 rounded focus:border-sci-cyan outline-none font-mono text-sm"
                  placeholder="e.g. cyber_vanguard"
                  required
                />
                <Fingerprint className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
              </div>
              <p className="mt-1.5 text-[8px] text-slate-600 font-mono uppercase">This identity will be recorded on the MongoDB sidechain state.</p>
            </div>

            {loginMethod === 'POSTING_KEY' && (
              <div>
                <label className="block text-[10px] font-mono text-sci-cyan mb-2 uppercase tracking-widest">
                  Private Posting Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={postingKey}
                    onChange={(e) => setPostingKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 pl-10 rounded focus:border-sci-cyan outline-none font-mono"
                    placeholder="5J... (Browser RAM Only)"
                  />
                  <Key className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
                </div>
              </div>
            )}

            {loginMethod === 'MNEMONIC' && (
              <div className="space-y-4">
                {showMnemonicGen ? (
                  <div className="p-4 bg-slate-950 border border-sci-cyan/30 rounded-lg animate-in fade-in zoom-in duration-300">
                    <p className="text-[9px] text-sci-cyan font-mono uppercase mb-2 flex items-center">
                       <ShieldAlert size={10} className="mr-1" /> New Seed Generated
                    </p>
                    <p className="text-white font-mono text-xs leading-relaxed mb-4 p-3 bg-black/40 rounded border border-slate-800 selection:bg-sci-cyan selection:text-black">{mnemonic}</p>
                    
                    <div className="bg-red-950/20 border border-red-500/30 p-3 rounded-lg mb-4">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-[9px] text-red-400 font-mono uppercase leading-tight">
                                <span className="font-black">CRITICAL:</span> Backup these 12 words immediately. Loss of mnemonic results in permanent loss of Quest assets. There is no password recovery.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                       <button type="button" onClick={copyMnemonic} className="flex-1 py-2 bg-slate-800 text-xs font-bold rounded flex items-center justify-center space-x-2 hover:bg-slate-700 transition">
                          {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                          <span>{copied ? 'COPIED' : 'COPY'}</span>
                       </button>
                       <button type="button" onClick={() => setShowMnemonicGen(false)} className="flex-1 py-2 bg-sci-cyan text-slate-950 text-xs font-bold rounded hover:bg-white transition shadow-lg">FINISH SETUP</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-mono text-sci-cyan mb-2 uppercase tracking-widest">
                      12-Word Mnemonic Vault
                    </label>
                    <textarea
                      value={mnemonic}
                      onChange={(e) => setMnemonic(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded focus:border-sci-cyan outline-none font-mono h-24 text-xs"
                      placeholder="Enter 12 words separated by spaces..."
                    />
                    <div className="flex justify-between items-center mt-2">
                        <button type="button" onClick={generateNewMnemonic} className="text-[10px] text-slate-500 hover:text-sci-cyan flex items-center font-mono transition">
                          <RefreshCw size={10} className="mr-1" /> Generate New Seed
                        </button>
                        <p className="text-[8px] text-slate-700 font-mono italic">Bypasses L1 verification</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (loginMethod === 'MNEMONIC' && showMnemonicGen)}
              className={`w-full bg-sci-cyan hover:bg-cyan-400 text-slate-900 font-black py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-sci-cyan/20 ${isLoading ? 'opacity-50' : ''}`}
            >
              {isLoading ? (
                <span className="animate-pulse flex items-center">
                    <RefreshCw size={18} className="animate-spin mr-2" /> SYNCHRONIZING_CORE...
                </span>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>{loginMethod === 'WHALEVAULT' ? 'WHALEVAULT LINK' : 'ESTABLISH PROTOCOL'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
             <div className="flex items-start space-x-3">
                <AlertCircle size={14} className="text-sci-purple mt-0.5 flex-shrink-0" />
                <p className="text-[9px] text-slate-500 font-mono leading-relaxed uppercase">
                  Mnemonic accounts use local <span className="text-white font-bold">SHA-256 Entropy</span> to sign <span className="text-sci-cyan">QUEST_TX</span>. They are fully participating blockchain accounts.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
