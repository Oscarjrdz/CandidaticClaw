"use client";

import { useState, useEffect, useRef } from "react";
import { Activity, Power, Terminal, Users, Play, Square, MessageSquare, Save, CheckCircle2, Clock, Bot, Settings } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || "http://localhost:3000";
const API_KEY = process.env.NEXT_PUBLIC_VPS_API_KEY || "super_secret_key_123";

export default function DashboardPage() {
  const [stats, setStats] = useState({ agentActive: false, activeConversations: 0, messagesToday: 0, candidatesTransferred: 0 });
  const [conversations, setConversations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [promptContent, setPromptContent] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const terminalEndRef = useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    fetchStats();
    fetchConversations();
    fetchPrompt();

    // Iniciar conexión al Live Feed (SSE)
    const eventSource = new EventSource(`${API_URL}/api/admin/feed?token=${API_KEY}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLogs((prev) => [...prev, data]);
      } catch (e) {
        console.error("Error parseando SSE:", e);
      }
    };

    return () => eventSource.close();
  }, []);

  // Auto-scroll de la terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers });
      const data = await res.json();
      if (data.status === "success") setStats(data.data);
    } catch (e) { console.error("Error stats", e); }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/conversations`, { headers });
      const data = await res.json();
      if (data.status === "success") setConversations(data.data);
    } catch (e) { console.error("Error conv", e); }
  };

  const fetchPrompt = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/prompt`, { headers });
      const data = await res.json();
      if (data.status === "success") setPromptContent(data.data.prompt);
    } catch (e) { console.error("Error prompt", e); }
  };

  const toggleAgent = async (start) => {
    const endpoint = start ? "start" : "stop";
    try {
      await fetch(`${API_URL}/api/admin/${endpoint}`, { method: "POST", headers });
      fetchStats();
    } catch (e) { console.error("Error toggle", e); }
  };

  const savePrompt = async () => {
    setSavingPrompt(true);
    try {
      await fetch(`${API_URL}/api/admin/prompt`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ prompt: promptContent })
      });
      // Mostramos algo en UI si quieres
    } catch (e) {
      console.error("Error save prompt", e);
    } finally {
      setTimeout(() => setSavingPrompt(false), 1000);
    }
  };

  // Render Helper para estatus
  const getStatusBadge = (status) => {
    if (status === 'Analizando') return <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs flex items-center gap-1"><Clock size={12}/> Analizando</span>;
    if (status === 'Esperando Respuesta') return <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs flex items-center gap-1"><MessageSquare size={12}/> Esperando</span>;
    return <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle2 size={12}/> Humano</span>;
  };

  const getLogColor = (type, level) => {
    if (type === 'sys') return 'text-purple-400 font-bold';
    if (level === 'thinking') return 'text-yellow-300 italic';
    if (level === 'info') return 'text-green-400';
    return 'text-slate-300';
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8 font-sans selection:bg-purple-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Cabecera */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 flex items-center gap-3">
              <Bot className="text-purple-400" size={32} />
              Candidatic Copilot
            </h1>
            <p className="text-slate-400 mt-1">Panel de Control Autónomo (VPS: DigitalOcean)</p>
          </div>
          
          <div className="flex bg-slate-900 rounded-full p-1 border border-slate-800">
            <button 
              onClick={() => toggleAgent(true)}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${stats.agentActive ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'text-slate-400 hover:text-white'}`}
            >
              <Play size={16} fill={stats.agentActive ? "currentColor" : "none"} /> Activo
            </button>
            <button 
              onClick={() => toggleAgent(false)}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${!stats.agentActive ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-slate-400 hover:text-white'}`}
            >
              <Square size={16} fill={!stats.agentActive ? "currentColor" : "none"} /> Detenido
            </button>
          </div>
        </header>

        {/* Widgets Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 hover:-translate-y-1 transition-transform">
            <div className="p-4 bg-blue-500/20 text-blue-400 rounded-xl">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Estado del Sistema</p>
              <p className="text-2xl font-bold text-white flex items-center gap-2">
                {stats.agentActive ? "Operativo" : "En Pausa"}
                <span className={`w-3 h-3 rounded-full ${stats.agentActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></span>
              </p>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 hover:-translate-y-1 transition-transform">
            <div className="p-4 bg-purple-500/20 text-purple-400 rounded-xl">
              <MessageSquare size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Mensajes Procesados (Hoy)</p>
              <p className="text-2xl font-bold text-white">{stats.messagesToday}</p>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 hover:-translate-y-1 transition-transform">
            <div className="p-4 bg-green-500/20 text-green-400 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Transferencias a RH</p>
              <p className="text-2xl font-bold text-white">{stats.candidatesTransferred}</p>
            </div>
          </div>
        </div>

        {/* Zona Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Live Feed Terminal */}
          <div className="glass-panel rounded-2xl flex flex-col h-[500px] overflow-hidden border border-slate-700/50">
            <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-white font-medium flex items-center gap-2">
                <Terminal size={18} className="text-purple-400" /> Live Feed Neural
              </h2>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-black/50 font-mono text-sm terminal-scroll space-y-2">
              {logs.length === 0 ? (
                <p className="text-slate-500 italic">Esperando conexión SSE con VPS...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-slate-500 text-xs shrink-0 mt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`${getLogColor(log.type, log.level)}`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          <div className="space-y-6">
            {/* Sistema Prompt Editor */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col h-[238px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white font-medium flex items-center gap-2">
                  <Settings size={18} className="text-blue-400" /> System Prompt (En caliente)
                </h2>
                <button 
                  onClick={savePrompt}
                  disabled={savingPrompt}
                  className="bg-blue-600 hover:bg-blue-500 transition-colors text-white px-4 py-1.5 rounded-lg text-sm flex items-center gap-2"
                >
                  <Save size={16} />
                  {savingPrompt ? "Guardando..." : "Guardar"}
                </button>
              </div>
              <textarea 
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                className="flex-1 bg-slate-900/50 border border-slate-700 text-slate-300 p-3 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Cargando AGENTS.md desde el VPS..."
              />
            </div>

            {/* Tabla de Conversaciones Activas */}
            <div className="glass-panel rounded-2xl overflow-hidden h-[238px] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-800">
                <h2 className="text-white font-medium flex items-center gap-2">
                  <Users size={18} className="text-green-400" /> Conversaciones Activas
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto terminal-scroll">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 bg-slate-900/50 uppercase">
                    <tr>
                      <th className="px-6 py-3">Candidato</th>
                      <th className="px-6 py-3">Estado del Agente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map(conv => (
                      <tr key={conv.id} className="border-b border-slate-800/50 hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-medium text-slate-200">
                          {conv.name}
                          <div className="text-xs text-slate-500">{conv.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(conv.status)}
                        </td>
                      </tr>
                    ))}
                    {conversations.length === 0 && (
                      <tr><td colSpan="2" className="px-6 py-8 text-center text-slate-500">No hay interacciones recientes.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
