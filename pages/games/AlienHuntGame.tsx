import React, { useRef, useEffect, useState } from 'react';
import { useChain } from '../../context/ChainContext';
import { Link } from 'react-router-dom';
import { ChevronLeft, Crosshair, Zap, ArrowLeft, ArrowRight, MousePointer2, Info, Target, RefreshCw, Shield, Lock, Keyboard } from 'lucide-react';

type Difficulty = 'NOOBIE' | 'CADET' | 'MAJOR';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  type: 'SPARK' | 'GLOW' | 'SMOKE';
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
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
  pulse: number;
}

const AlienHuntInstance: React.FC<{ 
  onGameOver: (score: number) => void, 
  health: number, 
  setHealth: (h: number) => void,
  externalMoveDir: 'LEFT' | 'RIGHT' | null,
  externalFire: boolean,
  difficulty: Difficulty
}> = ({ onGameOver, health, setHealth, externalMoveDir, externalFire, difficulty }) => {
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
    playerVelocity: 0,
    screenShake: 0,
    keys: {} as Record<string, boolean>
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
      size: Math.random() * 2 + 0.5,
      speed: 0.5 + Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.8
    }));

    const spawnEnemy = () => {
      const state = stateRef.current;
      const size = 22 + Math.random() * 22;
      const baseSpeed = difficulty === 'NOOBIE' ? 1.5 : difficulty === 'CADET' ? 2.5 : 4.5;
      
      state.enemies.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: -60,
        size,
        hp: Math.ceil(size / (difficulty === 'MAJOR' ? 7 : 12)),
        speed: baseSpeed + Math.random() * 2 + (state.score * 0.00005),
        color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        spikes: 3 + Math.floor(Math.random() * 5),
        pulse: 0
      });
    };

    const createExplosion = (x: number, y: number, color: string, count = 20) => {
      for (let i = 0; i < count; i++) {
        const typeRoll = Math.random();
        stateRef.current.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12,
          life: 1.0,
          color,
          size: Math.random() * 4 + 1,
          type: typeRoll > 0.8 ? 'GLOW' : typeRoll > 0.4 ? 'SPARK' : 'SMOKE'
        });
      }
    };

    const fireLaser = () => {
      const state = stateRef.current;
      const now = Date.now();
      const fireRate = difficulty === 'MAJOR' ? 75 : 120;
      if (now - state.lastFire < fireRate) return;
      state.lastFire = now;
      state.muzzleFlash = 5;
      
      if (difficulty === 'MAJOR') {
        state.projectiles.push({ x: state.playerX - 20, y: canvas.height - 85, color: '#06b6d4' });
        state.projectiles.push({ x: state.playerX + 20, y: canvas.height - 85, color: '#06b6d4' });
      } else {
        state.projectiles.push({ x: state.playerX, y: canvas.height - 90, color: '#06b6d4' });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => { stateRef.current.keys[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { stateRef.current.keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId: number;
    const update = () => {
      const state = stateRef.current;
      if (state.gameOver) return;

      const isLeft = state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A'] || externalMoveDir === 'LEFT';
      const isRight = state.keys['ArrowRight'] || state.keys['d'] || state.keys['D'] || externalMoveDir === 'RIGHT';
      const isFiring = state.keys[' '] || state.keys['Enter'] || externalFire;

      if (isLeft) state.playerVelocity = -15;
      else if (isRight) state.playerVelocity = 15;
      else state.playerVelocity *= 0.8;
      
      state.playerX += state.playerVelocity;
      state.playerX = Math.max(45, Math.min(canvas.width - 45, state.playerX));

      if (isFiring) fireLaser();

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      state.stars.forEach(s => {
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.beginPath();
        ctx.rect(s.x, s.y, s.size, s.size * (1 + s.speed / 2));
        ctx.fill();
      });

      ctx.save();
      if (state.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * state.screenShake * 15, (Math.random() - 0.5) * state.screenShake * 15);
        state.screenShake *= 0.85;
      }

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) { state.particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.type === 'GLOW') {
          ctx.shadowBlur = 15; ctx.shadowColor = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1.0;

      const drawShip = (x: number, y: number) => {
        ctx.save();
        ctx.translate(x, y);
        
        const tPulse = Math.sin(state.frameCount * 0.5) * 6;
        const grad = ctx.createLinearGradient(0, 20, 0, 40 + tPulse);
        grad.addColorStop(0, '#06b6d4'); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(-15, 20, 7, 15 + tPulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(15, 20, 7, 15 + tPulse, 0, 0, Math.PI * 2); ctx.fill();

        ctx.shadowBlur = 15; ctx.shadowColor = '#06b6d4';
        ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2;
        
        ctx.beginPath(); ctx.moveTo(-35, 10); ctx.lineTo(-10, -15); ctx.lineTo(10, -15); ctx.lineTo(35, 10); ctx.lineTo(30, 25); ctx.lineTo(-30, 25); ctx.closePath();
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-10, 5); ctx.lineTo(10, 5); ctx.closePath(); ctx.fill();

        if (state.muzzleFlash > 0) {
          ctx.fillStyle = '#fff'; ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 20;
          ctx.beginPath(); ctx.arc(0, -40, 10 * (state.muzzleFlash / 5), 0, Math.PI * 2); ctx.fill();
          state.muzzleFlash--;
        }
        ctx.restore();
      };
      drawShip(state.playerX, canvas.height - 70);

      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.y -= 25;
        ctx.shadowBlur = 10; ctx.shadowColor = p.color;
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x - 1.5, p.y, 3, 25);
        if (p.y < -50) state.projectiles.splice(i, 1);
      }

      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        e.y += e.speed;
        e.rotation += 0.04;
        e.pulse = Math.sin(state.frameCount * 0.1) * 3;

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation);
        ctx.shadowBlur = 15; ctx.shadowColor = e.color;
        
        ctx.beginPath();
        const outer = e.size + e.pulse;
        const inner = e.size / 2.5;
        for (let j = 0; j < e.spikes * 2; j++) {
          const r = j % 2 === 0 ? outer : inner;
          const a = (j / (e.spikes * 2)) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle = e.color; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        
        ctx.beginPath(); ctx.arc(0, 0, inner / 1.2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();

        const dxP = e.x - state.playerX;
        const dyP = e.y - (canvas.height - 70);
        if (Math.sqrt(dxP*dxP + dyP*dyP) < e.size + 25) {
          const dmg = difficulty === 'MAJOR' ? 40 : 25;
          state.health -= dmg;
          state.screenShake = 1.0;
          setHealth(Math.max(0, state.health));
          createExplosion(e.x, e.y, e.color, 35);
          state.enemies.splice(i, 1);
          if (state.health <= 0) { state.gameOver = true; onGameOver(state.score); }
          continue;
        }

        for (let j = state.projectiles.length - 1; j >= 0; j--) {
          const p = state.projectiles[j];
          const dxL = p.x - e.x;
          const dyL = p.y - e.y;
          if (Math.sqrt(dxL*dxL + dyL*dyL) < e.size + 10) {
            e.hp--;
            createExplosion(p.x, p.y, '#fff', 5);
            state.projectiles.splice(j, 1);
            if (e.hp <= 0) {
              createExplosion(e.x, e.y, e.color, 25);
              state.enemies.splice(i, 1);
              state.score += difficulty === 'MAJOR' ? 500 : difficulty === 'CADET' ? 200 : 100;
              break;
            }
          }
        }

        if (e.y > canvas.height + 60) {
          state.health -= 10;
          setHealth(Math.max(0, state.health));
          state.enemies.splice(i, 1);
          if (state.health <= 0) { state.gameOver = true; onGameOver(state.score); }
        }
      }

      state.frameCount++;
      const spawnThresh = difficulty === 'MAJOR' ? 20 : difficulty === 'CADET' ? 45 : 75;
      if (state.frameCount % Math.max(10, spawnThresh - Math.floor(state.score / 10000)) === 0) spawnEnemy();

      ctx.restore();
      animationId = requestAnimationFrame(update);
    };

    update();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onGameOver, setHealth, externalMoveDir, externalFire, difficulty]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={900}
      className="bg-slate-950 max-w-full rounded-xl shadow-2xl cursor-none border-2 border-slate-800 touch-none"
      onMouseMove={(e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const scaleX = canvasRef.current!.width / rect.width;
          stateRef.current.playerX = (e.clientX - rect.left) * scaleX;
        }
      }}
    />
  );
};

