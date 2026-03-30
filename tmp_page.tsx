"use client";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Terminal, 
  Play, 
  Square, 
  Cpu, 
  Network, 
  MessageCircle, 
  Send, 
  Webhook, 
  Plus,
  Zap,
  Globe,
  MoreVertical,
  CheckCircle2,
  Plug
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({ 
    agentActive: true, 
    inferences: 140592, 
    activeChannels: 3, 
    avgLatency: 240 
  });
  
  const [logs, setLogs] = useState<any[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Mocks para canales
  const [channels, setChannels] = useState([
    { id: 1, type: "whatsapp", name: "WhatsApp Business API", status: "connected", events: 12503 },
    { id: 2, type: "telegram", name: "Telegram Bot (Prod)", status: "connected", events: 4320 },
    { id: 3, type: "webhook", name: "Internal ERP Sync", status: "degraded", events: 890 }
  ]);

  useEffect(() => {
    // Simulated log stream
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const generateId = () => Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    
    const interval = setInterval(() => {
      if (!stats.agentActive) return;
      const types = ['info', 'sys', 'thinking', 'success', 'sys'];
      const messages = [
        "Incoming webhook payload from WhatsApp API",
        "NLP Routing decided node: SALES_INQUIRY",
        "Generating response chunk stream via LLM...",
        "Memory vector retrieved: ID-" + generateId(),
        "Message delivered to channel (+52 ** ****)",
        "Database sync completed in 14ms",
        "Agent inference cycle completed (204ms latency)",
        "Spawning child-process for heavy data aggregation..."
      ];
      
      const type = types[Math.floor(Math.random() * types.length)];
      const newLog = {
        timestamp: new Date().toISOString(),
        type: type,
        message: messages[Math.floor(Math.random() * messages.length)],
        id: generateId()
      };
      
      setLogs((prev: any[]) => {
        const next = [...prev, newLog];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [stats.agentActive]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleAgent = (start: boolean) => {
    setStats((prev: any) => ({ ...prev, agentActive: start }));
  };

  const getLogStyle = (type: string) => {
    switch(type) {
      case 'sys': return 'text-orange-500 font-bold';
      case 'thinking': return 'text-amber-300 italic';
      case 'success': return 'text-emerald-400';
      case 'info': return 'text-cyan-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-8 font-sans selection:bg-orange-500/30 text-slate-300 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute top-[20%] right-[30%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto space-y-8 relative z-10">
        
        {/* Cabecera OpenClaw */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.3)] relative group">
              <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Network className="text-white relative z-10" size={32} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-rose-500 to-purple-500 tracking-tight">
                OpenClaw OS
              </h1>
              <p className="text-slate-400 text-sm font-medium mt-1 tracking-wide uppercase">Global Neural Orchestration Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-sm text-slate-300 backdrop-blur-sm">
              <Globe size={16} className="text-emerald-500" />
              <span>Network: <strong className="text-white">Global Edge Node</strong></span>
            </div>

            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-md">
              <button onClick={() => toggleAgent(true)} className={`flex items-center gap-2 px-5 py-2.5 rounded-md transition-all text-sm font-bold tracking-wider ${stats.agentActive ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                <Play size={14} fill={stats.agentActive ? "currentColor" : "none"} /> ENGINE ONLINE
              </button>
              <button onClick={() => toggleAgent(false)} className={`flex items-center gap-2 px-5 py-2.5 rounded-md transition-all text-sm font-bold tracking-wider ${!stats.agentActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.2)]' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                <Square size={14} fill={!stats.agentActive ? "currentColor" : "none"} /> HALT
              </button>
            </div>
          </div>
        </header>

        {/* Global Metricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <MetricCard 
            title="Core Node Logic" 
            value={stats.agentActive ? "Running" : "Suspended"} 
            subtitle="Real-time multi-agent processing"
            icon={<Activity size={20} />} 
            color="orange"
            pulse={stats.agentActive}
          />
          <MetricCard 
            title="Total Inferences" 
            value={stats.inferences.toLocaleString()} 
            subtitle="LLM compute tasks in 24h"
            icon={<Cpu size={20} />} 
            color="cyan"
          />
          <MetricCard 
            title="Active Endpoints" 
            value={stats.activeChannels} 
            subtitle="Connected IO channels streams"
            icon={<Network size={20} />} 
            color="purple"
          />
          <MetricCard 
            title="Global Latency" 
            value={`${stats.avgLatency}ms`} 
            subtitle="End-to-end routing time"
            icon={<Zap size={20} />} 
            color="emerald"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[600px]">
          
          {/* Live System Stream (Left - 2cols) */}
          <div className="lg:col-span-2 bg-[#0a0a0a]/80 backdrop-blur-xl rounded-3xl flex flex-col h-[600px] lg:h-full border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            
            <div className="bg-black/50 px-6 py-5 flex justify-between items-center border-b border-white/5">
              <h2 className="text-white font-mono text-sm tracking-widest flex items-center gap-3 font-semibold uppercase">
                <Terminal size={18} className="text-orange-500" /> System.Stream_Log
              </h2>
              <div className="flex gap-3 items-center">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stats.agentActive ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${stats.agentActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <span className="text-xs font-mono text-slate-500">{stats.agentActive ? 'Live feed connected' : 'Feed paused'}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 font-mono text-[13.5px] leading-relaxed terminal-scroll space-y-3">
              {logs.length === 0 ? (
                <div className="flex items-center gap-3 text-slate-500 pt-4">
                  <Activity size={18} className="animate-pulse" />
                  <p>Initializing OpenClaw Neural Core...</p>
                </div>
              ) : (
                logs.map((log: any, i: number) => (
                  <div key={i} className="flex gap-4 hover:bg-white/5 p-1.5 -mx-1.5 rounded-lg transition-colors duration-200">
                    <span className="text-slate-600/80 shrink-0 select-none">
                      [{log.timestamp.split('T')[1].slice(0, 11)}]
                    </span>
                    <span className={`flex-1 break-words ${getLogStyle(log.type)}`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Omnichannel Integrations (Right - 1col) */}
          <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[600px] lg:h-full relative shadow-2xl">
            <div className="px-6 py-5 bg-black/50 border-b border-white/5 flex justify-between items-center z-10">
              <div>
                <h2 className="text-white font-semibold text-base flex items-center gap-2 tracking-wide">
                  <Plug size={18} className="text-purple-500" /> IO Channels Gateway
                </h2>
                <p className="text-xs text-slate-400 mt-1">Manage external endpoints & integrations</p>
              </div>
              <button className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/20 transition-all hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                <Plus size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar z-10">
              
              {channels.map((channel: any) => (
                <div key={channel.id} className="group bg-white/5 border border-white/5 hover:border-purple-500/40 rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.08] cursor-pointer shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-3 rounded-xl shadow-inner ${
                        channel.type === 'whatsapp' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 
                        channel.type === 'telegram' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' : 
                        'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      }`}>
                        {channel.type === 'whatsapp' && <MessageCircle size={22} />}
                        {channel.type === 'telegram' && <Send size={22} />}
                        {channel.type === 'webhook' && <Webhook size={22} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors tracking-wide">{channel.name}</h3>
                        <p className="text-[11px] font-medium text-slate-500 capitalize mt-0.5 tracking-wider uppercase">{channel.type} Integration</p>
                      </div>
                    </div>
                    <button className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-end bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5">
                      {channel.status === 'connected' ? (
                        <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle2 size={12} /> Live
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-amber-500/20">
                          <Zap size={12} /> Degraded
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Payloads Data</p>
                      <p className="text-sm font-mono font-bold text-white mt-0.5">{channel.events.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}

              <button className="w-full py-6 mt-6 border-2 border-dashed border-white/10 hover:border-purple-500/50 rounded-2xl text-sm font-bold text-slate-400 hover:text-purple-300 transition-all duration-300 flex flex-col items-center justify-center gap-3 group bg-black/20 hover:bg-purple-900/10">
                <div className="p-3 bg-white/5 group-hover:bg-purple-500/20 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] rounded-full transition-all duration-300 group-hover:scale-110">
                  <Plus size={24} className="text-slate-400 group-hover:text-purple-400" />
                </div>
                Deploy New Channel
              </button>
              
            </div>
            
            {/* Bottom Edge Fade */}
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none z-20"></div>
          </div>
          
        </div>
      </div>
      
      {/* Dynamic Global Styles for Scrollbars */}
      <style dangerouslySetInnerHTML={{__html: `
        .terminal-scroll::-webkit-scrollbar { width: 6px; }
        .terminal-scroll::-webkit-scrollbar-track { background: transparent; }
        .terminal-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .terminal-scroll::-webkit-scrollbar-thumb:hover { background: #555; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.4); }
      `}} />
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color, pulse = false }: any) {
  const colorMap: Record<string, string> = {
    orange: "from-orange-500/20 to-orange-500/5 text-orange-500 border-orange-500/20",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-500 border-cyan-500/20",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-500 border-purple-500/20",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-500 border-emerald-500/20",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-500 border-rose-500/20",
  };

  const ringMap: Record<string, string> = {
    orange: "shadow-[0_0_15px_rgba(249,115,22,0.6)] bg-orange-500",
    cyan: "shadow-[0_0_15px_rgba(6,182,212,0.6)] bg-cyan-500",
    purple: "shadow-[0_0_15px_rgba(168,85,247,0.6)] bg-purple-500",
    emerald: "shadow-[0_0_15px_rgba(16,185,129,0.6)] bg-emerald-500",
    rose: "shadow-[0_0_15px_rgba(244,63,94,0.6)] bg-rose-500",
  };

  return (
    <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 p-6 rounded-3xl flex flex-col justify-between hover:border-white/10 transition-all duration-300 group relative overflow-hidden shadow-lg hover:-translate-y-1">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${colorMap[color]} blur-3xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none`}></div>
      <div className={`absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr ${colorMap[color]} blur-3xl rounded-full opacity-10 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none`}></div>
      
      <div className="flex justify-between items-start z-10">
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorMap[color]} bg-black shadow-inner`}>
          {icon}
        </div>
        {pulse && (
          <div className="pt-2 pr-2">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ringMap[color]}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${ringMap[color]}`}></span>
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-6 z-10">
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-white mt-1.5 tracking-tight">{value}</p>
        <p className="text-xs text-slate-500 mt-2 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}
