import { LogOut, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [liveCount, setLiveCount] = useState(0);
  const [pulse, setPulse] = useState(false);

  // SSE — escuta novos alertas em tempo real
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const es = new EventSource(`/api/events?token=${token}`);
    es.addEventListener('new-alert', () => {
      setLiveCount(n => n + 1);
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
    });
    return () => es.close();
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-6 shrink-0">
      <div className="text-sm text-zinc-500">
        Sistema de Controle de Excesso de Velocidade
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setLiveCount(0); navigate('/alerts'); }}
          className="relative p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Bell size={16} />
          {liveCount > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center ${pulse ? 'animate-ping' : ''}`}>
              {liveCount > 9 ? '9+' : liveCount}
            </span>
          )}
        </button>
        <span className="text-sm text-zinc-400">{user?.name}</span>
        <button onClick={handleLogout} className="btn-ghost flex items-center gap-1.5">
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </header>
  );
}
