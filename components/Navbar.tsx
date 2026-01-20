
import React, { useState } from 'react';
import { useChain } from '../context/ChainContext';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';
import { Hexagon, LayoutDashboard, Database, Gamepad2, ShieldAlert, LogOut, RefreshCw, Menu, X, Cpu, Box, Wifi, WifiOff } from 'lucide-react';

const { NavLink } = RouterDOM;

export const Navbar: React.FC = () => {
  const { user, logout, p2pStatus } = useChain();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-300 ${
      isActive 
        ? 'bg-sci-cyan/20 text-sci-cyan border border-sci-cyan/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  const mobileNavClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center space-x-4 px-6 py-4 border-b border-slate-800 transition-all duration-300 ${
      isActive ? 'bg-sci-cyan/10 text-sci-cyan' : 'text-slate-400'
    }`;

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-sci-panel/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center space-x-2">
            <Hexagon className="w-8 h-8 text-sci-cyan animate-pulse-slow" />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold font-sans tracking-wider text-white">
                QUEST<span className="text-sci-cyan">PROTOCOL</span>
              </span>
              <span className="text-[8px] font-black text-sci-cyan tracking-widest mt-1 opacity-80 uppercase">Sidechain Beta</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4 font-mono text-sm">
              <NavLink to="/" className={navClass}>
                <LayoutDashboard size={16} />
                <span>HUB</span>
              </NavLink>
              <NavLink to="/nodes" className={navClass}>
                <Cpu size={16} />
                <span>NODES</span>
              </NavLink>
              <NavLink to="/inventory" className={navClass}>
                <Box size={16} />
                <span>ASSETS</span>
              </NavLink>
              <NavLink to="/swap" className={navClass}>
                <RefreshCw size={16} />
                <span>SWAP</span>
              </NavLink>
              <NavLink to="/games" className={navClass}>
                <Gamepad2 size={16} />
                <span>GAMES</span>
              </NavLink>
              <NavLink to="/explorer" className={navClass}>
                <Database size={16} />
                <span>EXPLORER</span>
              </NavLink>
              {user.isAdmin && (
                <NavLink to="/admin" className={navClass}>
                  <ShieldAlert size={16} />
                  <span>ADMIN</span>
                </NavLink>
              )}
            </div>
          </div>

          {/* User Status & P2P (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {/* P2P Status Indicator */}
            <div className={`flex items-center px-2 py-1 rounded border text-[10px] font-bold font-mono transition-colors ${
              p2pStatus === 'CONNECTED' ? 'bg-green-500/10 border-green-500 text-green-500' :
              p2pStatus === 'CONNECTING' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 animate-pulse' :
              'bg-red-500/10 border-red-500 text-red-500'
            }`}>
              {p2pStatus === 'CONNECTED' ? <Wifi size={12} className="mr-1" /> : <WifiOff size={12} className="mr-1" />}
              {p2pStatus}
            </div>

            {user.username ? (
              <div className="flex items-center space-x-4 bg-slate-900 px-3 py-1.5 rounded border border-slate-700">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-sci-cyan font-bold">@{user.username}</span>
                  <span className="text-xs text-slate-400 font-mono">{user.balance.toLocaleString()} QUEST</span>
                </div>
                 <button onClick={logout} className="p-1 hover:text-red-400 text-slate-500 transition">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono animate-pulse">
                NOT CONNECTED
              </div>
            )}
          </div>

          {/* Hamburger Toggle */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-400 hover:text-white p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-sci-bg/95 backdrop-blur-xl border-b border-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col font-sans">
            <NavLink to="/" className={mobileNavClass} onClick={closeMenu}>
              <LayoutDashboard size={20} />
              <span className="font-bold">DASHBOARD HUB</span>
            </NavLink>
            <NavLink to="/nodes" className={mobileNavClass} onClick={closeMenu}>
              <Cpu size={20} />
              <span className="font-bold">NODE MANAGER</span>
            </NavLink>
            <NavLink to="/inventory" className={mobileNavClass} onClick={closeMenu}>
              <Box size={20} />
              <span className="font-bold">INVENTORY ASSETS</span>
            </NavLink>
            <NavLink to="/swap" className={mobileNavClass} onClick={closeMenu}>
              <RefreshCw size={20} />
              <span className="font-bold">ASSET SWAP</span>
            </NavLink>
            <NavLink to="/games" className={mobileNavClass} onClick={closeMenu}>
              <Gamepad2 size={20} />
              <span className="font-bold">SIMULATION DECK</span>
            </NavLink>
            <NavLink to="/explorer" className={mobileNavClass} onClick={closeMenu}>
              <Database size={20} />
              <span className="font-bold">CHAIN EXPLORER</span>
            </NavLink>
            {user.isAdmin && (
              <NavLink to="/admin" className={mobileNavClass} onClick={closeMenu}>
                <ShieldAlert size={20} />
                <span className="font-bold">ADMIN PANEL</span>
              </NavLink>
            )}
            
            {/* Mobile User Info */}
            {user.username && (
              <div className="p-6 bg-slate-900/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 font-mono">AUTHORIZED AS</span>
                    <span className="text-sci-cyan font-bold">@{user.username}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-mono">BALANCE</span>
                    <div className="text-white font-bold">{user.balance.toLocaleString()} QUEST</div>
                  </div>
                </div>
                <button 
                  onClick={() => { logout(); closeMenu(); }}
                  className="w-full py-3 bg-red-950/20 text-red-500 border border-red-900/50 rounded-lg font-bold flex items-center justify-center"
                >
                  <LogOut size={18} className="mr-2" /> DISCONNECT
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
