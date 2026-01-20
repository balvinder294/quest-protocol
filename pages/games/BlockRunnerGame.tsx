import React, { useRef, useEffect, useState } from 'react';
import { useChain } from '../../context/ChainContext';
import { ChevronLeft, RefreshCw, Activity, Info, Zap, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const GameInstance: React.FC<{ onGameOver: (score: number) => void }> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    playerX: 400,
    lanes: [200, 400, 600],
    currentLane: 1,
    obstacles: [] as { x: number, y: number, type: number, color: string }[],
    speed: 6,
    score: 0,
    gameOver: false,
    frameCount: 0,
    bgOffset: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const update = () => {
      const state = stateRef.current;
      if (state.gameOver) return;

      // Deep Space background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Motion Lines
      state.bgOffset = (state.bgOffset + state.speed) % 80;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
      ctx.lineWidth = 1;
      for(let i=state.bgOffset; i<canvas.height; i+=80) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      // Lanes
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 20]);
      ctx.beginPath();
      ctx.moveTo(canvas.width/3, 0); ctx.lineTo(canvas.width/3, canvas.height);
      ctx.moveTo(2*canvas.width/3, 0); ctx.lineTo(2*canvas.width/3, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Smooth lane movement
      const targetX = state.lanes[state.currentLane];
      state.playerX += (targetX - state.playerX) * 0.2;

      // Player
      ctx.save();
      ctx.translate(state.playerX, canvas.height - 100);
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(-25, 20);
      ctx.lineTo(25, 20);
      ctx.closePath();
      ctx.fill();
      
      // Engine exhaust
      ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 25, 10 + Math.random() * 5, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // Obstacles
      state.frameCount++;
      if (state.frameCount % Math.max(15, 45 - Math.floor(state.score/1000)) === 0) {
         const lane = Math.floor(Math.random() * 3);
         const type = Math.random() > 0.9 ? 2 : 1;
         state.obstacles.push({
             x: state.lanes[lane],
             y: -60,
             type,
             color: type === 1 ? '#ef4444' : '#eab308'
         });
      }

      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        obs.y += state.speed;

        ctx.shadowBlur = 15;
        ctx.shadowColor = obs.color;
        ctx.fillStyle = obs.color;
        
        if (obs.type === 1) {
            ctx.fillRect(obs.x - 30, obs.y - 30, 60, 60);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x - 30, obs.y - 30, 60, 60);
        } else {
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, 20, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Collision
        if (obs.y > canvas.height - 140 && obs.y < canvas.height - 60) {
            if (Math.abs(obs.x - state.playerX) < 45) {
                if (obs.type === 1) {
                    state.gameOver = true;
                    onGameOver(Math.floor(state.score));
                } else {
                    state.score += 150;
                    state.obstacles.splice(i, 1);
                    continue;
                }
            }
        }

        if (obs.y > canvas.height + 60) {
            state.obstacles.splice(i, 1);
            state.score += 20;
        }
      }

      state.speed = 6 + state.score * 0.0005;
      animationId = requestAnimationFrame(update);
    };

    update();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.gameOver) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (stateRef.current.currentLane > 0) stateRef.current.currentLane--;
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        if (stateRef.current.currentLane < 2) stateRef.current.currentLane++;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onGameOver]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={800}
      className="bg-slate-950 max-w-full rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-slate-800"
    />
  );
};

export const BlockRunnerGame: React.FC = () => {
  const { addGameReward } = useChain();
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const resetGame = () => {
    setGameOver(false);
    setScore(0);
    setGameKey(prev => prev + 1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black font-sans text-sci-cyan tracking-widest uppercase">Cyber Run</h1>
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent"></div>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Uplink Telemetry</h3>
            
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
              <p className="text-[10px] font-mono text-sci-cyan mb-1">DISTANCE_TRAVELED</p>
              <div className="text-3xl font-black font-mono text-white tracking-tighter">{score.toLocaleString()}m</div>
            </div>

            <button 
              onClick={resetGame}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded uppercase tracking-widest transition-all border border-slate-700 text-xs flex items-center justify-center"
            >
              <RefreshCw size={14} className="mr-2" /> Reboot_Runner
            </button>
            
            <div className="grid grid-cols-2 gap-3 mt-6 lg:hidden">
              <button className="bg-slate-800 p-6 rounded text-white border border-slate-700 flex justify-center" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowLeft'}))}><ArrowLeft/></button>
              <button className="bg-slate-800 p-6 rounded text-white border border-slate-700 flex justify-center" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', {'key': 'ArrowRight'}))}><ArrowRight/></button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-[10px] font-mono text-sci-cyan uppercase tracking-widest mb-4 flex items-center">
              <Info size={12} className="mr-2" /> PROTOCOL COMMANDS
            </h3>
            <ul className="space-y-3 text-[11px] font-mono text-slate-400">
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">01.</span> Use <span className="text-sci-cyan font-bold">ARROWS</span> or <span className="text-sci-cyan font-bold">AD</span> keys to switch data lanes.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">02.</span> Evade red <span className="text-red-500 font-bold">GLITCHES</span> to maintain connection stability.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">03.</span> Collect yellow <span className="text-yellow-400 font-bold">DATA CORE</span> nodes for massive score boosts.
              </li>
              <li className="flex items-start">
                <span className="text-sci-cyan mr-2">04.</span> Higher distance = Faster signal velocity.
              </li>
            </ul>
          </div>
        </div>

        {/* Game Area */}
        <div className="lg:col-span-3 flex flex-col items-center bg-slate-900/30 border border-slate-800 p-8 rounded-xl shadow-inner relative min-h-[600px]">
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_4px,3px_100%]"></div>
          
          <div className="relative rounded-xl overflow-hidden border-4 border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.6)] bg-slate-950">
            {gameOver && (
              <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center backdrop-blur-md p-8 text-center animate-in zoom-in duration-300">
                <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse" />
                <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter">Connection Dropped</h2>
                <p className="text-slate-400 mb-10 font-mono text-lg">Signal Integrity Lost at {score}m</p>
                <button 
                  onClick={resetGame} 
                  className="bg-sci-cyan text-slate-950 font-black px-12 py-4 rounded uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  Reconnect Node
                </button>
              </div>
            )}
            
            <GameInstance key={gameKey} onGameOver={(finalScore) => {
              setScore(finalScore);
              setGameOver(true);
              if (finalScore >= 500) addGameReward(finalScore / 50, 'Cyber Run');
            }} />
          </div>
          
          <div className="hidden lg:flex mt-8 items-center space-x-3 text-slate-500 text-xs font-mono bg-slate-900/30 px-6 py-3 rounded-full border border-slate-800">
             <Zap size={14} className="text-sci-cyan" />
             <span>Use ARROW KEYS to dodge glitches. Collect yellow core for bonus.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
