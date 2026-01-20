import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
import { Link2, Cpu, ShieldCheck, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isLoading } = useChain();
  const [username, setUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    await login(username.trim());
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
          
          <h2 className="text-2xl font-bold text-center text-white mb-2 font-sans">
            IDENTITY UPLINK
          </h2>
          <p className="text-center text-slate-400 text-sm font-mono mb-8">
            Connect via Blurt Blockchain Node
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-xs font-mono text-sci-cyan mb-2">
                BLURT_USERNAME
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 pl-10 rounded focus:outline-none focus:border-sci-cyan focus:ring-1 focus:ring-sci-cyan font-mono transition"
                  placeholder="username"
                  autoComplete="off"
                />
                <Cpu className="absolute left-3 top-3.5 w-4 h-4 text-slate-600" />
              </div>
              {/* <div className="mt-2 flex items-start space-x-2 text-[10px] text-slate-500 font-mono">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <p>Admin access requires prefixing your username with '#'. Standard users enter username normally.</p>
              </div> */}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-sci-cyan hover:bg-cyan-400 text-slate-900 font-bold py-3 px-4 rounded transition-all duration-300 flex items-center justify-center space-x-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <span className="animate-pulse">ESTABLISHING LINK...</span>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>AUTHENTICATE</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
             <p className="text-xs text-slate-600 font-mono">
               New users receive <span className="text-sci-cyan">1000 QUEST</span> welcome bonus.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};