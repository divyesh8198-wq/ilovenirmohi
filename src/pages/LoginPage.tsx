import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

// Hello Kitty = Manuuu (GF) 🎀
// Kuromi = Divs (BF) 🖤

interface Profile {
  username: string;
  label: string;
  sublabel: string;
  emoji: string;
  theme: 'kitty' | 'kuromi';
  color: string;
  bg: string;
  ring: string;
  btn: string;
}

const PROFILES: Profile[] = [
  {
    username: 'manuuu',
    label: 'Divy cha baal',
    sublabel: "That's me! 🌸",
    emoji: '🎀',
    theme: 'kitty',
    color: 'text-pink-600',
    bg: 'from-pink-50 to-rose-50 border-pink-200',
    ring: 'ring-pink-400',
    btn: 'bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500',
  },
  {
    username: 'divs',
    label: 'Manuu cha baal',
    sublabel: "That's me! 🖤",
    emoji: '🖤',
    theme: 'kuromi',
    color: 'text-purple-700',
    bg: 'from-purple-50 to-violet-50 border-purple-200',
    ring: 'ring-purple-400',
    btn: 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700',
  },
];

function HelloKitty() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
      {/* Head */}
      <ellipse cx="50" cy="52" rx="36" ry="34" fill="white" stroke="#fda4af" strokeWidth="2"/>
      {/* Left ear */}
      <ellipse cx="24" cy="24" rx="10" ry="12" fill="white" stroke="#fda4af" strokeWidth="2"/>
      <ellipse cx="24" cy="25" rx="6" ry="8" fill="#fda4af"/>
      {/* Right ear */}
      <ellipse cx="76" cy="24" rx="10" ry="12" fill="white" stroke="#fda4af" strokeWidth="2"/>
      <ellipse cx="76" cy="25" rx="6" ry="8" fill="#fda4af"/>
      {/* Big bow on left */}
      <ellipse cx="22" cy="20" rx="10" ry="6" fill="#f43f5e" transform="rotate(-20 22 20)"/>
      <ellipse cx="36" cy="14" rx="10" ry="6" fill="#f43f5e" transform="rotate(-20 36 14)"/>
      <circle cx="29" cy="17" r="4" fill="#fb7185"/>
      {/* Eyes */}
      <ellipse cx="38" cy="52" rx="5" ry="6" fill="#1c1917"/>
      <ellipse cx="62" cy="52" rx="5" ry="6" fill="#1c1917"/>
      <circle cx="40" cy="50" r="2" fill="white"/>
      <circle cx="64" cy="50" r="2" fill="white"/>
      {/* Nose */}
      <ellipse cx="50" cy="60" rx="4" ry="3" fill="#fda4af"/>
      {/* Whiskers */}
      <line x1="14" y1="58" x2="40" y2="60" stroke="#d4d4d4" strokeWidth="1.5"/>
      <line x1="14" y1="64" x2="40" y2="63" stroke="#d4d4d4" strokeWidth="1.5"/>
      <line x1="60" y1="60" x2="86" y2="58" stroke="#d4d4d4" strokeWidth="1.5"/>
      <line x1="60" y1="63" x2="86" y2="64" stroke="#d4d4d4" strokeWidth="1.5"/>
      {/* Blush */}
      <ellipse cx="30" cy="66" rx="8" ry="5" fill="#fda4af" opacity="0.5"/>
      <ellipse cx="70" cy="66" rx="8" ry="5" fill="#fda4af" opacity="0.5"/>
    </svg>
  );
}

function Kuromi() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
      {/* Hood/head */}
      <ellipse cx="50" cy="52" rx="36" ry="34" fill="#1c1917" />
      {/* Hood points (ears) */}
      <polygon points="20,30 10,8 34,22" fill="#1c1917"/>
      <polygon points="80,30 90,8 66,22" fill="#1c1917"/>
      {/* Inner ear pink */}
      <ellipse cx="22" cy="22" rx="5" ry="7" fill="#e879f9" opacity="0.6"/>
      <ellipse cx="78" cy="22" rx="5" ry="7" fill="#e879f9" opacity="0.6"/>
      {/* White face */}
      <ellipse cx="50" cy="56" rx="28" ry="26" fill="white"/>
      {/* Skull on forehead */}
      <ellipse cx="50" cy="36" rx="9" ry="8" fill="white"/>
      <circle cx="47" cy="35" r="2.5" fill="#1c1917"/>
      <circle cx="53" cy="35" r="2.5" fill="#1c1917"/>
      <rect x="45" y="40" width="10" height="3" rx="1" fill="#1c1917"/>
      <line x1="47" y1="40" x2="47" y2="43" stroke="white" strokeWidth="1"/>
      <line x1="50" y1="40" x2="50" y2="43" stroke="white" strokeWidth="1"/>
      <line x1="53" y1="40" x2="53" y2="43" stroke="white" strokeWidth="1"/>
      {/* Eyes - big oval */}
      <ellipse cx="37" cy="54" rx="7" ry="8" fill="#1c1917"/>
      <ellipse cx="63" cy="54" rx="7" ry="8" fill="#1c1917"/>
      <ellipse cx="37" cy="54" rx="5" ry="6" fill="#7c3aed"/>
      <ellipse cx="63" cy="54" rx="5" ry="6" fill="#7c3aed"/>
      <circle cx="39" cy="51" r="2" fill="white"/>
      <circle cx="65" cy="51" r="2" fill="white"/>
      {/* Smile */}
      <path d="M 40 66 Q 50 74 60 66" stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Tiny bow on top */}
      <ellipse cx="40" cy="30" rx="7" ry="4" fill="#7c3aed" transform="rotate(-10 40 30)"/>
      <ellipse cx="52" cy="26" rx="7" ry="4" fill="#7c3aed" transform="rotate(-10 52 26)"/>
      <circle cx="46" cy="28" r="3" fill="#a855f7"/>
      {/* Blush */}
      <ellipse cx="30" cy="64" rx="6" ry="4" fill="#e879f9" opacity="0.4"/>
      <ellipse cx="70" cy="64" rx="6" ry="4" fill="#e879f9" opacity="0.4"/>
    </svg>
  );
}

