
import React, { useState, useEffect } from 'react';
import { useChain } from '../../context/ChainContext';
import { ChevronLeft, RefreshCw, Info, Radar, Battery, Target, ShieldAlert, Award } from 'lucide-react';
// Fix: Use standard named import for Link
import { Link } from 'react-router-dom';

const GRID_SIZE = 10;
const INITIAL_ENERGY = 40;

export const GridHuntGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [grid, setGrid] = useState<number[]>(Array(GRID_SIZE * GRID_SIZE).fill(0)); // 0: unknown, 1: ship, -1: miss, -2: bomb, 2: ship_found, 3: bomb_found
  const [energy, setEnergy] = useState(INITIAL_ENERGY);
  const [shipsFound, setShipsFound] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>(Array(GRID_SIZE * GRID_SIZE).fill(false));

  const totalShipSegments = 2 + 3 + 4; // Lengths of ships

  const initGame = () => {
    let newGrid = Array(GRID_SIZE * GRID_SIZE).fill(0);
    
    // Place ships
    const placeShip = (length: number) => {
      let placed = false;
      while (!placed) {
        const isHorizontal = Math.random() > 0.5;
        const x = Math.floor(Math.random() * (isHorizontal ? GRID_SIZE - length : GRID_SIZE));
        const y = Math.floor(Math.random() * (isHorizontal ? GRID_SIZE : GRID_SIZE - length));
        
        let canPlace = true;
        for (let i = 0; i < length; i++) {
          const idx = isHorizontal ? y * GRID_SIZE + (x + i) : (y + i) * GRID_SIZE + x;
          if (newGrid[idx] !== 0) canPlace = false;
        }

        if (canPlace) {
          for (let i = 0; i < length; i++) {
            const idx = isHorizontal ? y * GRID_SIZE + (x + i) : (y + i) * GRID_SIZE + x;
            newGrid[idx] = 1;
          }
          placed = true;
        }
      }
    };

    placeShip(2);
    placeShip(3);
    placeShip(4);

    // Place decoys/bombs
    let bombs = 0;
    while (bombs < 8) {
      const idx = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      if (newGrid[idx] === 0) {
        newGrid[idx] = -2;
        bombs++;
      }
    }

    setGrid(newGrid);
    setRevealed(Array(GRID_SIZE * GRID_SIZE).fill(false));
    setEnergy(INITIAL_ENERGY);
    setShipsFound(0);
    setGameOver(false);
    setWin(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleClick = (idx: number) => {
    if (gameOver || win || revealed[idx] || energy <= 0) return;

    const newRevealed = [...revealed];
    newRevealed[idx] = true;
    setRevealed(newRevealed);

    const type = grid[idx];
    let newEnergy = energy - 1;

    if (type === 1) { // Hit ship
      const found = shipsFound + 1;
      setShipsFound(found);
      if (found === totalShipSegments) {
        setWin(true);
        addGameReward(150, 'Grid Hunt Victory');
      }
    } else if (type === -2) { // Hit bomb
      newEnergy = Math.max(0, newEnergy - 5);
      if (newEnergy <= 0) setGameOver(true);
    }

    setEnergy(newEnergy);
    if (newEnergy <= 0 && shipsFound < totalShipSegments) setGameOver(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-sci-cyan tracking-widest uppercase">Grid Hunter</h1>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Scanner Stats</h3>
            
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-sci-cyan mb-1 flex items-center"><Battery size={12} className="mr-1" /> ENERGY_RESERVE</p>
                <div className="text-3xl font-black text-white">{energy}</div>
                <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                   <div className={`h-full transition-all ${energy < 10 ? 'bg-red-500 animate-pulse' : 'bg-sci-cyan'}`} style={{ width: `${(energy/INITIAL_ENERGY)*100}%` }}></div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-slate-500 mb-1 flex items-center"><Award size={12} className="mr-1" /> SALVAGE_PROGRESS</p>
                <div className="text-xl font-black text-white">{shipsFound} / {totalShipSegments}</div>
              </div>
            </div>

            <button onClick={initGame} className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-lg uppercase tracking-widest text-xs flex items-center justify-center border border-slate-700">
              <RefreshCw size={14} className="mr-2" /> Reset_Scanner
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center">
              <Info size={12} className="mr-2" /> INTEL REPORT
            </h3>
            <ul className="space-y-3 text-[11px] font-mono text-slate-400">
              <li>• Ships of lengths <span className="text-white">2, 3, and 4</span> are hidden in this sector.</li>
              <li>• Every scan consumes 1 energy point.</li>
              <li className="text-red-400">• Red <span className="font-bold">VOLATILE DECOYS</span> drain -5 energy upon impact.</li>
              <li>• Salvage all ship segments to claim 150 QUEST bounty.</li>
            </ul>
          </div>
        </div>

        {/* Main Grid Area */}
        <div className="lg:col-span-3 flex justify-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl shadow-inner relative overflow-hidden min-h-[600px]">
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_4px,3px_100%]"></div>
          
          {gameOver && (
            <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md animate-in fade-in duration-500">
              <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse" />
              <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Energy Depleted</h2>
              <p className="text-slate-400 mb-10 font-mono">Salvage mission failed. Integrity lost.</p>
              <button onClick={initGame} className="bg-white text-slate-950 font-black px-12 py-4 rounded uppercase tracking-widest transition-all hover:scale-105 active:scale-95">Re-Deploy Scanner</button>
            </div>
          )}

          {win && (
            <div className="absolute inset-0 z-20 bg-sci-bg/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md animate-in zoom-in duration-300">
              <Radar size={64} className="text-sci-cyan mb-6 animate-pulse" />
              <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Sector Secured</h2>
              <p className="text-sci-cyan mb-10 font-mono text-lg tracking-widest">+150 QUEST SALVAGED</p>
              <button onClick={initGame} className="bg-white text-slate-950 font-black px-12 py-4 rounded uppercase tracking-widest transition-all">New Sector</button>
            </div>
          )}

          <div className="grid grid-cols-10 gap-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800 shadow-2xl relative z-10 w-full max-w-lg aspect-square">
            {grid.map((type, i) => {
              const isRevealed = revealed[i];
              return (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  className={`
                    w-full h-full rounded-sm transition-all duration-150 border
                    ${!isRevealed 
                      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' 
                      : (type === 1 
                          ? 'bg-sci-cyan border-sci-cyan/50 shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse' 
                          : type === -2 
                            ? 'bg-red-500 border-red-400' 
                            : 'bg-slate-900 border-slate-800 opacity-40')
                    }
                  `}
                >
                  {isRevealed && type === 1 && <Target size={14} className="text-white mx-auto" />}
                  {isRevealed && type === -2 && <ShieldAlert size={14} className="text-white mx-auto" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
