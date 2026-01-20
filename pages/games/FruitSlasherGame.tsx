import React, { useRef, useEffect, useState } from 'react';
import { useChain } from '../../context/ChainContext';
import { ChevronLeft, RefreshCw, Scissors, Info, Activity, ShieldAlert, Cpu, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type: 'DATA' | 'VIRUS';
  sliced: boolean;
}

const GameInstance: React.FC<{ onGameOver: (score: number) => void, addGameReward: any }> = ({ onGameOver, addGameReward }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const livesRef = useRef(3);
  const mousePos = useRef({ x: 0, y: 0 });
  const isMouseDown = useRef(false);
  const trailRef = useRef<{x: number, y: number}[]>([]);
  const sparksRef = useRef<{x: number, y: number, vx: number, vy: number, life: number, color: string}[]>([]);
  const [localScore, setLocalScore] = useState(0);
  const [localLives, setLocalLives] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let spawnRate = 60;
    let frameCount = 0;

    const spawnEntity = () => {
      const type = Math.random() > 0.85 ? 'VIRUS' : 'DATA';
      const radius = 25;
      const x = Math.random() * (canvas.width - 100) + 50;
      const y = canvas.height + radius;
      const vx = (canvas.width / 2 - x) * 0.01 + (Math.random() - 0.5) * 4;
      const vy = -(Math.random() * 6 + 12); 

      entitiesRef.current.push({
        id: Math.random(),
        x, y, vx, vy, radius,
        type,
        color: type === 'DATA' ? '#06b6d4' : '#ef4444',
        sliced: false
      });
    };

    const createSparks = (x: number, y: number, color: string) => {
      for (let i = 0; i < 8; i++) {
        sparksRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 1.0,
          color
        });
      }
    };

    const update = () => {
      if (gameOverRef.current) return;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 1;
      for(let i=0; i<canvas.height; i+=40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }
      for(let i=0; i<canvas.width; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }

      // Trail
      if (isMouseDown.current) {
        trailRef.current.push({ ...mousePos.current });
        if (trailRef.current.length > 15) trailRef.current.shift();
        
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#06b6d4';
        
        if(trailRef.current.length > 1) {
            ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
            for(let i = 1; i < trailRef.current.length; i++) {
              ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
      } else {
        trailRef.current = [];
      }

      // Sparks
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const s = sparksRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.04;
        if (s.life <= 0) {
          sparksRef.current.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, 3, 3);
      }
      ctx.globalAlpha = 1.0;

      // Entities
      for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
        let e = entitiesRef.current[i];
        e.x += e.vx;
        e.y += e.vy;
        e.vy += 0.22;

        if (!e.sliced && isMouseDown.current && trailRef.current.length > 1) {
            const dx = mousePos.current.x - e.x;
            const dy = mousePos.current.y - e.y;
            if (Math.sqrt(dx*dx + dy*dy) < e.radius + 15) {
                e.sliced = true;
                createSparks(e.x, e.y, e.color);
                if (e.type === 'DATA') {
                    scoreRef.current += 10;
                    setLocalScore(scoreRef.current);
                    if (scoreRef.current % 100 === 0) addGameReward(10, 'Data Slicer');
                } else {
                    livesRef.current -= 1;
                    setLocalLives(livesRef.current);
                    if (livesRef.current <= 0) {
                        gameOverRef.current = true;
                        onGameOver(scoreRef.current);
                    }
                }
            }
        }

        if (!e.sliced) {
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(frameCount * 0.05);
            ctx.shadowBlur = 15;
            ctx.shadowColor = e.color;
            ctx.beginPath();
            if(e.type === 'DATA') {
                ctx.rect(-e.radius, -e.radius, e.radius*2, e.radius*2);
            } else {
                ctx.moveTo(0, -e.radius);
                ctx.lineTo(e.radius, e.radius);
                ctx.lineTo(-e.radius, e.radius);
                ctx.closePath();
            }
            ctx.fillStyle = e.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(e.type === 'DATA' ? '101' : 'ERR', e.x, e.y + 5);
        } else {
            ctx.fillStyle = e.color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(e.x - 20, e.y, e.radius/1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(e.x + 20, e.y, e.radius/1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            e.radius -= 1.5;
        }

        if (e.y > canvas.height + 60 || e.radius <= 0) {
            entitiesRef.current.splice(i, 1);
        }
      }

      frameCount++;
      if (frameCount % spawnRate === 0) {
        spawnEntity();
        if (spawnRate > 18) spawnRate--;
      }

      animationId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationId);
  }, [onGameOver, addGameReward]);

  const updatePos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePos.current = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="bg-slate-950 touch-none max-w-full rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-slate-800 cursor-crosshair"
        onMouseMove={(e) => updatePos(e.clientX, e.clientY)}
        onMouseDown={(e) => {
          isMouseDown.current = true;
          updatePos(e.clientX, e.clientY);
        }}
        onMouseUp={() => isMouseDown.current = false}
        onMouseLeave={() => isMouseDown.current = false}
        onTouchStart={(e) => {
          e.preventDefault();
          isMouseDown.current = true;
          updatePos(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          isMouseDown.current = false;
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          updatePos(e.touches[0].clientX, e.touches[0].clientY);
        }}
      />
    </div>
  );
};

