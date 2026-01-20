import React from 'react';
import { useChain } from '../context/ChainContext';
import { Box, FileText } from 'lucide-react';

export const Explorer: React.FC = () => {
  const { chain } = useChain();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-wide">
          CHAIN <span className="text-sci-cyan">EXPLORER</span>
        </h1>
        <p className="text-slate-400 font-mono text-sm">
          Total Supply: {chain.totalSupply.toLocaleString()} / 1,000,000,000
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Latest Blocks */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-sci-purple mb-4 flex items-center">
            <Box className="mr-2" /> LATEST BLOCKS
          </h2>
          <div className="space-y-4">
            {[...chain.blocks].reverse().slice(0, 10).map((block) => (
              <div key={block.hash} className="bg-slate-900/50 border border-slate-800 p-4 rounded hover:border-sci-purple/50 transition">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sci-cyan font-mono font-bold">#{block.index}</span>
                  <span className="text-xs text-slate-500 font-mono">{new Date(block.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-xs text-slate-400 font-mono truncate mb-2">
                  HASH: {block.hash}
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                   <span>Validator: {block.validator}</span>
                   <span className="bg-slate-800 px-2 py-0.5 rounded text-white">{block.transactions.length} TXs</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Transactions (Mempool) */}
        <div>
          <h2 className="text-xl font-bold text-sci-cyan mb-4 flex items-center">
             <FileText className="mr-2" /> MEMPOOL ({chain.pendingTransactions.length})
          </h2>
           <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden min-h-[200px]">
             {chain.pendingTransactions.length === 0 ? (
               <div className="p-8 text-center text-slate-600 font-mono text-sm">
                 Waiting for transactions...
               </div>
             ) : (
               <div className="divide-y divide-slate-800">
                 {chain.pendingTransactions.map((tx) => (
                   <div key={tx.id} className="p-4 hover:bg-slate-800/50 transition">
                     <div className="flex justify-between mb-1">
                       <span className={`text-xs font-bold ${tx.type === 'REWARD' ? 'text-yellow-400' : 'text-white'}`}>{tx.type}</span>
                       <span className="text-xs text-sci-cyan font-mono">{tx.amount} QUEST</span>
                     </div>
                     <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                       <span>From: {tx.from}</span>
                       <span>To: {tx.to}</span>
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
