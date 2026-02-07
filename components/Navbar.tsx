import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
import { NavLink } from 'react-router-dom';
import { Hexagon, LayoutDashboard, Database, Gamepad2, ShieldAlert, LogOut, RefreshCw, Menu, X, Cpu, Box, Trophy, Share2, Vote, Zap } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, chain } = useChain();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-300 ${
      isActive 
        ? 'bg-sci-cyan/20 text-sci-cyan border border-sci-cyan/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  const mobileNavClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
      isActive 
        ? 'bg-sci-cyan/10 text-sci-cyan border-l-4 border-sci-cyan' 
        : 'text-slate-400 hover:bg-slate-800'
    }`;

  const navItems = [
    { to: "/", icon: <LayoutDashboard size={14} />, label: "HUB" },
    { to: "/games", icon: <Gamepad2 size={14} />, label: "GAMES" },
    { to: "/gov", icon: <Vote size={14} />, label: "STAKE" },
    { to: "/visualizer", icon: <Share2 size={14} />, label: "MAP" },
    { to: "/leaderboard", icon: <Trophy size={14} />, label: "ELITE" },
    { to: "/inventory", icon: <Box size={14} />, label: "ASSETS" },
    { to: "/nodes", icon: <Cpu size={14} />, label: "NODES" },
    { to: "/swap", icon: <RefreshCw size={14} />, label: "SWAP" },
    { to: "/explorer", icon: <Database size={14} />, label: "EXPLORER" },
  ];

  return (
    <nav className="sticky top-0 z-[100] bg-sci-panel/95 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 flex items-center space-x-2">
            <Hexagon className="w-8 h-8 text-sci-cyan animate-pulse-slow" />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold font-sans tracking-wider text-white">
                QUEST<span className="text-sci-cyan">PROTOCOL</span>
              </span>
              <div className="flex items-center mt-1">
                <span className="text-[8px] font-black text-sci-cyan tracking-widest opacity-80 uppercase mr-2">Sidechain v1.6</span>
                {chain.isSyncing && (
                  <span className="flex items-center text-[7px] text-yellow-500 animate-pulse font-mono">
                    <RefreshCw size={8} className="animate-spin mr-1" /> MAINNET_SYNCING
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-1 font-mono text-[10px] xl:text-[11px]">
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.icon}<span>{item.label}</span>
                </NavLink>
              ))}
              {user.isAdmin && (
                <NavLink to="/admin" className={navClass}><ShieldAlert size={14} /><span>ADMIN</span></NavLink>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user.username ? (
              <div className="hidden md:flex items-center space-x-4 bg-slate-900 px-3 py-1.5 rounded border border-slate-700">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-sci-cyan font-bold">@{user.username}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{user.balance.toLocaleString()} QUEST</span>
                </div>
                 <button onClick={logout} className="p-1 hover:text-red-400 text-slate-500 transition"><LogOut size={16} /></button>
              </div>
            ) : (
              <div className="hidden md:block text-[10px] text-slate-500 font-mono animate-pulse tracking-widest uppercase">Protocol Offline</div>
            )}

            {/* Mobile Toggle */}
            <div className="lg:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="text-slate-400 hover:text-sci-cyan p-2 bg-slate-900 rounded border border-slate-800 transition-all"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full bg-sci-panel border-b border-slate-800 animate-in slide-in-from-top-4 duration-300 z-[99]">
          <div className="p-4 space-y-2">
             {user.username && (
               <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl mb-4 border border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-sci-cyan/20 border border-sci-cyan flex items-center justify-center text-sci-cyan font-black">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                       <p className="text-white font-bold">@{user.username}</p>
                       <p className="text-[10px] text-slate-500 font-mono">{user.balance.toLocaleString()} QUEST</p>
                    </div>
                  </div>
                  <button onClick={logout} className="p-2 text-slate-500 hover:text-red-500"><LogOut size={20}/></button>
               </div>
             )}
             
             <div className="grid grid-cols-2 gap-2">
                {navItems.map(item => (
                  <NavLink 
                    key={item.to} 
                    to={item.to} 
                    onClick={() => setIsMenuOpen(false)}
                    className={mobileNavClass}
                  >
                    {item.icon}
                    <span className="text-xs font-bold font-mono">{item.label}</span>
                  </NavLink>
                ))}
             </div>
             
             {user.isAdmin && (
                <NavLink 
                  to="/admin" 
                  onClick={() => setIsMenuOpen(false)}
                  className={mobileNavClass}
                >
                  <ShieldAlert size={16} />
                  <span className="text-xs font-bold font-mono">ADMIN PANEL</span>
                </NavLink>
             )}
          </div>
          <div className="bg-slate-950 p-4 text-center border-t border-slate-900">
             <span className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.3em]">Quest System Core v1.6</span>
          </div>
        </div>
      )}
    </nav>
  );
};