
import React, { useState, useEffect, useCallback } from 'react';
import { useChain } from '../../context/ChainContext';
import { ChevronLeft, RefreshCw, Layers, ArrowLeft, ArrowRight, ArrowDown, RotateCw, Info, Cpu, Zap } from 'lucide-react';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';

const { Link } = RouterDOM;

const ROWS = 20;
const COLS = 10;
const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]' },
  O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.6)]' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]' },
};

export const TetrisGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [grid, setGrid] = useState<string[][]>(Array(ROWS).fill(Array(COLS).fill('')));
  const [currentPiece, setCurrentPiece] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const createPiece = () => {
    const types = 'IOTSZJL';
    const type = types[Math.floor(Math.random() * types.length)];
    const piece = TETROMINOS[type as keyof typeof TETROMINOS];
    return {
      shape: piece.shape,
      color: piece.color,
      x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
    };
  };

  const isValidMove = (piece: any, newX: number, newY: number, currentGrid: string[][]) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const targetX = newX + x;
          const targetY = newY + y;
          if (
            targetX < 0 ||
            targetX >= COLS ||
            targetY >= ROWS ||
            (targetY >= 0 && currentGrid[targetY][targetX])
          ) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const rotate = (piece: any) => {
    const newShape = piece.shape[0].map((_: any, i: number) =>
      piece.shape.map((row: any) => row[i]).reverse()
    );
    return { ...piece, shape: newShape };
  };

  const lockPiece = useCallback(() => {
    setGrid(prevGrid => {
        const newGrid = prevGrid.map(row => [...row]);
        currentPiece.shape.forEach((row: any, y: number) => {
          row.forEach((val: any, x: number) => {
            if (val) {
              const targetY = currentPiece.y + y;
              const targetX = currentPiece.x + x;
              if (targetY >= 0 && targetY < ROWS && targetX >= 0 && targetX < COLS) {
                newGrid[targetY][targetX] = currentPiece.color;
              }
            }
          });
        });

        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
          if (newGrid[y].every(cell => cell !== '')) {
            newGrid.splice(y, 1);
            newGrid.unshift(Array(COLS).fill(''));
            linesCleared++;
            y++;
          }
        }

        if (linesCleared > 0) {
          setScore(s => s + linesCleared * 100);
          addGameReward(linesCleared * 10, 'Stack Overflow');
        }

        const nextPiece = createPiece();
        if (!isValidMove(nextPiece, nextPiece.x, nextPiece.y, newGrid)) {
          setGameOver(true);
        } else {
          setCurrentPiece(nextPiece);
        }
        return newGrid;
    });
  }, [currentPiece, addGameReward]);

  const moveDown = useCallback(() => {
    if (gameOver || !currentPiece) return;
    if (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1, grid)) {
      setCurrentPiece(p => ({ ...p, y: p.y + 1 }));
    } else {
      lockPiece();
    }
  }, [currentPiece, grid, gameOver, lockPiece]);

  const handleAction = (type: 'LEFT' | 'RIGHT' | 'DOWN' | 'ROTATE') => {
    if (gameOver || !currentPiece) return;
    if (type === 'LEFT') {
      if (isValidMove(currentPiece, currentPiece.x - 1, currentPiece.y, grid)) {
        setCurrentPiece(p => ({ ...p, x: p.x - 1 }));
      }
    } else if (type === 'RIGHT') {
      if (isValidMove(currentPiece, currentPiece.x + 1, currentPiece.y, grid)) {
        setCurrentPiece(p => ({ ...p, x: p.x + 1 }));
      }
    } else if (type === 'DOWN') {
      moveDown();
    } else if (type === 'ROTATE') {
      const rotated = rotate(currentPiece);
      if (isValidMove(rotated, rotated.x, rotated.y, grid)) {
        setCurrentPiece(rotated);
      }
    }
  };

  useEffect(() => {
    if (!currentPiece && !gameOver) {
      setCurrentPiece(createPiece());
    }
    if (gameOver) return;
    const interval = setInterval(moveDown, 800);
    return () => clearInterval(interval);
  }, [currentPiece, gameOver, moveDown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAction('LEFT');
      else if (e.key === 'ArrowRight') handleAction('RIGHT');
      else if (e.key === 'ArrowDown') handleAction('DOWN');
      else if (e.key === 'ArrowUp') handleAction('ROTATE');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPiece, grid, gameOver, moveDown]);

  const resetGame = () => {
    setGrid(Array(ROWS).fill(Array(COLS).fill('')));
    setScore(0);
    setGameOver(false);
    setCurrentPiece(null);
    setGameKey(p => p + 1);
  };

  const renderCell = (x: number, y: number) => {
    if (grid[y] && grid[y][x]) return grid[y][x];
    if (currentPiece) {
      const relativeX = x - currentPiece.x;
      const relativeY = y - currentPiece.y;
      if (
        relativeY >= 0 && relativeY < currentPiece.shape.length && 
        relativeX >= 0 && relativeX < currentPiece.shape[0].length &&
        currentPiece.shape[relativeY][relativeX]
      ) {
        return currentPiece.color;
      }
    }
    return 'bg-slate-950/20';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black font-sans text-sci-cyan tracking-widest uppercase">Stack Overflow</h1>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Memory Dump</h3>
            
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
              <p className="text-[10px] font-mono text-sci-cyan mb-1 flex items-center">
                <Layers size={10} className="mr-1" /> CACHE_FLUSHED
              </p>
              <div className="text-3xl font-black font-mono text-white">{score.toLocaleString()}</div>
            </div>

            <button 
              onClick={resetGame}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded uppercase tracking-widest transition-all border border-slate-700 text-xs flex items-center justify-center"
            >
              <RefreshCw size={14} className="mr-2" /> Clear_Stack
            </button>
            
            <div className="grid grid-cols-3 gap-2 mt-6 md:hidden">
              <div/>
              <button onClick={() => handleAction('ROTATE')} className="bg-slate-800 p-4 rounded flex justify-center border border-slate-700 text-sci-cyan"><RotateCw size={20}/></button>
              <div/>
              <button onClick={() => handleAction('LEFT')} className="bg-slate-800 p-4 rounded flex justify-center border border-slate-700"><ArrowLeft size={20}/></button>
              <button onClick={() => handleAction('DOWN')} className="bg-slate-800 p-4 rounded flex justify-center border border-slate-700"><ArrowDown size={20}/></button>
              <button onClick={() => handleAction('RIGHT')} className="bg-slate-800 p-4 rounded flex justify-center border border-slate-700"><ArrowRight size={20}/></button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center">
              <Info size={12} className="mr-2" /> PROTOCOL COMMANDS
            </h3>
            <div className="space-y-4 text-[11px] font-mono text-slate-400">
               <div className="flex items-start">
                 <p>Stabilize the incoming data blocks by completing horizontal memory rows.</p>
               </div>
               <div className="p-3 bg-slate-950/50 rounded border border-slate-800/50">
                 <div className="grid grid-cols-2 gap-y-3">
                   <div className="text-sci-cyan">ARROWS</div><div className="text-right">MOVE</div>
                   <div className="text-sci-cyan">UP</div><div className="text-right">ROTATE</div>
                   <div className="text-sci-cyan">DOWN</div><div className="text-right">DROP</div>
                 </div>
               </div>
               <div className="flex items-start">
                 <Zap size={14} className="text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                 <p>Reward: 10 QUEST per line cleared. Keep the buffer under 20 units!</p>
               </div>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="lg:col-span-3 flex justify-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl shadow-inner relative min-h-[600px]">
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_4px,3px_100%]"></div>
          
          <div className="relative bg-slate-950 border-4 border-slate-800 rounded-lg p-1 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            {gameOver && (
              <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-500 text-center">
                <Cpu size={64} className="text-red-500 mb-6 animate-pulse" />
                <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Stack Overflow</h2>
                <p className="text-slate-400 mb-10 font-mono">Memory buffer exhausted. Final integrity: {score}</p>
                <button onClick={resetGame} className="bg-sci-cyan text-slate-950 font-black px-12 py-4 rounded uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]">Restart Pipeline</button>
              </div>
            )}
            
            <div 
              className="grid gap-[1px]"
              style={{ 
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                width: 'min(320px, 80vw)',
                height: 'min(640px, 160vw)'
              }}
            >
              {Array(ROWS).fill(0).map((_, y) => (
                Array(COLS).fill(0).map((_, x) => (
                  <div 
                    key={`${x}-${y}`} 
                    className={`w-full h-full border-[0.5px] border-slate-800/20 ${renderCell(x, y)}`}
                  />
                ))
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
