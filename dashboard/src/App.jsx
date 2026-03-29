import React from 'react';
import { Activity, BrainCircuit, MessageCircle, Database } from 'lucide-react';
import './index.css';

function App() {
  return (
    <div style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <BrainCircuit color="var(--accent-cyan)" size={28} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Candidatic Copilot</h1>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }}></span>
            WhatsApp Gateway Active
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }}></span>
            Telegram Bridge Active
          </span>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', flex: 1 }}>
        <section className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Activity size={20} />
            Registro de Pensamientos (Logs)
          </h2>
          <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1.5rem', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.875rem', overflowY: 'auto' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}><span style={{ color: 'var(--accent-cyan)' }}>[10:42:01]</span> &gt; Procesando audio entrante de (+52 553 492)...</p>
            <p style={{ margin: '0 0 0.5rem 0' }}><span style={{ color: 'var(--accent-cyan)' }}>[10:42:03]</span> &gt; Intención detectada: Reasignar 15 candidatos a Grupo A.</p>
            <p style={{ margin: '0 0 0.5rem 0' }}><span style={{ color: '#00ffaa' }}>[10:42:05]</span> &gt; Skill ejecutado: [UpdatePipeline] -> Redis Modificado exitosamente (15 rows).</p>
            <span className="blinking-cursor" style={{ display: 'inline-block', width: '8px', height: '16px', backgroundColor: 'var(--accent-cyan)', animation: 'blink 1s step-end infinite' }}></span>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Database size={18} />
              Memoria Activa (Redis)
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Conexión estable. Latencia: 12ms</p>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <MessageCircle size={18} />
              Chat de Comandos
            </h3>
            <div style={{ flex: 1 }}></div>
            <input type="text" placeholder="Ordena algo al agente..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', outline: 'none' }} />
          </div>
        </section>
      </main>
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

export default App;
