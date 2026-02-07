import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { getDb } from '../services/sqliteService';
import { Trophy, Medal, Star, Target, User, Cpu, Wallet } from 'lucide-react';

interface RankUser {
  username: string;
  balance: number;
  xp: number;
}

export const Leaderboard: React.FC = () => {
  const [ranks, setRanks] = useState<RankUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      const db = getDb();
      if (!db) return;

      try {
        const res = db.exec(`
          SELECT u.username, u.balance, IFNULL(SUM(n.xp), 0) as total_xp 
          FROM users u
          LEFT JOIN nfts n ON u.username = n.owner
          GROUP BY u.username
          ORDER BY u.balance DESC
          LIMIT 50
        `);

        if (res && res.length > 0) {
          const data = res[0].values.map(v => ({
            username: v[0] as string,
            balance: v[1] as number,
            xp: v[2] as number
          }));
          setRanks(data);
        }
      } catch (e) {
        console.error("Leaderboard fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const topThree = ranks.slice(0, 3);
  const others = ranks.slice(3);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">ELITE <span className="text-sci-cyan">RANKINGS</span></h1>
        <p className="text-slate-400 font-mono text-sm">Synchronized protocol hierarchy across 50 nodes.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Cpu size={48} className="text-sci-cyan animate-spin mb-4" />
          <p className="text-slate-500 font-mono animate-pulse">Aggregating chain data...</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center relative order-2 md:order-1 h-[280px] flex flex-col justify-center shadow-lg group hover:border-slate-400 transition-all">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-400 rounded-full flex items-center justify-center text-slate-950 font-black border-4 border-slate-900 group-hover:scale-110 transition">2</div>
                <Medal className="text-slate-400 mx-auto mb-4" size={40} />
                <h3 className="text-white font-black text-lg truncate">@{topThree[1].username}</h3>
                <p className="text-sci-cyan font-mono text-sm mt-2">{topThree[1].balance.toLocaleString()} QUEST</p>
                <div className="mt-4 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                  <Star size={10} className="mr-1" /> {topThree[1].xp} XP
                </div>
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="bg-sci-panel border-2 border-yellow-500 rounded-3xl p-10 text-center relative order-1 md:order-2 h-[340px] flex flex-col justify-center shadow-[0_0_50px_rgba(234,179,8,0.2)] group hover:scale-105 transition-all">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-slate-950 text-2xl font-black border-4 border-slate-900 group-hover:scale-110 transition">1</div>
                <Trophy className="text-yellow-500 mx-auto mb-6" size={64} />
                <h3 className="text-white font-black text-2xl truncate">@{topThree[0].username}</h3>
                <p className="text-sci-cyan font-mono text-xl mt-2">{topThree[0].balance.toLocaleString()} QUEST</p>
                <div className="mt-4 flex items-center justify-center text-xs text-yellow-500 font-mono font-bold tracking-widest">
                  <Star size={14} className="mr-1" /> {topThree[0].xp} TOTAL XP
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center relative order-3 h-[250px] flex flex-col justify-center shadow-lg group hover:border-orange-900 transition-all">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-orange-700 rounded-full flex items-center justify-center text-white font-black border-4 border-slate-900 group-hover:scale-110 transition">3</div>
                <Medal className="text-orange-700 mx-auto mb-4" size={40} />
                <h3 className="text-white font-black text-lg truncate">@{topThree[2].username}</h3>
                <p className="text-sci-cyan font-mono text-sm mt-2">{topThree[2].balance.toLocaleString()} QUEST</p>
                <div className="mt-4 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                  <Star size={10} className="mr-1" /> {topThree[2].xp} XP
                </div>
              </div>
            )}
          </div>

          {/* List View */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md max-w-5xl mx-auto">
            <div className="grid grid-cols-12 gap-4 p-6 border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black">
               <div className="col-span-2">RANK</div>
               <div className="col-span-5">IDENTITY</div>
               <div className="col-span-3">BALANCE</div>
               <div className="col-span-2 text-right">XP</div>
            </div>
            <div className="divide-y divide-slate-800">
               {others.map((r, i) => (
                 <div key={r.username} className="grid grid-cols-12 gap-4 p-6 hover:bg-slate-800/30 transition items-center">
                    <div className="col-span-2 font-mono text-slate-500">#{i + 4}</div>
                    <div className="col-span-5 flex items-center space-x-3">
                       <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                          <User size={16} />
                       </div>
                       <span className="text-white font-black">@{r.username}</span>
                    </div>
                    <div className="col-span-3 text-sci-cyan font-mono font-bold">
                       {r.balance.toLocaleString()} QUEST
                    </div>
                    <div className="col-span-2 text-right text-slate-400 font-mono">
                       {r.xp}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};