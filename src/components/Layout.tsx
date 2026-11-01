import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, Image, Baby, Video, Mic, Clock, Mail, BookOpen,
  Calendar, Heart, Star, HelpCircle, Timer, Camera, Moon,
  Menu, X, LogOut, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home', emoji: '🏠' },
  { to: '/gallery', icon: Image, label: 'Her Gallery', emoji: '📸' },
  { to: '/childhood', icon: Baby, label: 'Childhood', emoji: '🌸' },
  { to: '/videos', icon: Video, label: 'Little Videos', emoji: '🎬' },
  { to: '/voices', icon: Mic, label: 'Voices We Keep', emoji: '🎙️' },
  { to: '/timeline', icon: Clock, label: 'Memory Timeline', emoji: '⏳' },
  { to: '/letters', icon: Mail, label: 'Love Letters', emoji: '💌' },
  { to: '/diary', icon: BookOpen, label: 'My Diary', emoji: '📔' },
  { to: '/selfie', icon: Camera, label: 'Daily Selfie', emoji: '🤳' },
  { to: '/calendar', icon: Calendar, label: 'Our Calendar', emoji: '📅' },
  { to: '/dates', icon: Heart, label: 'Date Planner', emoji: '🌹' },
  { to: '/bucket-list', icon: Star, label: 'Bucket List', emoji: '✨' },
  { to: '/questions', icon: HelpCircle, label: 'Daily Questions', emoji: '💭' },
  { to: '/countdowns', icon: Timer, label: 'Countdowns', emoji: '⏰' },
];

interface LayoutProps { children: React.ReactNode; }

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const isManuuu = user?.username === 'manuuu';

  const navItems = isManuuu
    ? [...NAV_ITEMS, { to: '/cycle', icon: Moon, label: 'Cycle Tracker', emoji: '🌙' }]
    : NAV_ITEMS;

  const isKitty = isManuuu;  // Manuuu = Hello Kitty 🎀 | Divs = Kuromi 🖤
  const accentGrad = isKitty
    ? 'from-pink-400 to-rose-400'
    : 'from-purple-500 to-violet-600';
  const accentLight = isKitty ? 'bg-pink-50' : 'bg-purple-50';
  const accentText = isKitty ? 'text-pink-700' : 'text-purple-700';
  const accentBorder = isKitty ? 'border-pink-100' : 'border-purple-100';
  const characterEmoji = isKitty ? '🎀' : '🖤';
  const nickName = isManuuu ? 'Divy cha baal 🎀' : 'Manuu cha baal 🖤';

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
        style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderRight: '1px solid rgba(244,114,182,0.2)' }}>

        {/* Logo */}
        <div className={`px-5 py-5 border-b ${accentBorder}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xl animate-heartbeat">🎀</span>
                <h1 className="font-display text-lg font-bold text-gradient leading-tight">Our Little Universe</h1>
                <span className="text-xl animate-heartbeat" style={{ animationDelay: '0.5s' }}>🖤</span>
              </div>
              <p className="font-handwriting text-sm text-pink-400">Divs & Manuuu ✦</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-pink-50">
              <X size={18} className="text-stone-400" />
            </button>
          </div>
        </div>

        {/* User badge */}
        <div className={`mx-3 mt-3 p-3 rounded-2xl border ${accentBorder} ${accentLight}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gradient-to-br ${accentGrad} shadow-md`}>
              {characterEmoji}
            </div>
            <div className="min-w-0">
              <p className={`font-bold text-sm truncate ${accentText}`}>{nickName}</p>
              <p className="text-xs text-stone-400">{user?.displayName}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map(({ to, label, emoji }) => (
            <NavLink key={to} to={to} end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="text-base w-6 text-center">{emoji}</span>
              <span className="text-sm">{label}</span>
              {/* active indicator is handled by CSS */}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={`px-3 py-4 border-t ${accentBorder}`}>
          <p className="font-handwriting text-xs text-center text-stone-400 mb-3">
            Two little worlds, one little universe ✦
          </p>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-400
                       hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 px-4 py-3 flex items-center gap-3 border-b border-pink-100"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-pink-50 text-stone-500 transition-colors">
            <Menu size={20} />
          </button>
          <h1 className="font-display font-bold text-gradient">Our Little Universe ✦</h1>
          <div className={`ml-auto w-9 h-9 rounded-full flex items-center justify-center text-lg bg-gradient-to-br ${accentGrad} shadow-md`}>
            {characterEmoji}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