export const FruitSlasherGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameKey, setGameKey] = useState(0);

  const resetGame = () => {
    setGameOver(false);
    setScore(0);
    setLives(3);
    setGameKey(prev => prev + 1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black font-sans text-sci-cyan tracking-widest uppercase">Data Slicer</h1>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Protocol Status</h3>
            
            <div className="space-y-4">
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-sci-cyan mb-1">PROCESSED_DATA</p>
                <div className="text-3xl font-black font-mono text-white tracking-tighter">{score}</div>
              </div>
              
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-slate-500 mb-1">INTEGRITY_SHIELD</p>
                <div className="flex gap-1 text-red-500">
                  {Array(3).fill(0).map((_, i) => (
                    <Activity key={i} size={16} fill={i < lives ? "currentColor" : "none"} className={i < lives ? "" : "opacity-20"} />
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={resetGame}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded uppercase tracking-widest transition-all border border-slate-700 text-xs flex items-center justify-center"
            >
              <RefreshCw size={14} className="mr-2" /> Reboot_Link
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center">
              <Info size={12} className="mr-2" /> DATA PROCESSING
            </h3>
            <ul className="space-y-3 text-[11px] font-mono text-slate-400">
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">01.</span> Slice through cyan <span className="text-sci-cyan font-bold">DATA PACKETS</span> to earn points.
              </li>
              <li className="flex items-start text-red-400">
                <span className="mr-2">02.</span> Avoid red <span className="font-bold">VIRUS ERRORS</span>. Three hits will sever the connection.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">03.</span> Earn 10 QUEST for every 100 processing points.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">04.</span> Use mouse or touch to drag and slice in rapid motions.
              </li>
            </ul>
          </div>
        </div>

        {/* Game Area */}
        <div className="lg:col-span-3 flex justify-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl shadow-inner relative min-h-[500px]">
          {gameOver && (
            <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center backdrop-blur-md rounded-xl p-8 text-center animate-in zoom-in duration-300">
              <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse" />
              <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter">Connection Severed</h2>
              <p className="text-slate-400 mb-10 font-mono text-lg">Total Data Processed: {score} packets</p>
              <button 
                onClick={resetGame} 
                className="bg-sci-cyan text-slate-950 font-black px-12 py-4 rounded uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                Restore Signal
              </button>
            </div>
          )}
          <GameInstance 
            key={gameKey} 
            onGameOver={(s) => { setScore(s); setGameOver(true); }} 
            addGameReward={addGameReward} 
          />
        </div>
      </div>
    </div>
  );
};
