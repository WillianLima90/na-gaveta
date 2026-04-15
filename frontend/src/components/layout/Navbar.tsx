// ============================================================
// Na Gaveta — Navbar
// Header responsivo com logo, navegação e menu mobile
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Trophy, LogOut, User, LayoutDashboard, ChevronDown, Bell, AlertTriangle, Clock, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  useEffect(() => {
    const loadNotifications = () => {
      const token = localStorage.getItem('ng_token');
      if (!isAuthenticated || !token) return;

      fetch('http://localhost:3001/api/notifications/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        })
        .catch(() => {});
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = isAuthenticated
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/pools', label: 'Bolões', icon: <Trophy className="w-4 h-4" /> },
      ]
    : [];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-bg-primary/90 backdrop-blur-md border-b border-border-subtle">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-brand">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-text-primary group-hover:text-brand transition-colors">
              Na Gaveta
            </span>
          </Link>

          {/* ── Nav Desktop ──────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-brand bg-brand/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Ações Desktop ────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setNotificationsOpen((prev) => !prev)}
                    className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-bg-elevated border border-border-subtle hover:border-zinc-600 transition-colors"
                  >
                    <Bell className="w-4 h-4 text-text-primary" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border-subtle bg-bg-elevated shadow-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                        <span className="text-sm font-bold text-text-primary">Notificações</span>
                        <button
                          onClick={() => {
                            const token = localStorage.getItem('ng_token');
                            if (!token) return;

                            fetch('http://localhost:3001/api/notifications/read-all', {
                              method: 'POST',
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            })
                              .then(() => {
                                setUnreadCount(0);
                                setNotifications((prev) =>
                                  prev.map((item) => ({ ...item, isRead: true }))
                                );
                              })
                              .catch(() => {});
                          }}
                          className="text-xs text-brand hover:underline"
                        >
                          Marcar todas
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-zinc-400 text-center">
                            Nenhuma notificação por enquanto
                          </div>
                        ) : (
                          notifications.map((item) => {
                            const timeAgo = new Date(item.createdAt).toLocaleTimeString();

                            return (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (item.isRead) return;

                                const token = localStorage.getItem('ng_token');
                                if (!token) return;

                                fetch(`http://localhost:3001/api/notifications/${item.id}/read`, {
                                  method: 'POST',
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                })
                                  .then(() => {
                                    setNotifications((prev) =>
                                      prev.map((n) =>
                                        n.id === item.id ? { ...n, isRead: true } : n
                                      )
                                    );
                                    setUnreadCount((prev) => Math.max(prev - 1, 0));
                                  })
                                  .catch(() => {});
                              }}
                              className={`px-4 py-3 border-b border-border-subtle/60 transition-colors cursor-pointer ${
                                item.isRead
  ? "hover:bg-white/5"
  : item.title.toLowerCase().includes("última")
    ? "bg-red-500/20 hover:bg-red-500/30 border-l-4 border-red-500"
    : item.title.toLowerCase().includes("urgente")
      ? "bg-brand/20 hover:bg-brand/30 border-l-4 border-brand"
      : "bg-zinc-500/20 hover:bg-zinc-500/30 border-l-4 border-zinc-400" 
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {item.title.toLowerCase().includes("última") ? (
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                  ) : item.title.toLowerCase().includes("urgente") ? (
                                    <Clock className="w-4 h-4 text-brand" />
                                  ) : (
                                    <Info className="w-4 h-4 text-zinc-400" />
                                  )}
                                  <div className="text-sm font-semibold text-text-primary">{item.title}</div>
                                </div>
                                <div className="text-[10px] text-zinc-500">{timeAgo}</div>
                              </div>
                              <div className="text-xs text-zinc-400 mt-1">{item.message}</div>
                            </div>
                          )})
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle hover:border-zinc-600 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center">
                    <User className="w-3 h-3 text-brand" />
                  </div>
                  <span className="text-sm text-text-primary font-medium group-hover:text-brand transition-colors">
                    {user?.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Criar conta</Button>
                </Link>
              </>
            )}
          </div>

          {/* ── Botão Mobile ─────────────────────────────────── */}
          <button
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Menu Mobile ──────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border-subtle bg-bg-primary animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-brand bg-brand/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}

            <div className="pt-2 border-t border-border-subtle mt-2 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  >
                    <User className="w-4 h-4" />
                    {user?.name}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="secondary" fullWidth>Entrar</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    <Button fullWidth>Criar conta grátis</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
