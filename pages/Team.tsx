
import React from 'react';
import { ChevronLeft, Users, Code, LineChart, ExternalLink, ShieldCheck, Globe, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Team: React.FC = () => {
  const team = [
    {
      username: 'tekraze',
      name: 'TEKRAZE',
      role: 'Founding Architect & Prime Developer',
      desc: 'Lead developer of the Quest Protocol and primary maintainer of the Blurt sidechain infrastructure. Specialist in decentralized systems and blockchain security.',
      skills: ['Protocol Design', 'Smart Contracts', 'Full Stack Dev'],
      link: 'https://blurt.blog/@tekraze/',
      color: 'text-sci-cyan',
      borderColor: 'border-sci-cyan/30',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]'
    },
    {
      username: 'kamranrkploy',
      name: 'KAMRAN RK PLOY',
      role: 'Economic Strategist & Core Contributor',
      desc: 'Expert in tokenomics and mathematical modeling for the Quest ecosystem. Driving the development of the sidechain gaming economy and core application logic.',
      skills: ['Economics', 'Game Logic', 'Systems Engineering'],
      link: 'https://blurt.blog/@kamranrkploy/',
      color: 'text-sci-purple',
      borderColor: 'border-sci-purple/30',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.2)]'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-12">
        <Link to="/" className="flex items-center text-slate-400 hover:text-white transition group mb-6">
          <ChevronLeft size={20} className="mr-1 group-hover:-translate-x-1" /> HUB
        </Link>
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">
            PROTOCOL <span className="text-sci-cyan">COMMAND</span>
          </h1>
          <p className="text-slate-400 font-mono text-sm max-w-2xl">
            Meet the architects behind the Quest Protocol. Bridging the gap between the Blurt Blockchain and next-generation decentralized gaming.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {team.map((member) => (
          <div 
            key={member.username} 
            className={`bg-sci-panel border ${member.borderColor} ${member.glow} rounded-3xl p-8 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}
          >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Cpu size={120} />
            </div>
            <div className={`absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-10 bg-current ${member.color}`}></div>

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                <div className={`w-24 h-24 rounded-2xl border-2 ${member.borderColor} bg-slate-950 p-1 relative`}>
                   <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center text-slate-600">
                      {member.username === 'tekraze' ? <Code size={40} className={member.color} /> : <LineChart size={40} className={member.color} />}
                   </div>
                   <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-lg border-2 border-slate-900 bg-slate-950 ${member.color}`}>
                      <ShieldCheck size={14} />
                   </div>
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">
                    {member.name}
                  </h2>
                  <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.2em] mb-3 ${member.color}`}>
                    {member.role}
                  </p>
                  <a 
                    href={member.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-white transition"
                  >
                    <Globe size={12} className="mr-2" /> @{member.username} <ExternalLink size={10} className="ml-1 opacity-50" />
                  </a>
                </div>
              </div>

              <p className="text-slate-400 font-mono text-xs leading-relaxed mb-8 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                {member.desc}
              </p>

              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Core Competencies</p>
                <div className="flex flex-wrap gap-2">
                  {member.skills.map(skill => (
                    <span key={skill} className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[9px] font-black text-slate-300 uppercase">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center">
         <div className="inline-block p-1 rounded-full bg-slate-900 border border-slate-800 mb-8">
            <div className="flex items-center px-6 py-2">
               <Users size={16} className="text-sci-cyan mr-3" />
               <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Community Open Source Initiative</span>
            </div>
         </div>
         <p className="text-slate-500 font-mono text-xs max-w-xl mx-auto italic">
            "We believe in a future where gaming assets are truly owned by the players, and the sidechain is the vehicle for that liberation."
         </p>
      </div>
    </div>
  );
};
