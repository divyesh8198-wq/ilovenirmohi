import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { differenceInDays, differenceInSeconds, parseISO, format } from 'date-fns';

// ── Our special dates ──
const FIRST_MET      = new Date('2026-09-24T20:56:00');   // 24 Sep 2026, 8:56 PM — when we met 🌸
const FEELINGS_START = new Date('2026-10-21T00:00:00');   // 21 Oct 2026 — when feelings began 💗
const RELATIONSHIP_START = FEELINGS_START;                 // counting from feelings day

// Floating kawaii background elements
function KawaiiBackground() {
  const items = ['🎀','🖤','✨','🌸','💜','⭐','💗','🌙','🎀','💫','🌺','🖤'];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((e, i) => (
        <div key={i} className="absolute animate-float select-none opacity-20"
          style={{
            left: `${5 + i * 8}%`,
            top: `${10 + (i % 4) * 22}%`,
            fontSize: `${14 + (i % 3) * 10}px`,
            animationDelay: `${i * 0.6}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}>{e}</div>
      ))}
    </div>
  );
}

// Live day + second counter
function RelationshipCounter() {
  const [secs, setSecs] = useState(differenceInSeconds(new Date(), RELATIONSHIP_START));

  useEffect(() => {
    const id = setInterval(() => setSecs(differenceInSeconds(new Date(), RELATIONSHIP_START)), 1000);
    return () => clearInterval(id);
  }, []);

  const safeSecs = Math.max(0, secs);
  const days = Math.floor(safeSecs / 86400);
  const hrs  = Math.floor((safeSecs % 86400) / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const s    = safeSecs % 60;

  const daysSinceMet = differenceInDays(new Date(), FIRST_MET);

  return (
    <div className="glass-card p-6 text-center relative overflow-hidden">
      {/* Corner decorations */}
      <span className="absolute top-3 left-3 text-2xl animate-wiggle">🎀</span>
      <span className="absolute top-3 right-3 text-2xl animate-wiggle" style={{ animationDelay: '0.3s' }}>🖤</span>
      <span className="absolute bottom-3 left-3 text-xl animate-float opacity-60">✨</span>
      <span className="absolute bottom-3 right-3 text-xl animate-float opacity-60" style={{ animationDelay: '1s' }}>💫</span>

      <p className="font-handwriting text-xl text-pink-500 mb-1">Feelings started</p>
      <div className="flex justify-center items-end gap-1 mb-3">
        <span className="font-display text-7xl font-bold text-gradient leading-none">{days}</span>
        <span className="font-handwriting text-2xl text-pink-400 mb-2">days ago</span>
      </div>
      <div className="flex justify-center gap-2 mb-4">
        {[['hrs', hrs], ['min', mins], ['sec', s]].map(([u, v]) => (
          <div key={u as string} className="bg-gradient-to-b from-pink-50 to-purple-50 border border-pink-100 rounded-2xl px-3 py-2 min-w-[52px]">
            <div className="font-display text-xl font-bold text-gradient">{String(v).padStart(2,'0')}</div>
            <div className="text-xs text-stone-400">{u}</div>
          </div>
        ))}
      </div>
      <p className="font-handwriting text-pink-400 text-sm mb-4">
        since {format(RELATIONSHIP_START, 'MMMM d, yyyy')} 💗
      </p>

      {/* First met milestone */}
      <div className="border-t border-pink-100 pt-3 mt-1">
        <p className="text-xs text-stone-400 font-handwriting text-base">
          🌸 First met <span className="text-pink-500 font-semibold">{daysSinceMet} days ago</span> — {format(FIRST_MET, "MMMM d, yyyy 'at' h:mm a")}
        </p>
      </div>
    </div>
  );
}

// Countdown card
function NextCountdown({ cd }: { cd: { title: string; target_date: string; emoji?: string } }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    function upd() {
      const dateStr = cd.target_date.includes('T') ? cd.target_date : `${cd.target_date}T00:00:00`;
      const diff = differenceInSeconds(new Date(dateStr), new Date());
      setSecs(Math.max(0, diff));
    }
    upd();
    const id = setInterval(upd, 1000);
    return () => clearInterval(id);
  }, [cd.target_date]);

  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400)/3600),
        m = Math.floor((secs % 3600)/60), s = secs % 60;

  return (
    <div className="glass-card p-5 text-center h-full">
      <p className="text-3xl mb-1 animate-bounce-soft">{cd.emoji || '⏰'}</p>
      <p className="font-handwriting text-pink-500 mb-3 text-sm">{cd.title}</p>
      <div className="grid grid-cols-4 gap-1">
        {[['d',d],['h',h],['m',m],['s',s]].map(([u,v])=>(
          <div key={u as string} className="bg-gradient-to-b from-pink-50 to-purple-50 rounded-xl py-1.5">
            <div className="font-display text-lg font-bold text-gradient">{String(v).padStart(2,'0')}</div>
            <div className="text-xs text-stone-400">{u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const QUICK = [
  { to:'/gallery',   emoji:'📸', label:'Her Gallery',      color:'from-pink-100 to-rose-100 border-pink-200' },
  { to:'/childhood', emoji:'🌸', label:'Childhood',         color:'from-orange-50 to-amber-50 border-orange-200' },
  { to:'/videos',    emoji:'🎬', label:'Little Videos',     color:'from-purple-50 to-violet-100 border-purple-200' },
  { to:'/voices',    emoji:'🎙️', label:'Voices We Keep',   color:'from-lavender-100 to-purple-50 border-lavender-200' },
  { to:'/timeline',  emoji:'⏳', label:'Our Timeline',      color:'from-blush-50 to-pink-50 border-blush-200' },
  { to:'/letters',   emoji:'💌', label:'Love Letters',      color:'from-rose-50 to-pink-100 border-rose-200' },
  { to:'/dates',     emoji:'🌹', label:'Date Planner',      color:'from-red-50 to-rose-50 border-red-200' },
  { to:'/bucket-list',emoji:'✨',label:'Bucket List',       color:'from-yellow-50 to-amber-50 border-yellow-200' },
  { to:'/questions', emoji:'💭', label:"Today's Q",         color:'from-sky-50 to-blue-50 border-sky-200' },
  { to:'/countdowns',emoji:'⏰', label:'Countdowns',        color:'from-lime-50 to-green-50 border-lime-200' },
  { to:'/sleep',     emoji:'🌙', label:'Sleep & Dreams',    color:'from-indigo-50 to-purple-50 border-indigo-200' },
  { to:'/location',  emoji:'📍', label:'Where Are You?',    color:'from-emerald-50 to-teal-50 border-emerald-200' },
  { to:'/calendar',  emoji:'📅', label:'Our Calendar',      color:'from-cyan-50 to-teal-50 border-cyan-200' },
  { to:'/diary',     emoji:'📔', label:'My Diary',          color:'from-stone-50 to-slate-50 border-stone-200' },
];

export default function HomePage() {
  const { user, token } = useAuth();
  const isManuuu = user?.username === 'manuuu';
  const greeting = isManuuu ? 'Divy cha baal 🎀' : 'Manuu cha baal 🖤';

  const { data: countdowns } = useQuery({
    queryKey: ['countdowns'],
    queryFn: () => axios.get('/api/countdowns').then(r => r.data),
  });

  const { data: todayQ } = useQuery({
    queryKey: ['today-question'],
    queryFn: () => axios.get('/api/questions/today').then(r => r.data).catch(() => null),
  });

  const { data: recentPhotos } = useQuery({
    queryKey: ['recent-photos'],
    queryFn: () => axios.get('/api/photos?album=gallery').then(r => r.data.slice(0, 6)),
  });

  const nextCd = countdowns?.[0];

  return (
    <div className="relative">
      <KawaiiBackground />
      <div className="page-container relative z-10 animate-fade-in space-y-8">

        {/* ── Hero banner ── */}
        <div className="relative rounded-3xl overflow-hidden text-center py-10 px-6"
          style={{ background: 'linear-gradient(135deg, #fff0f5, #fce4ff, #f0e6ff)' }}>
          {/* Decorative bows */}
          <div className="absolute top-4 left-6 text-3xl animate-wiggle">🎀</div>
          <div className="absolute top-4 right-6 text-3xl animate-wiggle" style={{ animationDelay:'0.4s' }}>🖤</div>
          <div className="absolute bottom-4 left-16 text-2xl animate-float opacity-50">✨</div>
          <div className="absolute bottom-4 right-16 text-2xl animate-float opacity-50" style={{ animationDelay:'1s' }}>💫</div>

          <p className="font-handwriting text-2xl text-pink-500 mb-2 animate-bounce-soft">
            Welcome back, {greeting} ✦
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-gradient mb-2">
            Our Little Universe
          </h1>
          <p className="font-handwriting text-3xl" style={{ color: '#7c3aed' }}>
            Divs & Manuuu 💗
          </p>
          <p className="text-stone-400 mt-3 italic font-body">
            "Two little worlds, one little universe." ✦
          </p>

          {/* Hello Kitty & Kuromi small icons */}
          <div className="flex justify-center gap-6 mt-5">
            <div className="w-14 h-14 animate-bounce-soft">
              {/* Mini Hello Kitty */}
              <svg viewBox="0 0 100 100" fill="none">
                <ellipse cx="50" cy="55" rx="36" ry="34" fill="white" stroke="#fda4af" strokeWidth="3"/>
                <ellipse cx="24" cy="26" rx="10" ry="12" fill="white" stroke="#fda4af" strokeWidth="2"/>
                <ellipse cx="76" cy="26" rx="10" ry="12" fill="white" stroke="#fda4af" strokeWidth="2"/>
                <ellipse cx="22" cy="20" rx="10" ry="6" fill="#f43f5e" transform="rotate(-20 22 20)"/>
                <ellipse cx="36" cy="14" rx="10" ry="6" fill="#f43f5e" transform="rotate(-20 36 14)"/>
                <circle cx="29" cy="17" r="4" fill="#fb7185"/>
                <ellipse cx="38" cy="54" rx="5" ry="6" fill="#1c1917"/>
                <ellipse cx="62" cy="54" rx="5" ry="6" fill="#1c1917"/>
                <circle cx="40" cy="52" r="2" fill="white"/>
                <circle cx="64" cy="52" r="2" fill="white"/>
                <ellipse cx="50" cy="62" rx="4" ry="3" fill="#fda4af"/>
                <ellipse cx="30" cy="68" rx="8" ry="5" fill="#fda4af" opacity="0.5"/>
                <ellipse cx="70" cy="68" rx="8" ry="5" fill="#fda4af" opacity="0.5"/>
              </svg>
            </div>
            <div className="flex items-center">
              <span className="font-handwriting text-3xl text-pink-400 animate-heartbeat">💗</span>
            </div>
            <div className="w-14 h-14 animate-bounce-soft" style={{ animationDelay:'0.5s' }}>
              {/* Mini Kuromi */}
              <svg viewBox="0 0 100 100" fill="none">
                <ellipse cx="50" cy="55" rx="36" ry="34" fill="#1c1917"/>
                <polygon points="20,30 10,8 34,22" fill="#1c1917"/>
                <polygon points="80,30 90,8 66,22" fill="#1c1917"/>
                <ellipse cx="50" cy="58" rx="28" ry="26" fill="white"/>
                <ellipse cx="50" cy="38" rx="9" ry="8" fill="white"/>
                <circle cx="47" cy="37" r="2.5" fill="#1c1917"/>
                <circle cx="53" cy="37" r="2.5" fill="#1c1917"/>
                <rect x="45" y="42" width="10" height="3" rx="1" fill="#1c1917"/>
                <ellipse cx="37" cy="57" rx="7" ry="8" fill="#7c3aed"/>
                <ellipse cx="63" cy="57" rx="7" ry="8" fill="#7c3aed"/>
                <circle cx="39" cy="54" r="2" fill="white"/>
                <circle cx="65" cy="54" r="2" fill="white"/>
                <path d="M 40 68 Q 50 76 60 68" stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <ellipse cx="30" cy="66" rx="6" ry="4" fill="#e879f9" opacity="0.4"/>
                <ellipse cx="70" cy="66" rx="6" ry="4" fill="#e879f9" opacity="0.4"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Counters row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><RelationshipCounter /></div>
          <div>
            {nextCd
              ? <NextCountdown cd={nextCd} />
              : (
                <div className="glass-card p-5 text-center h-full flex flex-col items-center justify-center">
                  <span className="text-4xl mb-3 animate-bounce-soft">⏰</span>
                  <p className="font-handwriting text-pink-400 mb-3">Add a countdown!</p>
                  <Link to="/countdowns" className="btn-primary text-sm py-2 px-4">Add one ✨</Link>
                </div>
              )
            }
          </div>
        </div>

        {/* ── Today's Question ── */}
        {todayQ && (
          <div className="glass-card p-5 border-l-4 border-pink-300">
            <div className="flex items-start gap-4">
              <span className="text-3xl animate-bounce-soft">💭</span>
              <div className="flex-1">
                <p className="font-handwriting text-pink-500 text-lg mb-1">Today's Question ✦</p>
                <p className="font-display text-xl font-bold text-gradient mb-3">{todayQ.question}</p>
                <div className="flex flex-wrap gap-3">
                  {todayQ.answers?.map((a: { username: string; display_name: string; answer: string }) => (
                    <div key={a.username} className={`flex-1 min-w-[140px] p-3 rounded-2xl border ${
                      a.username === 'manuuu' ? 'bg-pink-50 border-pink-200' : 'bg-purple-50 border-purple-200'
                    }`}>
                      <p className="text-xs font-bold mb-1" style={{ color: a.username === 'manuuu' ? '#be185d' : '#7c3aed' }}>
                        {a.username === 'manuuu' ? '🎀' : '🖤'} {a.display_name}
                      </p>
                      <p className="text-sm font-handwriting text-stone-600">{a.answer}</p>
                    </div>
                  ))}
                  {(!todayQ.answers || todayQ.answers.length < 2) && (
                    <Link to="/questions" className="btn-primary text-sm py-2 px-4 self-center">
                      Answer ✨
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick nav grid ── */}
        <div>
          <h2 className="font-display text-2xl font-bold text-gradient mb-1">Explore ✦</h2>
          <p className="font-handwriting text-pink-400 text-lg mb-4">Everything that's ours 🎀🖤</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {QUICK.map(({ to, emoji, label, color }) => (
              <Link key={to} to={to}
                className={`bg-gradient-to-br ${color} border rounded-3xl p-4 text-center 
                  hover:-translate-y-1.5 hover:shadow-kawaii transition-all duration-200 group`}>
                <div className="text-3xl mb-2 group-hover:animate-bounce-soft">{emoji}</div>
                <p className="text-xs font-semibold text-stone-600 leading-tight">{label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Recent photos ── */}
        {recentPhotos && recentPhotos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-gradient mb-0.5">Recent Memories 📸</h2>
                <p className="font-handwriting text-pink-400">Her latest moments 🌸</p>
              </div>
              <Link to="/gallery" className="btn-secondary text-sm py-2 px-4">View all →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {recentPhotos.map((p: { id: string; original_name: string }) => (
                <Link key={p.id} to="/gallery" className="polaroid block hover:scale-105">
                  <img src={`/api/photos/${p.id}/file?token=${token||localStorage.getItem('olu_token')||''}`} alt={p.original_name}
                    className="w-full aspect-square object-cover" loading="lazy" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="text-center py-8 border-t border-pink-100">
          <div className="flex justify-center gap-4 text-2xl mb-3">
            <span className="animate-wiggle">🎀</span>
            <span className="animate-heartbeat text-3xl">💗</span>
            <span className="animate-wiggle" style={{ animationDelay: '0.3s' }}>🖤</span>
          </div>
          <p className="font-handwriting text-2xl text-gradient">
            Two little worlds, one little universe. ✦
          </p>
          <p className="font-handwriting text-pink-300 mt-1">Divs & Manuuu forever 💗</p>
        </div>

      </div>
    </div>
  );
}
