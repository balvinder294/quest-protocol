
import React, { useState, useEffect, useCallback } from 'react';
import { useChain } from '../../context/ChainContext';
import { Grid, RefreshCw, ChevronLeft, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Info, Layers, Zap } from 'lucide-react';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';

const { Link } = RouterDOM;

export const BlockMergeGame: React.FC = () => {
  const { addGameReward } = useChain();
  const SIZE = 4;
  const WIN_SCORE = 2048;
  const [board, setBoard] = useState<number[]>(Array(16).fill(0));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  const initGame = () => {
    const newBoard = Array(16).fill(0);
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWin(false);
    setHasWon(false);
  };

  const addRandomTile = (currentBoard: number[]) => {
    const emptyIndices = currentBoard.map((val, idx) => val === 0 ? idx : -1).filter(val => val !== -1);
    if (emptyIndices.length === 0) return;
    const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    currentBoard[idx] = Math.random() < 0.9 ? 2 : 4;
  };

  const getTileColor = (value: number) => {
    switch(value) {
      case 2: return 'bg-slate-800 text-slate-400 border-slate-700 shadow-inner';
      case 4: return 'bg-slate-700 text-slate-200 border-slate-600';
      case 8: return 'bg-sci-cyan/20 text-sci-cyan border-sci-cyan/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]';
      case 16: return 'bg-sci-cyan/40 text-white border-sci-cyan shadow-[0_0_15px_rgba(6,182,212,0.3)]';
      case 32: return 'bg-blue-600 text-white border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]';
      case 64: return 'bg-blue-500 text-white border-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.5)]';
      case 128: return 'bg-sci-purple/30 text-sci-purple border-sci-purple shadow-[0_0_20px_rgba(139,92,246,0.3)]';
      case 256: return 'bg-sci-purple/60 text-white border-sci-purple shadow-[0_0_30px_rgba(139,92,246,0.5)]';
      case 512: return 'bg-sci-purple text-white border-purple-300 shadow-[0_0_40px_rgba(139,92,246,0.7)]';
      case 1024: return 'bg-yellow-600 text-white border-yellow-400 shadow-[0_0_50px_rgba(202,138,4,0.6)] animate-pulse';
      case 2048: return 'bg-yellow-400 text-slate-950 font-black border-white shadow-[0_0_60px_rgba(250,204,21,0.9)] animate-bounce';
      default: return 'bg-slate-900 border-slate-800';
    }
  };

  const move = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    
    let newBoard = [...board];
    let moved = false;
    let addedScore = 0;

    const toIdx = (x: number, y: number) => y * SIZE + x;

    const processLine = (line: number[]) => {
      let filtered = line.filter(v => v !== 0);
      let merged: number[] = [];
      let skip = false;
      
      for(let i=0; i<filtered.length; i++) {
        if(skip) { skip = false; continue; }
        if(i < filtered.length - 1 && filtered[i] === filtered[i+1]) {
          const newVal = filtered[i] * 2;
          merged.push(newVal);
          addedScore += newVal;
          if (newVal === WIN_SCORE && !hasWon) {
            setWin(true);
            setHasWon(true);
            addGameReward(100, 'Consensus Core');
          }
          skip = true;
        } else {
          merged.push(filtered[i]);
        }
      }
      while(merged.length < SIZE) merged.push(0);
      return merged;
    };

    if (direction === 'LEFT') {
      for(let y=0; y<SIZE; y++) {
        let line = [];
        for(let x=0; x<SIZE; x++) line.push(board[toIdx(x,y)]);
        let newLine = processLine(line);
        for(let x=0; x<SIZE; x++) if(board[toIdx(x,y)] !== newLine[x]) moved = true;
        for(let x=0; x<SIZE; x++) newBoard[toIdx(x,y)] = newLine[x];
      }
    } else if (direction === 'RIGHT') {
      for(let y=0; y<SIZE; y++) {
        let line = [];
        for(let x=SIZE-1; x>=0; x--) line.push(board[toIdx(x,y)]);
        let newLine = processLine(line);
        for(let x=SIZE-1; x>=0; x--) if(board[toIdx(x,y)] !== newLine[SIZE-1-x]) moved = true;
        for(let x=SIZE-1; x>=0; x--) newBoard[toIdx(x,y)] = newLine[SIZE-1-x];
      }
    } else if (direction === 'UP') {
      for(let x=0; x<SIZE; x++) {
        let line = [];
        for(let y=0; y<SIZE; y++) line.push(board[toIdx(x,y)]);
        let newLine = processLine(line);
        for(let y=0; y<SIZE; y++) if(board[toIdx(x,y)] !== newLine[y]) moved = true;
        for(let y=0; y<SIZE; y++) newBoard[toIdx(x,y)] = newLine[y];
      }
    } else if (direction === 'DOWN') {
      for(let x=0; x<SIZE; x++) {
        let line = [];
        for(let y=SIZE-1; y>=0; y--) line.push(board[toIdx(x,y)]);
        let newLine = processLine(line);
        for(let y=SIZE-1; y>=0; y--) if(board[toIdx(x,y)] !== newLine[SIZE-1-y]) moved = true;
        for(let y=SIZE-1; y>=0; y--) newBoard[toIdx(x,y)] = newLine[SIZE-1-y];
      }
    }

    if (moved) {
      addRandomTile(newBoard);
      setBoard(newBoard);
      setScore(prev => prev + addedScore);
      
      if (!newBoard.includes(0)) {
        let canMerge = false;
        for(let i=0; i<SIZE*SIZE; i++) {
          const val = newBoard[i];
          const x = i % SIZE;
          const y = Math.floor(i / SIZE);
          if (x < SIZE-1 && newBoard[toIdx(x+1, y)] === val) canMerge = true;
          if (y < SIZE-1 && newBoard[toIdx(x, y+1)] === val) canMerge = true;
        }
        if (!canMerge) setGameOver(true);
      }
    }
  }, [board, gameOver, hasWon, addGameReward]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch(e.key) {
      case 'ArrowUp': move('UP'); break;
      case 'ArrowDown': move('DOWN'); break;
      case 'ArrowLeft': move('LEFT'); break;
      case 'ArrowRight': move('RIGHT'); break;
    }
  }, [move]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    initGame();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black font-sans text-sci-cyan tracking-widest uppercase">Consensus Core</h1>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Core Analytics</h3>
            
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
              <p className="text-[10px] font-mono text-sci-cyan mb-1">STABILITY_LEVEL</p>
              <div className="text-3xl font-black font-mono text-white tracking-tighter">{score.toLocaleString()}</div>
            </div>

            <button 
              onClick={initGame}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded uppercase tracking-widest transition-all border border-slate-700 text-xs flex items-center justify-center"
            >
              <RefreshCw size={14} className="mr-2" /> Reset_Consensus
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center">
              <Info size={12} className="mr-2" /> DATA MERGING
            </h3>
            <div className="space-y-4 text-[11px] font-mono text-slate-400">
               <div className="flex items-start">
                 <Layers size={14} className="text-sci-cyan mr-3 mt-0.5 flex-shrink-0" />
                 <p>Slide matching data packets together to combine them into higher versions.</p>
               </div>
               <div className="flex items-start">
                 <Zap size={14} className="text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                 <p>Reach version 2048 to achieve protocol consensus and claim 100 QUEST bounty.</p>
               </div>
               <div className="p-3 bg-slate-950/50 rounded border border-slate-800/50 mt-4">
                 <p className="text-[10px] text-slate-500 mb-2">HOTKEYS:</p>
                 <div className="grid grid-cols-2 gap-2 text-center">
                   <span className="bg-slate-800 py-1 rounded">ARROWS</span>
                   <span className="bg-slate-800 py-1 rounded">WASD</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Board Area */}
        <div className="lg:col-span-3 flex justify-center items-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl shadow-inner relative min-h-[500px]">
          {gameOver && (
            <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center rounded-xl backdrop-blur-md animate-in fade-in duration-500">
               <h2 className="text-5xl font-black text-red-500 mb-2 uppercase tracking-tighter">Chain Halted</h2>
               <p className="text-slate-400 mb-10 font-mono">Consensus impossible. Buffer overflow.</p>
               <button 
                onClick={initGame} 
                className="bg-white text-slate-950 px-10 py-4 rounded font-black uppercase tracking-widest transition-all hover:scale-105"
               >
                 Re-Initialize Core
               </button>
            </div>
          )}

          {win && !hasWon && (
             <div className="absolute inset-0 z-20 bg-sci-bg/90 flex flex-col items-center justify-center rounded-xl backdrop-blur-md animate-in zoom-in duration-300">
               <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" />
               <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Consensus Achieved</h2>
               <p className="text-sci-cyan mb-10 font-mono text-lg tracking-widest">PROTOCOL v2048 VERIFIED</p>
               <button 
                onClick={() => setWin(false)} 
                className="bg-sci-cyan text-slate-950 px-10 py-4 rounded font-black uppercase tracking-widest transition-all hover:bg-white"
               >
                 Continue Mining
               </button>
            </div>
          )}

          <div className="bg-slate-950 p-4 rounded-xl border-4 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
             <div className="grid grid-cols-4 gap-3">
               {board.map((val, i) => (
                 <div 
                   key={i} 
                   className={`w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center rounded-lg font-black text-xl sm:text-3xl transition-all duration-200 border-2 ${getTileColor(val)}`}
                 >
                   {val !== 0 && val}
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
