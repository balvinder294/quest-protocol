
import React, { useState, useEffect } from 'react';
import { useChain } from '../../context/ChainContext';
// Use namespaced import to bypass potential named export resolution issues in the environment
import * as RouterDOM from 'react-router-dom';
import { ChevronLeft, Sword, Shield, Zap, Target, Cpu, RefreshCw, Trophy, AlertTriangle, User, Plus, Star, ArrowUp, Activity, ShieldAlert, Info, CheckCircle } from 'lucide-react';

const { Link } = RouterDOM;

interface GameState {
  playerHP: number;
  botHP: number;
  playerMaxHP: number;
  botMaxHP: number;
  turn: 'PLAYER' | 'BOT';
  log: string[];
  cooldown: number;
  gameOver: boolean;
  winner: string | null;
}

export const SpaceAttackGame: React.FC = () => {
  const { user, provisionNFT, upgradeNFT, promoteNFT, addNFTExperience, addGameReward } = useChain();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [activeTab, setActiveTab] = useState<'SIMULATION' | 'HANGAR'>('SIMULATION');
  const [activeCharId, setActiveCharId] = useState<string | null>(null);

  // Added explicit type definition to handle optional elite property across character classes
  const CLASSES: Record<string, { hp: number; atk: number; luck: number; icon: React.Node; cost: number; elite?: string }> = {
    TRAVELLER: { hp: 80, atk: 15, luck: 25, icon: <User className="text-slate-400" />, cost: 0, elite: 'PILOT' },
    CADET: { hp: 100, atk: 20, luck: 15, icon: <Sword className="text-sci-cyan" />, cost: 0, elite: 'COMMANDER' },
    ENGINEER: { hp: 120, atk: 12, luck: 10, icon: <Shield className="text-sci-purple" />, cost: 0, elite: 'CYBORG' },
    PILOT: { hp: 90, atk: 25, luck: 40, icon: <Activity className="text-yellow-400" />, cost: 500 },
    COMMANDER: { hp: 140, atk: 35, luck: 15, icon: <ShieldAlert className="text-orange-500" />, cost: 1000 },
    CYBORG: { hp: 160, atk: 25, luck: 5, icon: <Cpu className="text-green-500" />, cost: 1500 }
  };

  // Auto-select first character if none selected
  useEffect(() => {
    if (!activeCharId && user.inventory.some(i => i.type === 'CHARACTER')) {
      const firstChar = user.inventory.find(i => i.type === 'CHARACTER');
      if (firstChar) setActiveCharId(firstChar.id);
    }
  }, [user.inventory, activeCharId]);

  const currentCharacter = user.inventory.find(i => i.id === activeCharId);
  const augments = user.inventory.filter(i => i.type === 'AUGMENT');

  const startBattle = () => {
    if (!currentCharacter) return;
    const charData = CLASSES[currentCharacter.subType as keyof typeof CLASSES];
    
    // Scale stats by level
    const levelScale = 1 + (currentCharacter.level - 1) * 0.1;
    const extraHP = augments.filter(a => a.subType === 'HEALTH').reduce((s, a) => s + (a.value * (1 + (a.level - 1) * 0.05)), 0);
    const extraAtk = augments.filter(a => a.subType === 'ATTACK').reduce((s, a) => s + (a.value * (1 + (a.level - 1) * 0.05)), 0);
    const extraLuck = augments.filter(a => a.subType === 'LUCK').reduce((s, a) => s + (a.value * (1 + (a.level - 1) * 0.05)), 0);

    const playerMaxHP = Math.floor((charData.hp * levelScale) + extraHP);
    const botMaxHP = 150 + (currentCharacter.level * 20); // Scale bot diff

    setGameState({
      playerHP: playerMaxHP,
      botHP: botMaxHP,
      playerMaxHP,
      botMaxHP,
      turn: 'PLAYER',
      log: [`[SYS] Level ${currentCharacter.level} ${currentCharacter.subType} link established.`],
      cooldown: 0,
      gameOver: false,
      winner: null
    });
  };

  const botTurn = (updatedState: GameState) => {
    if (updatedState.gameOver) return;

    setTimeout(() => {
      const decision = Math.random();
      let damage = 15 + (currentCharacter?.level || 1) * 2;
      let msg = '';
      
      if (decision > 0.8) {
        damage += 15;
        msg = `[BOT] Pulse Cannon Flare: ${damage} DMG.`;
      } else {
        msg = `[BOT] Laser Barrage: ${damage} DMG.`;
      }

      const newHP = Math.max(0, updatedState.playerHP - damage);
      const isOver = newHP <= 0;

      setGameState({
        ...updatedState,
        playerHP: newHP,
        turn: 'PLAYER',
        log: [msg, ...updatedState.log].slice(0, 10),
        cooldown: Math.max(0, updatedState.cooldown - 1),
        gameOver: isOver,
        winner: isOver ? 'PROTOCOL_BOT' : null
      });

      if (isOver) {
        addNFTExperience(currentCharacter!.id, 10); // XP for losing
      }
    }, 1000);
  };

  const handleAction = (type: 'LASER' | 'MISSILE' | 'SPECIAL' | 'REBOOT') => {
    if (!gameState || gameState.turn !== 'PLAYER' || gameState.gameOver) return;
    if (type === 'SPECIAL' && gameState.cooldown > 0) return;

    const charData = CLASSES[currentCharacter?.subType as keyof typeof CLASSES];
    const levelScale = 1 + (currentCharacter!.level - 1) * 0.1;
    const luck = charData.luck + augments.filter(a => a.subType === 'LUCK').reduce((s, a) => s + a.value, 0);

    let damage = 0;
    let msg = '';
    let newBotHP = gameState.botHP;
    let newPlayerHP = gameState.playerHP;
    let newCooldown = gameState.cooldown;

    if (type === 'LASER') {
      damage = Math.floor((charData.atk * levelScale) + 10);
      newBotHP -= damage;
      msg = `[YOU] Beam Laser discharged: ${damage} DMG.`;
    } else if (type === 'MISSILE') {
      const accuracy = 0.6 + (luck / 200);
      if (Math.random() <= accuracy) {
        damage = Math.floor((charData.atk * levelScale) * 2.5);
        newBotHP -= damage;
        msg = `[YOU] Missiles impacted: ${damage} DMG.`;
      } else {
        msg = `[YOU] Target avoided missile trajectory.`;
      }
    } else if (type === 'SPECIAL') {
      damage = Math.floor((charData.atk * levelScale) * 4);
      newBotHP -= damage;
      newCooldown = 3;
      msg = `[YOU] OVERDRIVE SYNC: ${damage} DMG.`;
    } else if (type === 'REBOOT') {
      const heal = Math.floor(30 * levelScale);
      newPlayerHP = Math.min(gameState.playerMaxHP, gameState.playerHP + heal);
      msg = `[YOU] Core Restoration: +${heal} HP.`;
    }

    newBotHP = Math.max(0, newBotHP);
    const isOver = newBotHP <= 0;

    const nextState: GameState = {
      ...gameState,
      botHP: newBotHP,
      playerHP: newPlayerHP,
      turn: 'BOT',
      log: [msg, ...gameState.log].slice(0, 10),
      cooldown: newCooldown,
      gameOver: isOver,
      winner: isOver ? user.username : null
    };

    setGameState(nextState);

    if (isOver) {
      addGameReward(200, 'Space Tactics');
      addNFTExperience(currentCharacter!.id, 50); // XP for winning
    } else {
      botTurn(nextState);
    }
  };

  const provision = (subType: string, cost: number) => {
    setIsMinting(true);
    let value = 0;
    let type: 'CHARACTER' | 'AUGMENT' = 'AUGMENT';
    if (cost >= 500 || ['TRAVELLER', 'CADET', 'ENGINEER'].includes(subType)) {
      type = 'CHARACTER';
      value = 0; 
    } else {
      type = 'AUGMENT';
      value = 20; 
    }

    setTimeout(() => {
      provisionNFT(type, subType as any, value, cost);
      setIsMinting(false);
    }, 1000);
  };

  const handleUpgrade = (id: string) => {
    const cost = 200;
    const bonus = 10;
    upgradeNFT(id, cost, bonus);
  };

  const handleAscend = (nftId: string, currentSubType: string) => {
    const eliteType = CLASSES[currentSubType as keyof typeof CLASSES]?.elite;
    if (!eliteType) return;
    const cost = CLASSES[eliteType as keyof typeof CLASSES].cost;
    if (confirm(`Refit this module to Elite ${eliteType} for ${cost} QUEST? (Level & XP will be preserved)`)) {
      promoteNFT(nftId, eliteType, cost);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/games" className="flex items-center text-slate-400 hover:text-white transition group">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DECK
        </Link>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
          <button 
            onClick={() => setActiveTab('SIMULATION')}
            className={`px-6 py-2 rounded-md font-bold text-xs tracking-widest transition ${activeTab === 'SIMULATION' ? 'bg-sci-cyan text-slate-950' : 'text-slate-500 hover:text-white'}`}
          >
            SIMULATION
          </button>
          <button 
            onClick={() => setActiveTab('HANGAR')}
            className={`px-6 py-2 rounded-md font-bold text-xs tracking-widest transition ${activeTab === 'HANGAR' ? 'bg-orange-500 text-slate-950' : 'text-slate-500 hover:text-white'}`}
          >
            THE HANGAR
          </button>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Authorized Bounty</p>
          <p className="text-white font-black text-xl">{user.balance.toLocaleString()} QUEST</p>
        </div>
      </div>

      {activeTab === 'HANGAR' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center">
              <Cpu size={24} className="text-orange-500 mr-3" /> System Inventory
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.inventory.length === 0 && (
                <div className="col-span-2 py-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                  <p className="text-slate-500 font-mono text-sm">No NFT modules detected in local buffer.</p>
                </div>
              )}
              {user.inventory.map(nft => {
                const isPremium = nft.rarity === 'EPIC' || nft.rarity === 'RARE';
                const canAscend = nft.type === 'CHARACTER' && CLASSES[nft.subType as keyof typeof CLASSES]?.elite;
                const isActive = activeCharId === nft.id;

                return (
                  <div key={nft.id} className={`bg-slate-900 border p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 ${
                    isPremium ? 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'border-slate-800'
                  }`}>
                    {isPremium && (
                      <div className="absolute top-0 right-0 px-3 py-1 bg-orange-500 text-black text-[8px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg">
                        PRIME UNIT
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 bg-slate-950 rounded-xl border ${isPremium ? 'border-orange-500 text-orange-400' : 'border-slate-800 text-sci-cyan'}`}>
                          {CLASSES[nft.subType as keyof typeof CLASSES]?.icon}
                        </div>
                        <div>
                          <p className="text-white font-black uppercase text-lg">{nft.subType}</p>
                          <p className="text-[10px] text-slate-500 font-mono">ID: {nft.id.substring(4, 10)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`${isPremium ? 'text-orange-500' : 'text-sci-cyan'} font-black text-xs uppercase`}>LVL {nft.level}</p>
                        <p className="text-[10px] text-slate-500 font-mono">XP: {nft.xp} / {nft.level * 100}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-500">BASE_VALUE</span>
                        <span className="text-white">+{nft.value} UNITS</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full transition-all duration-500 ${isPremium ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-sci-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]'}`} 
                          style={{ width: `${(nft.xp / (nft.level * 100)) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleUpgrade(nft.id)}
                        className="py-2 bg-slate-950 border border-slate-800 text-slate-400 font-bold text-[9px] rounded-lg hover:bg-orange-500 hover:text-slate-950 transition-colors flex items-center justify-center group"
                      >
                        <ArrowUp size={10} className="mr-1" /> UPGRADE [+10]
                      </button>
                      
                      {canAscend ? (
                        <button 
                          onClick={() => handleAscend(nft.id, nft.subType)}
                          className="py-2 bg-orange-950/20 border border-orange-500/50 text-orange-500 font-bold text-[9px] rounded-lg hover:bg-orange-500 hover:text-slate-950 transition-all flex items-center justify-center"
                        >
                          <Zap size={10} className="mr-1" /> ASCEND TO ELITE
                        </button>
                      ) : nft.type === 'CHARACTER' && (
                        <button 
                          onClick={() => setActiveCharId(nft.id)}
                          className={`py-2 border font-bold text-[9px] rounded-lg transition-all flex items-center justify-center ${
                            isActive 
                              ? 'bg-green-500 text-slate-950 border-green-500' 
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white'
                          }`}
                        >
                          {isActive ? <CheckCircle size={10} className="mr-1" /> : <Star size={10} className="mr-1" />}
                          {isActive ? 'ACTIVE LINK' : 'SET ACTIVE'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-8">
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center mb-6">
                <Plus size={24} className="text-sci-cyan mr-3" /> Premium Marketplace
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(CLASSES).filter(([_, v]) => v.cost > 0).map(([k, v]) => {
                  const isOwned = user.inventory.some(i => i.type === 'CHARACTER' && i.subType === k);
                  return (
                    <div key={k} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-sci-cyan/50 transition group">
                      <div className="mb-4 flex justify-center text-4xl">{v.icon}</div>
                      <h3 className="text-white font-black text-center mb-1 uppercase">{k}</h3>
                      <p className="text-[10px] text-slate-500 font-mono text-center mb-4">{v.cost} QUEST</p>
                      <button 
                        onClick={() => provision(k, v.cost)}
                        disabled={isMinting || isOwned}
                        className={`w-full font-black py-2 rounded text-[10px] transition ${
                          isOwned 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                            : 'bg-sci-cyan text-slate-950 hover:bg-white'
                        }`}
                      >
                        {isOwned ? 'ALREADY MINTED' : isMinting ? 'MINTING...' : 'MINT MODULE'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Star size={64}/></div>
                <h3 className="text-white font-black mb-4 flex items-center"><Info className="mr-2 text-orange-500" /> HANGAR PROTOCOLS</h3>
                <ul className="space-y-4 text-[11px] font-mono text-slate-400">
                  <li className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-orange-500 block mb-1 uppercase">Ascension Module</span>
                    Convert basic Travellers, Cadets, or Engineers into Elite versions. Your earned Level and XP are fully maintained during refit.
                  </li>
                  <li className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-orange-500 block mb-1 uppercase">Multi-Linking</span>
                    You can maintain multiple specialized character modules and swap your active link before simulation begins.
                  </li>
                  <li className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-orange-500 block mb-1 uppercase">Augment Capacity</span>
                    Maximum 4 active augments per session. Each augment adds raw stat values (Health, Attack, Luck) to your base character stats. Augments can be minted via the Inventory or acquired through event drops.
                  </li>
                  <li className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-orange-500 block mb-1 uppercase">Core Refits</span>
                    Spending QUEST in the Hangar permanently increases the base stat value of your augments and character modules.
                  </li>
                </ul>
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
           {!currentCharacter ? (
             <div className="lg:col-span-12 flex flex-col items-center justify-center min-h-[500px] bg-slate-900/30 border border-slate-800 rounded-3xl p-12 text-center backdrop-blur-md">
               <Cpu size={64} className="text-orange-500 mb-6 animate-pulse" />
               <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Identity Not Provisioned</h2>
               <p className="text-slate-400 mb-10 max-w-md font-mono">
                 You must mint a Character NFT module to enter the simulation.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                 {Object.entries(CLASSES).filter(([_, v]) => v.cost === 0).map(([k, v]) => {
                   const isOwned = user.inventory.some(i => i.type === 'CHARACTER' && i.subType === k);
                   return (
                     <div key={k} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl hover:border-sci-cyan/50 transition-all group">
                        <div className="mb-4 flex justify-center text-4xl">{v.icon}</div>
                        <h3 className="text-white font-black mb-2">{k}</h3>
                        <div className="text-[10px] font-mono text-slate-500 space-y-1 mb-6 text-left">
                           <p>BASE HP: {v.hp}</p>
                           <p>BASE ATK: {v.atk}</p>
                           <p>BASE LUCK: {v.luck}</p>
                        </div>
                        <button 
                         onClick={() => provision(k, 0)}
                         disabled={isMinting || isOwned}
                         className={`w-full font-black py-2 rounded uppercase text-xs transition ${
                           isOwned 
                             ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                             : 'bg-sci-cyan text-slate-950 hover:bg-white'
                         }`}
                        >
                          {isOwned ? 'ALREADY MINTED' : isMinting ? 'MINTING...' : 'MINT CLASS'}
                        </button>
                     </div>
                   );
                 })}
               </div>
               <p className="mt-8 text-[10px] font-mono text-slate-500 italic">Premium classes available via the Hangar.</p>
             </div>
           ) : !gameState ? (
             <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Simulation Uplink</h2>
                        <p className="text-slate-500 font-mono text-xs">Confirm active modules for engagement.</p>
                      </div>
                      <div className="bg-sci-cyan/10 text-sci-cyan border border-sci-cyan/50 px-4 py-1 rounded-full text-[10px] font-black tracking-widest">READY</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex items-center space-x-6">
                        <div className={`w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 shadow-lg text-3xl ${
                          currentCharacter.rarity === 'EPIC' ? 'border-orange-500 shadow-orange-500/20' : 'border-sci-cyan shadow-sci-cyan/20'
                        }`}>
                          {CLASSES[currentCharacter.subType as keyof typeof CLASSES]?.icon}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">LVL {currentCharacter.level} {currentCharacter.rarity} UNIT</p>
                          <p className="text-white font-black text-lg uppercase">{currentCharacter.subType}</p>
                        </div>
                      </div>
                      
                      <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono">ACTIVE AUGMENTS</p>
                          <p className="text-white font-black text-lg">{augments.length} / 4</p>
                        </div>
                        <Link to="#" onClick={() => setActiveTab('HANGAR')} className="text-orange-500 hover:text-white transition">
                          <Plus size={20} />
                        </Link>
                      </div>
                    </div>

                    <div className="mt-8">
                      <button 
                        onClick={startBattle}
                        className="w-full bg-sci-cyan text-slate-950 font-black py-4 rounded-xl text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] transition-all"
                      >
                        EXECUTE SIMULATION
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                   <h3 className="text-white font-black mb-4 flex items-center"><Activity className="mr-2 text-sci-cyan" /> COMBAT PARAMETERS</h3>
                   <ul className="space-y-4 text-xs font-mono text-slate-400">
                     <li className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                       <span className="text-sci-cyan block mb-1">LEVEL SCALING</span>
                       Stats increase by 10% per level. Your current multiplier: {1 + (currentCharacter.level-1)*0.1}x.
                     </li>
                     <li className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                       <span className="text-sci-cyan block mb-1">XP DISPATCH</span>
                       Earn +50 XP for Victory, +10 XP for Defeat. Ascending in the Hangar refits your stats but preserves this progress.
                     </li>
                   </ul>
                </div>
             </div>
           ) : (
             <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
                {/* Battlefield View */}
                <div className="lg:col-span-8 space-y-8">
                   <div className="grid grid-cols-2 gap-8">
                     {/* Player Status */}
                     <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><User size={64}/></div>
                        <p className="text-[10px] font-mono text-sci-cyan mb-2 uppercase">Uplink: @{user.username} [LVL {currentCharacter.level}]</p>
                        <h3 className="text-xl font-black text-white mb-4">HULL_INTEGRITY</h3>
                        <div className="w-full bg-slate-950 h-4 rounded-full border border-slate-800 overflow-hidden mb-2">
                           <div 
                             className="h-full bg-sci-cyan transition-all duration-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
                             style={{ width: `${(gameState.playerHP / gameState.playerMaxHP) * 100}%` }}
                           ></div>
                        </div>
                        <p className="text-right font-mono text-xs text-slate-500">{Math.floor(gameState.playerHP)} / {gameState.playerMaxHP} HP</p>
                     </div>

                     {/* Bot Status */}
                     <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><Cpu size={64}/></div>
                        <p className="text-[10px] font-mono text-red-500 mb-2 uppercase tracking-widest">PROTOCOL_BOT.v{currentCharacter.level}</p>
                        <h3 className="text-xl font-black text-white mb-4">CORE_SHIELD</h3>
                        <div className="w-full bg-slate-950 h-4 rounded-full border border-slate-800 overflow-hidden mb-2">
                           <div 
                             className="h-full bg-red-500 transition-all duration-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                             style={{ width: `${(gameState.botHP / gameState.botMaxHP) * 100}%` }}
                           ></div>
                        </div>
                        <p className="text-right font-mono text-xs text-slate-500">{gameState.botHP} / {gameState.botMaxHP} HP</p>
                     </div>
                   </div>

                   <div className="bg-black border border-slate-800 rounded-3xl h-[250px] p-6 font-mono text-xs overflow-y-auto space-y-2 flex flex-col-reverse shadow-inner">
                     {gameState.log.map((l, i) => (
                       <div key={i} className={`${l.includes('[BOT]') ? 'text-red-400' : l.includes('[YOU]') ? 'text-sci-cyan' : 'text-slate-500'}`}>
                         <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span> {l}
                       </div>
                     ))}
                   </div>

                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-4">
                      <button onClick={() => handleAction('LASER')} disabled={gameState.turn === 'BOT' || gameState.gameOver} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center hover:bg-slate-800 transition disabled:opacity-50 group">
                         <Target className="text-sci-cyan mb-2 group-hover:scale-110 transition" />
                         <span className="text-xs font-bold text-white">LASER</span>
                         <span className="text-[10px] text-slate-500 font-mono mt-1">90% ACC</span>
                      </button>
                      <button onClick={() => handleAction('MISSILE')} disabled={gameState.turn === 'BOT' || gameState.gameOver} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center hover:bg-slate-800 transition disabled:opacity-50 group">
                         <Sword className="text-orange-400 mb-2 group-hover:scale-110 transition" />
                         <span className="text-xs font-bold text-white">MISSILE</span>
                         <span className="text-[10px] text-slate-500 font-mono mt-1">60% ACC</span>
                      </button>
                      <button onClick={() => handleAction('SPECIAL')} disabled={gameState.turn === 'BOT' || gameState.gameOver || gameState.cooldown > 0} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center hover:bg-slate-800 transition disabled:opacity-50 group relative">
                         <Zap className="text-yellow-400 mb-2 group-hover:scale-110 transition" />
                         <span className="text-xs font-bold text-white">OVERDRIVE</span>
                         {gameState.cooldown > 0 ? <span className="text-[10px] text-red-500 font-mono mt-1">CD: {gameState.cooldown}</span> : <span className="text-[10px] text-green-500 font-mono mt-1">READY</span>}
                      </button>
                      <button onClick={() => handleAction('REBOOT')} disabled={gameState.turn === 'BOT' || gameState.gameOver} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center hover:bg-slate-800 transition disabled:opacity-50 group">
                         <RefreshCw className="text-sci-purple mb-2 group-hover:scale-110 transition" />
                         <span className="text-xs font-bold text-white">REBOOT</span>
                         <span className="text-[10px] text-slate-500 font-mono mt-1">RESTORE HP</span>
                      </button>
                   </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-8">
                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl h-full flex flex-col justify-center text-center relative overflow-hidden">
                     {gameState.gameOver ? (
                        <div className="animate-in zoom-in duration-500">
                          {gameState.winner === user.username ? (
                            <>
                              <Trophy size={80} className="text-yellow-400 mx-auto mb-6 animate-bounce" />
                              <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">VICTORY</h2>
                              <p className="text-sci-cyan font-mono text-sm mb-4">Protocol stabilized. +200 QUEST dispatched.</p>
                              <p className="text-green-400 font-mono text-lg mb-8">+50 XP RECORDED</p>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={80} className="text-red-500 mx-auto mb-6 animate-pulse" />
                              <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">DEFEAT</h2>
                              <p className="text-slate-500 font-mono text-sm mb-4">Signal lost. Integrity compromised.</p>
                              <p className="text-red-400 font-mono text-lg mb-8">+10 XP RECORDED</p>
                            </>
                          )}
                          <button onClick={() => { setGameState(null); }} className="w-full bg-white text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest shadow-xl hover:scale-[1.05] transition-all">CLOSE LINK</button>
                        </div>
                     ) : (
                       <div>
                         <div className={`p-12 rounded-full mx-auto border-4 mb-8 transition-colors duration-500 ${gameState.turn === 'PLAYER' ? 'border-sci-cyan text-sci-cyan' : 'border-red-500 text-red-500 animate-pulse'}`}>
                           {gameState.turn === 'PLAYER' ? <User size={48} /> : <Cpu size={48} />}
                         </div>
                         <h2 className={`text-2xl font-black uppercase tracking-tighter transition-colors ${gameState.turn === 'PLAYER' ? 'text-sci-cyan' : 'text-red-500'}`}>
                           {gameState.turn === 'PLAYER' ? 'READY_ACTION' : 'BOT_CALIBRATING'}
                         </h2>
                       </div>
                     )}
                   </div>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
