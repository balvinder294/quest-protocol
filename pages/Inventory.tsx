import React, { useState, useMemo } from 'react';
import { useChain } from '../context/ChainContext';
import { SimulationNFT } from '../types';
import { 
  Box, 
  Filter, 
  ArrowUpDown, 
  User, 
  Zap, 
  Shield, 
  Cpu, 
  Activity, 
  Sword, 
  ShieldAlert,
  Search,
  LayoutGrid,
  Info,
  HelpCircle
} from 'lucide-react';

type SortKey = 'level' | 'rarity' | 'type' | 'value';
type FilterType = 'ALL' | 'CHARACTER' | 'AUGMENT';

export const Inventory: React.FC = () => {
  const { user } = useChain();
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('rarity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const rarityWeight = {
    'COMMON': 1,
    'RARE': 2,
    'EPIC': 3
  };

  const filteredAndSortedItems = useMemo(() => {
    let items = [...user.inventory];

    // Filter
    if (filterType !== 'ALL') {
      items = items.filter(i => i.type === filterType);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      items = items.filter(i => 
        i.subType.toLowerCase().includes(lowerSearch) || 
        i.id.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    items.sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (sortKey === 'rarity') {
        valA = rarityWeight[a.rarity];
        valB = rarityWeight[b.rarity];
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [user.inventory, filterType, sortKey, sortDir, search]);

  const getIcon = (nft: SimulationNFT) => {
    if (nft.type === 'CHARACTER') {
        if (['PILOT', 'COMMANDER', 'CYBORG'].includes(nft.subType)) return <Cpu size={24} />;
        return <User size={24} />;
    }
    if (nft.subType === 'ATTACK') return <Sword size={24} />;
    if (nft.subType === 'HEALTH') return <Shield size={24} />;
    if (nft.subType === 'LUCK') return <Zap size={24} />;
    return <Box size={24} />;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'EPIC': return 'border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
      case 'RARE': return 'border-sci-cyan text-sci-cyan shadow-[0_0_15px_rgba(6,182,212,0.3)]';
      default: return 'border-slate-700 text-slate-400';
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-wide flex items-center">
            <LayoutGrid className="mr-3 text-sci-cyan" /> DIGITAL <span className="text-sci-cyan ml-2">ASSETS</span>
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Total Modules: {user.inventory.length} | Net Worth: {user.inventory.reduce((acc, i) => acc + (i.value || 0), 0)} Units
          </p>
        </div>
      </div>

      {/* Protocol Guide / Instructions */}
      <div className="bg-sci-cyan/5 border border-sci-cyan/20 rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6 items-center">
        <div className="bg-sci-cyan/10 p-4 rounded-full text-sci-cyan border border-sci-cyan/20">
          <HelpCircle size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-black text-sm uppercase mb-2 flex items-center">
            <Info size={14} className="mr-2 text-sci-cyan" /> Augment Protocol Instructions
          </h3>
          <p className="text-slate-400 font-mono text-xs leading-relaxed">
            Every simulation session allows for a <span className="text-sci-cyan font-bold">maximum of 4 active augments</span>. 
            Augments are slotted automatically based on your active loadout in the Hangar. 
            Characters provide base hulls, while Augments inject additional stat parameters (HP, ATK, LUCK) scaled by their Level and Rarity.
          </p>
        </div>
        <div className="hidden lg:block border-l border-slate-800 pl-6 h-12">
           <p className="text-[10px] text-slate-500 font-mono uppercase">Current Multiplier</p>
           <p className="text-sci-cyan font-black text-xl">x1.25 MAX</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-sci-panel border border-slate-800 p-4 rounded-xl mb-8 flex flex-col lg:flex-row justify-between gap-4">
        {/* Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 lg:pb-0">
          <Filter size={16} className="text-slate-500 mr-2" />
          {['ALL', 'CHARACTER', 'AUGMENT'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as FilterType)}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                filterType === type 
                  ? 'bg-sci-cyan text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-sci-cyan'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative">
             <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
             <input 
               type="text" 
               placeholder="Search modules..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-sci-cyan outline-none font-mono w-full md:w-48"
             />
           </div>

           <div className="flex items-center space-x-2 bg-slate-950 rounded-lg p-1 border border-slate-700">
             <span className="text-[10px] font-mono text-slate-500 px-2 uppercase">Sort By:</span>
             {(['rarity', 'level', 'type'] as SortKey[]).map(key => (
               <button
                 key={key}
                 onClick={() => toggleSort(key)}
                 className={`px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center ${
                    sortKey === key ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                 }`}
               >
                 {key}
                 {sortKey === key && <ArrowUpDown size={10} className="ml-1" />}
               </button>
             ))}
           </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAndSortedItems.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-900/30 border border-slate-800 border-dashed rounded-xl">
            <Box size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-500 font-mono">No modules found matching your criteria.</p>
          </div>
        )}

        {filteredAndSortedItems.map((nft) => (
          <div 
            key={nft.id} 
            className={`bg-slate-900 border rounded-xl p-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 ${getRarityColor(nft.rarity).split(' ')[0]}`}
          >
             {/* Background glow for rare items */}
             {nft.rarity === 'EPIC' && <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>}
             {nft.rarity === 'RARE' && <div className="absolute -right-10 -top-10 w-32 h-32 bg-sci-cyan/10 rounded-full blur-3xl"></div>}

             <div className="flex justify-between items-start mb-4 relative z-10">
               <div className={`p-3 rounded-lg border bg-slate-950 ${getRarityColor(nft.rarity)}`}>
                 {getIcon(nft)}
               </div>
               <div className="text-right">
                 <span className={`text-[10px] font-black uppercase px-2 py-1 rounded bg-slate-950 border ${getRarityColor(nft.rarity)}`}>
                    {nft.rarity}
                 </span>
               </div>
             </div>

             <h3 className="text-lg font-black text-white uppercase mb-1 tracking-tight">{nft.subType}</h3>
             <p className="text-[10px] font-mono text-slate-500 mb-4">ID: {nft.id.substring(4)}</p>

             <div className="space-y-3">
               <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-400 font-mono">LEVEL</span>
                  <span className="text-xl font-bold text-white leading-none">{nft.level}</span>
               </div>
               
               {/* XP Bar */}
               <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full ${nft.rarity === 'EPIC' ? 'bg-orange-500' : 'bg-sci-cyan'}`} 
                    style={{ width: `${Math.min(100, (nft.xp / (nft.level * 100)) * 100)}%` }}
                  ></div>
               </div>
               <div className="flex justify-between text-[10px] font-mono text-slate-500">
                 <span>XP</span>
                 <span>{nft.xp} / {nft.level * 100}</span>
               </div>
             </div>

             {/* Footer Stats */}
             <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase">{nft.type} MODULE</span>
                <span className="text-xs font-bold text-white flex items-center">
                   {nft.value > 0 ? `+${nft.value} STAT` : 'BASE UNIT'}
                </span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};