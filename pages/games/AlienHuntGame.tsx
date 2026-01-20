import React, { useRef, useEffect, useState } from 'react';
import { useChain } from '../../context/ChainContext';
// Add RefreshCw to the imports from lucide-react
import { ChevronLeft, Crosshair, Shield, Zap, ArrowLeft, ArrowRight, MousePointer2, Info, Activity, Target, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  speed: number;
  size: number;
  hp: number;
  color: string;
  rotation: number;
  spikes: number;
}

const AlienHuntInstance: React.FC<{ 
  onGameOver: (score: number) => void, 
  health: number, 
  setHealth: (h: number) => void,
  externalMoveDir: 'LEFT' | 'RIGHT' | null,
  externalFire: boolean
}> = ({ onGameOver, health, setHealth, externalMoveDir, externalFire }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    playerX: 400,
    projectiles: [] as { x: number, y: number, color: string }[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    stars: [] as Star[],
    muzzleFlash: 0,
    score: 0,
    gameOver: false,
    frameCount: 0,
    health: 100,
    lastFire: 0,
    playerVelocity: 0
  });

  const ENEMY_COLORS = ['#22c55e', '#a855f7', '#f97316', '#eab308', '#06b6d4', '#f43f5e'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    stateRef.current.stars = Array(150).fill(0).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: 1 + Math.random() * 3
    }));

    const spawnEnemy = () => {
      const state = stateRef.current;
      const size = 30 + Math.random() * 30;
      state.enemies.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: -60,
        size,
        hp: Math.ceil(size / 10),
        speed: 2 + Math.random() * 3.5 + (state.score * 0.0003),
        color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
        rotation: 0,
        spikes: 5 + Math.floor(Math.random() * 6)
      });
    };

    const drawSpikyStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fill();
      
      // Add a center glow
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius/2, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    };

    const createExplosion = (x: number, y: number, color: string, count = 15) => {
      for (let i = 0; i < count; i++) {
        stateRef.current.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          life: 1.0,
          color
        });
      }
    };

    const fireLaser = () => {
      const state = stateRef.current;
      const now = Date.now();
      if (now - state.lastFire < 110) return;
      state.lastFire = now;
      state.muzzleFlash = 4;
      state.projectiles.push({ x: state.playerX, y: canvas.height - 80, color: '#f43f5e' });
    };

    let animationId: number;
    const update = () => {
      const state = stateRef.current;
      if (state.gameOver) return;

      if (externalMoveDir === 'LEFT') {
        state.playerVelocity = -10;
      } else if (externalMoveDir === 'RIGHT') {
        state.playerVelocity = 10;
      } else {
        state.playerVelocity *= 0.85;
      }
      
      state.playerX += state.playerVelocity;
      state.playerX = Math.max(40, Math.min(canvas.width - 40, state.playerX));

      if (externalFire) {
        fireLaser();
      }

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      state.stars.forEach(s => {
        s.y += s.speed;
        if (s.y > canvas.height) {
          s.y = 0;
          s.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1.0;

      const drawShip = (x: number, y: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#06b6d4';
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(-30, 15);
        ctx.lineTo(30, 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(-20, 10);
        ctx.lineTo(20, 10);
        ctx.closePath();
        ctx.fill();

        if (state.muzzleFlash > 0) {
          ctx.shadowColor = '#f43f5e';
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(0, -45, 20 * (state.muzzleFlash/4), 0, Math.PI*2);
          ctx.fill();
          state.muzzleFlash--;
        }
        ctx.restore();
      };
      drawShip(state.playerX, canvas.height - 60);

      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.y -= 20;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - 2, p.y, 4, 25);
        ctx.shadowBlur = 0;
        if (p.y < 0) state.projectiles.splice(i, 1);
      }

      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        e.y += e.speed;
        e.rotation += 0.05;

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation);
        ctx.shadowBlur = 20;
        ctx.shadowColor = e.color;
        drawSpikyStar(0, 0, e.spikes, e.size, e.size / 2.5, e.color);
        ctx.restore();

        const dxP = e.x - state.playerX;
        const dyP = e.y - (canvas.height - 60);
        const distP = Math.sqrt(dxP*dxP + dyP*dyP);
        if (distP < e.size + 20) {
          state.health -= 20;
          setHealth(state.health);
          createExplosion(e.x, e.y, e.color, 40);
          state.enemies.splice(i, 1);
          if (state.health <= 0) {
             state.gameOver = true;
             onGameOver(state.score);
          }
          continue;
        }

        for (let j = state.projectiles.length - 1; j >= 0; j--) {
          const p = state.projectiles[j];
          const dxL = p.x - e.x;
          const dyL = p.y - e.y;
          const distL = Math.sqrt(dxL*dxL + dyL*dyL);
          if (distL < e.size + 8) {
            e.hp--;
            createExplosion(p.x, p.y, '#ffffff', 6);
            state.projectiles.splice(j, 1);
            if (e.hp <= 0) {
              createExplosion(e.x, e.y, e.color, 30);
              state.enemies.splice(i, 1);
              state.score += 200;
              break;
            }
          }
        }

        if (e.y > canvas.height + 60) {
          state.health -= 10;
          setHealth(state.health);
          state.enemies.splice(i, 1);
          if (state.health <= 0) {
             state.gameOver = true;
             onGameOver(state.score);
          }
        }
      }

      state.frameCount++;
      if (state.frameCount % Math.max(10, 50 - Math.floor(state.score / 3000)) === 0) spawnEnemy();

      animationId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationId);
  }, [onGameOver, setHealth, externalMoveDir, externalFire]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleX = canvasRef.current!.width / rect.width;
      stateRef.current.playerX = (e.clientX - rect.left) * scaleX;
    }
  };

  const handleClick = () => {
    if (stateRef.current.gameOver) return;
    const now = Date.now();
    if (now - stateRef.current.lastFire < 110) return;
    stateRef.current.lastFire = now;
    stateRef.current.muzzleFlash = 4;
    stateRef.current.projectiles.push({ x: stateRef.current.playerX, y: canvasRef.current!.height - 80, color: '#f43f5e' });
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={900}
      className="bg-slate-950 max-w-full rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] cursor-none border-2 border-slate-800"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
};

