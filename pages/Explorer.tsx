
import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
import { Box, FileText, ChevronDown, ChevronRight, Fingerprint, Share2, ShieldCheck, ExternalLink, RefreshCw, Shield } from 'lucide-react';

export const Explorer: React.FC = () => {
  const { chain, refreshState } = useChain();
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-wide">
            CHAIN <span className="text-sci-cyan">EXPLORER</span>
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Net Weight: {chain.totalSupply.toLocaleString()} QUEST | Height: {chain.height}
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => refreshState()}
            className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg flex items-center space-x-3 transition hover:bg-slate-800"
          >
             <RefreshCw size={16} className="text-sci-cyan" />
             <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Refresh State</span>
          </button>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg flex items-center space-x-3">
             <ShieldCheck size={16} className="text-sci-cyan" />
             <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Protocol ID: quest_p_v1</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Latest Blocks */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-xl font-bold text-sci-purple mb-4 flex items-center">
            <Box className="mr-2" /> CANONICAL LEDGER
          </h2>
          <div className="space-y-4">
            {[...chain.blocks].reverse().slice(0, 20).map((block) => (
              <div key={block.hash} className={`bg-slate-900/50 border rounded-xl overflow-hidden transition-all duration-300 ${expandedBlock === block.index ? 'border-sci-cyan/50 ring-1 ring-sci-cyan/20' : 'border-slate-800 hover:border-sci-purple/50'}`}>
                <div 
                  className="p-4 cursor-pointer flex justify-between items-center"
                  onClick={() => setExpandedBlock(expandedBlock === block.index ? null : block.index)}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-sci-cyan font-mono font-black text-lg">#{block.index}</span>
                    <div className="flex flex-col">
                       <div className="flex items-center">
                          <span className="text-xs text-white font-bold uppercase mr-2">{block.validator}</span>
                          {block.witnessSignature && (
                            <div title="Cryptographically Signed" className="text-green-500">
                               <Shield size={10} fill="currentColor" />
                            </div>
                          )}
                       </div>
                       <span className="text-[10px] text-slate-500 font-mono">{new Date(block.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                     <span className="bg-slate-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-300 border border-slate-700">
                        {block.transactions.length} TXs
                     </span>
                     {expandedBlock === block.index ? <ChevronDown size={16} className="text-sci-cyan" /> : <ChevronRight size={16} className="text-slate-600" />}
                  </div>
                </div>

                {expandedBlock === block.index && (
                  <div className="p-4 pt-0 border-t border-slate-800/50 bg-black/20 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-4">
                       <div className="p-3 bg-slate-950 rounded border border-slate-800">
                          <p className="text-[9px] font-mono text-slate-600 uppercase mb-1">Block Hash</p>
                          <p className="text-[10px] font-mono text-sci-cyan truncate">{block.hash}</p>
                       </div>
                       <div className="p-3 bg-slate-950 rounded border border-slate-800">
                          <p className="text-[9px] font-mono text-slate-600 uppercase mb-1">Witness Signature</p>
                          <p className={`text-[10px] font-mono truncate ${block.witnessSignature ? 'text-green-400' : 'text-slate-600 italic'}`}>
                            {block.witnessSignature || 'UNAVAILABLE (LEGACY_OR_GUEST)'}
                          </p>
                       </div>
                    </div>

                    <p className="text-[10px] font-mono text-slate-500 uppercase mb-2 px-1">Sealed Transactions</p>
                    <div className="space-y-2">
                       {block.transactions.map((tx) => (
                         <div key={tx.id} className="bg-slate-950/50 p-3 rounded border border-slate-800 flex justify-between items-center group">
                            <div className="flex items-center space-x-3">
                               <Fingerprint size={12} className="text-slate-700" />
                               <div className="flex flex-col">
                                  <span className="text-[10px] text-white font-black">{tx.from} → {tx.to}</span>
                                  <span className="text-[9px] text-slate-600 font-mono uppercase">{tx.type} | {tx.id.substring(0,8)}</span>
                                </div>
                            </div>
                            <div className="text-right">
                               <div className="text-xs font-black text-sci-cyan">{tx.amount} QUEST</div>
                               <div className="text-[8px] text-slate-700 font-mono uppercase">Cluster Confirmation</div>
                            </div>
                         </div>
                       ))}
                       {block.transactions.length === 0 && <p className="text-[10px] font-mono text-slate-700 italic px-1">Empty consensus block.</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mempool Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xl font-bold text-sci-cyan mb-4 flex items-center">
             <FileText className="mr-2" /> DATA PROPAGATION
          </h2>
           <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[400px]">
             <div className="p-4 bg-slate-950/50 border-b border-slate-800">
               <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Global Mempool Status</p>
               <p className="text-xs text-sci-cyan font-black mt-1">BROADCASTING_VIA_P2P</p>
             </div>
             {chain.pendingTransactions.length === 0 ? (
               <div className="p-12 text-center text-slate-600 font-mono text-xs flex flex-col items-center">
                 <Share2 size={32} className="mb-4 opacity-20" />
                 Listening for transmissions...
               </div>
             ) : (
               <div className="divide-y divide-slate-800">
                 {chain.pendingTransactions.map((tx) => (
                   <div key={tx.id} className="p-4 hover:bg-slate-800/50 transition bg-slate-950/30">
                     <div className="flex justify-between mb-1">
                       <span className="text-[10px] font-black uppercase text-sci-cyan">{tx.type}</span>
                       <span className="text-xs text-white font-mono font-bold">{tx.amount} QUEST</span>
                     </div>
                     <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                       <span>{tx.from}</span>
                       <span className="text-sci-purple animate-pulse">PENDING_SYNC</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
