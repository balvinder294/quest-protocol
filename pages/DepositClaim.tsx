
import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
import { CheckCircle2, AlertCircle, Search, Wallet, Link2, ExternalLink, RefreshCw } from 'lucide-react';

export const DepositClaim: React.FC = () => {
  const { user, claimBlurtDeposit } = useChain();
  const [txId, setTxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error' | null, msg: string}>({type: null, msg: ''});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txId.trim()) return;
    setLoading(true);
    setStatus({type: null, msg: ''});
    
    const res = await claimBlurtDeposit(txId.trim());
    setStatus({ type: res.success ? 'success' : 'error', msg: res.msg });
    setLoading(false);
    if (res.success) setTxId('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight font-sans">
          BRIDGE <span className="text-sci-cyan">UPLINK</span>
        </h1>
        <p className="text-slate-400 font-mono text-sm">
          Submit Blurt Transaction ID to claim your QUEST tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <div className="bg-sci-panel border border-slate-800 p-8 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sci-cyan/5 rounded-full blur-3xl"></div>
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-xs font-mono text-sci-cyan mb-2">BLURT_TRANSACTION_ID</label>
                <div className="relative">
                  <input 
                    value={txId}
                    onChange={e => setTxId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-4 text-white focus:border-sci-cyan outline-none font-mono"
                    placeholder="e.g. f932...8b12"
                  />
                  <Link2 className="absolute left-3 top-4.5 text-slate-600" size={18} />
                </div>
              </div>

              {status.type && (
                <div className={`p-4 rounded-lg flex items-start space-x-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                  status.type === 'success' ? 'bg-green-500/10 border border-green-500 text-green-400' : 'bg-red-500/10 border border-red-500 text-red-400'
                }`}>
                  {status.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                  <p className="text-xs font-mono">{status.msg}</p>
                </div>
              )}

              <button 
                disabled={loading || !txId}
                className={`w-full font-black py-4 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                  loading ? 'bg-slate-800 text-slate-500' : 'bg-sci-cyan text-slate-950 hover:bg-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                }`}
              >
                {loading ? <RefreshCw size={20} className="animate-spin" /> : <Search size={20} />}
                <span>{loading ? 'VERIFYING_BLOCKCHAIN...' : 'CLAIM_QUEST'}</span>
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
             <h3 className="text-white font-black mb-4 flex items-center"><Wallet className="mr-2 text-sci-cyan" /> PROTOCOL STEPS</h3>
             <ul className="space-y-4 text-xs font-mono text-slate-400">
               <li className="flex space-x-3">
                 <span className="text-sci-cyan font-bold">01.</span>
                 <p>Send BLURT to <span className="text-white font-bold">@tekraze</span> on the Blurt mainnet.</p>
               </li>
               <li className="flex space-x-3">
                 <span className="text-sci-cyan font-bold">02.</span>
                 <p>Include your sidechain username <span className="text-sci-cyan">"{user.username}"</span> in the transfer memo.</p>
               </li>
               <li className="flex space-x-3">
                 <span className="text-sci-cyan font-bold">03.</span>
                 <p>Copy the Transaction ID (TxID) from your wallet history.</p>
               </li>
               <li className="flex space-x-3">
                 <span className="text-sci-cyan font-bold">04.</span>
                 <p>Submit the ID here to receive QUEST at 1:10 ratio instantly.</p>
               </li>
             </ul>
             <a href="https://blurtwallet.com" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center text-[10px] text-sci-cyan hover:underline">
               Open Blurt Wallet <ExternalLink size={10} className="ml-1" />
             </a>
           </div>
        </div>
      </div>
    </div>
  );
};