export const AlienHuntGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [difficulty, setDifficulty] = useState<Difficulty>('CADET');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  
  const [moveDir, setMoveDir] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [extFire, setExtFire] = useState(false);

  const startDeployment = () => {
    setGameOver(false);
    setScore(0);
    setHealth(100);
    setGameStarted(true);
    setGameKey(prev => prev + 1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-sci-cyan tracking-widest uppercase">Void Defender</h1>
          <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Tactical Data</h3>
              {gameStarted && <div className="text-orange-500 text-[8px] font-black animate-pulse flex items-center"><Lock size={8} className="mr-1" /> LOCKED</div>}
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-sci-cyan mb-1 uppercase tracking-widest flex items-center">
                  <Shield size={10} className="mr-1" /> Integrity
                </p>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
                  <div className={`h-full transition-all duration-500 ${health > 50 ? 'bg-sci-cyan' : 'bg-red-500'}`} style={{ width: `${health}%` }}></div>
                </div>
              </div>

              <div className={`bg-slate-950 p-4 rounded border ${gameStarted ? 'border-orange-500/20 opacity-50 pointer-events-none' : 'border-slate-800'}`}>
                <p className="text-[10px] font-mono text-slate-500 mb-1">DEFENSE_CADRE</p>
                <div className="flex bg-slate-900 p-1 rounded-lg">
                  {(['NOOBIE', 'CADET', 'MAJOR'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-1 text-[8px] font-black rounded uppercase transition ${difficulty === d ? 'bg-sci-cyan text-slate-950' : 'text-slate-500'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <p className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-widest">Bounty Credits</p>
                <div className="text-2xl font-black font-mono text-white tracking-tighter">{score.toLocaleString()}</div>
              </div>
            </div>
            
            {gameStarted && (
              <button onClick={() => {setGameStarted(false); setGameOver(false);}} className="w-full mt-6 bg-red-950/20 text-red-500 border border-red-500/30 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                Abort Mission
              </button>
            )}
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center"><Keyboard size={12} className="mr-2" /> COMMANDS</h3>
            <div className="space-y-3 text-[10px] font-mono text-slate-500">
              <div className="flex justify-between"><span>MOVE</span><span className="text-white">WASD / ARROWS</span></div>
              <div className="flex justify-between"><span>FIRE</span><span className="text-white">SPACE / TAP</span></div>
              <div className="flex justify-between"><span>BOUNTY</span><span className="text-white">1 Q / 50 PTS</span></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col items-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl relative min-h-[600px]">
          <div className="relative rounded-xl overflow-hidden border-4 border-slate-800 bg-slate-950 w-full flex items-center justify-center min-h-[500px]">
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-12 text-center backdrop-blur-md">
                 <Crosshair size={80} className="text-sci-cyan mb-8 animate-pulse-slow" />
                 <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Pre-Flight Check</h2>
                 <p className="text-slate-400 mb-10 font-mono text-sm max-w-sm">Select Rank to calibrate drone systems. Deployment locks parameters for the mission duration.</p>
                 <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-12">
                    {(['NOOBIE', 'CADET', 'MAJOR'] as Difficulty[]).map(d => (
                      <button key={d} onClick={() => setDifficulty(d)} className={`p-4 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all ${difficulty === d ? 'bg-sci-cyan border-white text-slate-900 scale-105' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>{d}</button>
                    ))}
                 </div>
                 <button onClick={startDeployment} className="bg-white text-slate-950 font-black px-16 py-6 rounded-full uppercase tracking-widest transition-all hover:bg-sci-cyan active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] text-xl flex items-center"><Zap size={24} className="mr-3 fill-current" /> Deploy Drone</button>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300 backdrop-blur-md">
                <Target size={80} className="text-red-500 mb-6 animate-pulse" />
                <h2 className="text-6xl font-black text-white mb-2 uppercase tracking-tighter">Drone Offline</h2>
                <p className="text-slate-400 mb-12 font-mono text-xl uppercase">Total Bounty: {score}</p>
                <div className="flex gap-4">
                  <button onClick={startDeployment} className="bg-sci-cyan text-slate-950 font-black px-12 py-5 rounded-full uppercase tracking-widest transition-all shadow-lg text-lg flex items-center justify-center"><RefreshCw size={24} className="mr-3" /> Re-Deploy</button>
                  <button onClick={() => { setGameOver(false); setGameStarted(false); }} className="bg-slate-800 text-white font-black px-12 py-5 rounded-full uppercase tracking-widest hover:bg-slate-700 text-lg">Hangar</button>
                </div>
              </div>
            )}
            
            {gameStarted && (
              <AlienHuntInstance 
                key={gameKey} 
                health={health} setHealth={setHealth}
                externalMoveDir={moveDir} externalFire={extFire}
                difficulty={difficulty}
                onGameOver={(f) => { setScore(f); setGameOver(true); setGameStarted(false); if (f >= 500) addGameReward(f / 50, 'Void Defender'); }} 
              />
            )}
          </div>

          <div className="w-full grid grid-cols-4 gap-4 lg:hidden mt-8 relative z-10">
            <button onPointerDown={(e) => { e.preventDefault(); setMoveDir('LEFT'); }} onPointerUp={(e) => { e.preventDefault(); setMoveDir(null); }} onPointerLeave={(e) => { e.preventDefault(); setMoveDir(null); }} className={`col-span-1 bg-slate-900 border-2 border-slate-700 p-8 rounded-2xl active:bg-sci-cyan active:text-slate-950 flex justify-center items-center touch-none transition-all ${!gameStarted ? 'opacity-20' : ''}`} disabled={!gameStarted}><ArrowLeft size={48} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); setExtFire(true); }} onPointerUp={(e) => { e.preventDefault(); setExtFire(false); }} onPointerLeave={(e) => { e.preventDefault(); setExtFire(false); }} className={`col-span-2 bg-red-950/20 border-2 border-red-500 text-red-500 p-8 rounded-2xl active:bg-red-500 active:text-white flex justify-center items-center touch-none font-black text-2xl transition-all ${!gameStarted ? 'opacity-20' : ''}`} disabled={!gameStarted}><Zap size={36} fill="currentColor" className="mr-2" /> DISCHARGE</button>
            <button onPointerDown={(e) => { e.preventDefault(); setMoveDir('RIGHT'); }} onPointerUp={(e) => { e.preventDefault(); setMoveDir(null); }} onPointerLeave={(e) => { e.preventDefault(); setMoveDir(null); }} className={`col-span-1 bg-slate-900 border-2 border-slate-700 p-8 rounded-2xl active:bg-sci-cyan active:text-slate-950 flex justify-center items-center touch-none transition-all ${!gameStarted ? 'opacity-20' : ''}`} disabled={!gameStarted}><ArrowRight size={48} /></button>
          </div>
          
          <div className="hidden lg:flex items-center space-x-3 text-slate-500 text-[10px] font-mono bg-slate-900/50 px-6 py-3 rounded-full border border-slate-800 mt-8 relative z-10">
             <MousePointer2 size={12} className="text-sci-cyan" />
             <span>Mouse or Keyboard [WASD] to guide drone. Space to discharge. Clear entities to protect integrity.</span>
          </div>
        </div>
      </div>
    </div>
  );
};