export const AlienHuntGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  
  const [moveDir, setMoveDir] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [extFire, setExtFire] = useState(false);

  const resetGame = () => {
    setGameOver(false);
    setScore(0);
    setHealth(100);
    setMoveDir(null);
    setExtFire(false);
    setGameKey(prev => prev + 1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black font-sans text-sci-cyan tracking-widest uppercase">Void Defender</h1>
          <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Tactical Data</h3>
            
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-sci-cyan mb-1 flex items-center">
                  <Shield size={10} className="mr-1" /> HULL_INTEGRITY
                </p>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-1">
                  <div 
                    className={`h-full transition-all duration-500 ${health > 50 ? 'bg-sci-cyan' : health > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${health}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-slate-500 mb-1 flex items-center">
                  <Target size={10} className="mr-1" /> BOUNTY_CREDITS
                </p>
                <div className="text-2xl font-black font-mono text-white tracking-tighter leading-none">{score.toLocaleString()}</div>
              </div>
            </div>

            <button 
              onClick={resetGame}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded uppercase tracking-widest transition-all border border-slate-700 text-xs flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.3)]"
            >
              <RefreshCw size={14} className="mr-2" /> Reboot_Drone
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center">
              <Info size={12} className="mr-2" /> ENGAGEMENT PROTOCOLS
            </h3>
            <ul className="space-y-3 text-[11px] font-mono text-slate-400">
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">01.</span> Use cursor to guide the defense drone. Tap to fire lasers.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">02.</span> Neutralize spiky <span className="text-sci-cyan font-bold">VOID ENTITIES</span> for bounty rewards.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">03.</span> Entities that breach the perimeter will drain hull integrity.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">04.</span> Reward: Earn 1 QUEST for every 50 bounty points processed.
              </li>
            </ul>
          </div>
        </div>

        {/* Game Area */}
        <div className="lg:col-span-3 flex flex-col items-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl shadow-inner relative min-h-[600px]">
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_4px,3px_100%]"></div>
          
          <div className="relative rounded-xl overflow-hidden border-4 border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.7)] bg-slate-950">
            {gameOver && (
              <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300 backdrop-blur-md">
                <Crosshair size={80} className="text-red-500 mb-6 animate-pulse" />
                <h2 className="text-6xl font-black text-white mb-2 uppercase tracking-tighter">Drone Offline</h2>
                <p className="text-slate-400 mb-12 font-mono text-xl tracking-widest">Total Bounty Processed: {score}</p>
                <button 
                  onClick={resetGame} 
                  className="bg-sci-cyan text-slate-950 font-black px-16 py-6 rounded uppercase tracking-widest transition-all hover:bg-white active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.5)] text-lg"
                >
                  Re-Deploy Drone
                </button>
              </div>
            )}
            
            <AlienHuntInstance 
              key={gameKey} 
              health={health}
              setHealth={setHealth}
              externalMoveDir={moveDir}
              externalFire={extFire}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setGameOver(true);
                if (finalScore >= 500) addGameReward(finalScore / 50, 'Void Defender');
              }} 
            />
          </div>

          <div className="w-full grid grid-cols-4 gap-4 md:hidden mt-8 relative z-10">
            <button 
              onPointerDown={(e) => { e.preventDefault(); setMoveDir('LEFT'); }}
              onPointerUp={(e) => { e.preventDefault(); setMoveDir(null); }}
              onPointerLeave={(e) => { e.preventDefault(); setMoveDir(null); }}
              className="col-span-1 bg-slate-900 border border-slate-700 p-8 rounded-2xl active:bg-sci-cyan active:text-slate-950 flex justify-center items-center touch-none shadow-lg"
            >
              <ArrowLeft size={40} />
            </button>
            
            <button 
              onPointerDown={(e) => { e.preventDefault(); setExtFire(true); }}
              onPointerUp={(e) => { e.preventDefault(); setExtFire(false); }}
              className="col-span-2 bg-red-950/20 border-2 border-red-500 text-red-500 p-8 rounded-2xl active:bg-red-500 active:text-white flex justify-center items-center touch-none shadow-[0_0_20px_rgba(239,68,68,0.3)] font-black text-xl"
            >
              <Zap size={32} fill="currentColor" className="mr-2" /> FIRE
            </button>

            <button 
              onPointerDown={(e) => { e.preventDefault(); setMoveDir('RIGHT'); }}
              onPointerUp={(e) => { e.preventDefault(); setMoveDir(null); }}
              onPointerLeave={(e) => { e.preventDefault(); setMoveDir(null); }}
              className="col-span-1 bg-slate-900 border border-slate-700 p-8 rounded-2xl active:bg-sci-cyan active:text-slate-950 flex justify-center items-center touch-none shadow-lg"
            >
              <ArrowRight size={40} />
            </button>
          </div>
          
          <div className="hidden lg:flex items-center space-x-3 text-slate-500 text-[10px] font-mono bg-slate-900/50 px-6 py-3 rounded-full border border-slate-800 mt-8 relative z-10">
             <MousePointer2 size={12} className="text-sci-cyan" />
             <span>Move cursor to guide defense drone. Tap to discharge lasers. Clear the entities to protect the perimeter.</span>
          </div>
        </div>
      </div>
    </div>
  );
};