export default function LoginPage() {
  const [selected, setSelected] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setLoading(true);
    try {
      await login(selected.username, password);
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Wrong password! Try again 💔');
      } else {
        setError('Server connecting or offline! Please ensure server is running 🔌');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #fce4ff 40%, #f0e6ff 100%)' }}>

      {/* Decorative floating elements */}
      {['🎀','🖤','✨','🌸','💜','⭐','🎀','💗'].map((e, i) => (
        <div key={i} className="absolute animate-float select-none pointer-events-none"
          style={{
            left: `${8 + i * 12}%`, top: `${10 + (i % 3) * 25}%`,
            fontSize: `${16 + (i % 3) * 8}px`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${3 + i * 0.4}s`,
            opacity: 0.6,
          }}>
          {e}
        </div>
      ))}

      <div className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex justify-center items-center gap-3 mb-3">
            <span className="text-4xl animate-heartbeat">🎀</span>
            <div>
              <h1 className="font-display text-4xl font-bold" style={{ color: '#be185d' }}>
                Our Little
              </h1>
              <h1 className="font-display text-4xl font-bold" style={{ color: '#7c3aed' }}>
                Universe ✦
              </h1>
            </div>
            <span className="text-4xl animate-heartbeat" style={{ animationDelay: '0.5s' }}>🖤</span>
          </div>
          <p className="font-handwriting text-2xl" style={{ color: '#db2777' }}>Divs & Manuuu 💗</p>
          <p className="text-sm text-stone-400 mt-1 font-handwriting text-lg">Two little worlds, one little universe ✦</p>
        </div>

        {!selected ? (
          /* Character selection */
          <div className="animate-slide-up">
            <p className="text-center font-handwriting text-xl mb-6" style={{ color: '#9333ea' }}>
              Who are you? ✨
            </p>
            <div className="grid grid-cols-2 gap-4">
              {PROFILES.map(profile => (
                <button key={profile.username} onClick={() => setSelected(profile)}
                  className={`group relative bg-gradient-to-b ${profile.bg} border-2 rounded-3xl p-5 
                    transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl active:scale-95
                    flex flex-col items-center gap-3 overflow-hidden`}>

                  {/* Sparkle corners */}
                  <span className="absolute top-2 right-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✨</span>
                  <span className="absolute top-2 left-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">⭐</span>

                  {/* Character avatar */}
                  <div className={`w-28 h-28 rounded-full overflow-hidden border-4 shadow-lg transition-all duration-300 group-hover:scale-110 ${
                    profile.theme === 'kitty' ? 'border-pink-300 shadow-pink-200' : 'border-purple-400 shadow-purple-200'
                  }`}>
                    {profile.theme === 'kitty' ? <HelloKitty /> : <Kuromi />}
                  </div>

                  {/* Name */}
                  <div className="text-center">
                    <p className={`font-display text-base font-bold ${profile.color} leading-tight`}>
                      {profile.label}
                    </p>
                    <p className="font-handwriting text-sm text-stone-400 mt-0.5">{profile.sublabel}</p>
                  </div>

                  {/* Hover indicator */}
                  <div className={`w-8 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                    profile.theme === 'kitty' ? 'bg-pink-400' : 'bg-purple-500'
                  }`} />
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-stone-400 mt-6 font-handwriting text-base">
              Private & just for us 🔒
            </p>
          </div>
        ) : (
          /* Password entry */
          <div className="animate-slide-up">
            <div className={`bg-gradient-to-b ${selected.bg} border-2 rounded-3xl p-6 shadow-xl`}>
              {/* Back + avatar */}
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => { setSelected(null); setPassword(''); setError(''); }}
                  className="text-stone-400 hover:text-stone-600 text-sm transition-colors">
                  ← back
                </button>
                <div className={`w-14 h-14 rounded-full overflow-hidden border-3 shadow-md ${
                  selected.theme === 'kitty' ? 'border-pink-300' : 'border-purple-400'
                }`}>
                  {selected.theme === 'kitty' ? <HelloKitty /> : <Kuromi />}
                </div>
                <div>
                  <p className={`font-display font-bold ${selected.color}`}>{selected.label}</p>
                  <p className="text-xs text-stone-400">Enter your secret password</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-500 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="🔒 secret password..."
                    className="w-full px-4 py-3 rounded-2xl border-2 bg-white/80 text-stone-700 
                               placeholder-stone-300 focus:outline-none transition-all font-handwriting text-lg"
                    style={{ borderColor: selected.theme === 'kitty' ? '#fda4af' : '#c084fc' }}
                    autoFocus
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button type="submit" disabled={loading || !password}
                  className={`w-full py-3.5 rounded-2xl text-white font-bold text-base shadow-lg
                    transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50
                    ${selected.btn} flex items-center justify-center gap-2`}>
                  {loading
                    ? <span className="animate-spin text-xl">💗</span>
                    : <>
                        {selected.theme === 'kitty' ? '🎀' : '🖤'}
                        Enter our Universe
                        {selected.theme === 'kitty' ? '🌸' : '✨'}
                      </>
                  }
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
