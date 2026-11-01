import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Trash2, Timer } from 'lucide-react';
import { format, parseISO, differenceInSeconds, isPast } from 'date-fns';

const CAT_EMOJIS: Record<string, string> = {
  anniversary: '💍', birthday: '🎂', trip: '✈️', special: '✨', default: '⏰',
};
const COMMON_EMOJIS = ['💍', '🎂', '✈️', '✨', '💗', '🎉', '🌸', '⭐', '🌙', '🎵', '🏖️', '🎄'];

interface Countdown {
  id: string;
  title: string;
  target_date: string;
  category?: string;
  emoji?: string;
  creator_display_name: string;
}

function CountdownCard({ cd }: { cd: Countdown }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0, done: false });

  useEffect(() => {
    function update() {
      const now = new Date();
      const target = parseISO(cd.target_date);
      if (isPast(target)) { setTime({ d: 0, h: 0, m: 0, s: 0, done: true }); return; }
      const diff = differenceInSeconds(target, now);
      setTime({
        d: Math.floor(diff / 86400),
        h: Math.floor((diff % 86400) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
        done: false,
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [cd.target_date]);

  const urgent = !time.done && time.d < 7;

  return (
    <div className={`glass-card p-5 text-center hover:-translate-y-1 transition-all ${urgent ? 'ring-2 ring-blush-300 shadow-glow' : ''}`}>
      <div className="text-4xl mb-2">{cd.emoji || CAT_EMOJIS[cd.category || ''] || '⏰'}</div>
      <h3 className="font-display text-rose-wine text-base mb-1 line-clamp-2">{cd.title}</h3>
      <p className="text-xs text-stone-400 mb-4">{format(parseISO(cd.target_date), 'MMM d, yyyy')}</p>
      {time.done ? (
        <p className="font-handwriting text-2xl text-blush-400 animate-heartbeat">It's here! 🎉</p>
      ) : (
        <div className="flex justify-center gap-2">
          {[['d', time.d], ['h', time.h], ['m', time.m], ['s', time.s]].map(([u, v]) => (
            <div key={u as string} className="bg-gradient-to-b from-blush-50 to-lavender-50 rounded-xl px-2 py-2 min-w-[48px]">
              <div className="font-display text-2xl text-rose-wine font-bold leading-none">
                {String(v).padStart(2, '0')}
              </div>
              <div className="text-xs text-stone-400 mt-0.5">{u}</div>
            </div>
          ))}
        </div>
      )}
      {urgent && !time.done && (
        <p className="text-xs text-blush-400 mt-3 animate-pulse">Almost here! 💗</p>
      )}
    </div>
  );
}

export default function CountdownsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [cat, setCat] = useState('special');
  const [emoji, setEmoji] = useState('✨');
  const [saving, setSaving] = useState(false);

  const { data: countdowns = [], isLoading } = useQuery<Countdown[]>({
    queryKey: ['countdowns'],
    queryFn: () => axios.get('/api/countdowns').then(r => r.data),
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    setSaving(true);
    try {
      await axios.post('/api/countdowns', { title, target_date: date, category: cat, emoji });
      qc.invalidateQueries({ queryKey: ['countdowns'] });
      setShowForm(false); setTitle(''); setDate('');
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this countdown?')) return;
    await axios.delete(`/api/countdowns/${id}`);
    qc.invalidateQueries({ queryKey: ['countdowns'] });
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Countdowns ⏰</h1>
          <p className="section-subtitle">Every special day, counted down</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Countdown
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <h3 className="font-display text-lg text-rose-wine mb-4">New Countdown ⏰</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What are we counting down to? *" className="input-dreamy" required />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Target Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="input-dreamy" required />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Category</label>
                <select value={cat} onChange={e => setCat(e.target.value)} className="input-dreamy">
                  {['anniversary', 'birthday', 'trip', 'special'].map(c => (
                    <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-2 block">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setEmoji(e)}
                    className={`w-9 h-9 rounded-lg text-xl transition-all hover:scale-110 ${emoji === e ? 'bg-blush-100 ring-2 ring-blush-300 scale-110' : 'hover:bg-cream-200'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="animate-spin">💗</span> : <Timer size={16} />}
                {saving ? 'Saving...' : 'Add Countdown'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-cream-200 rounded-2xl shimmer" />)}
        </div>
      ) : countdowns.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⏰</div>
          <p className="font-handwriting text-2xl text-blush-300 mb-2">No countdowns yet</p>
          <p className="text-stone-400 text-sm mb-4">Count down to birthdays, anniversaries, trips!</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} className="inline mr-2" />Add First Countdown
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {countdowns
            .sort((a, b) => a.target_date.localeCompare(b.target_date))
            .map(cd => (
              <div key={cd.id} className="relative group">
                <CountdownCard cd={cd} />
                <button onClick={() => handleDelete(cd.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-white rounded-lg shadow text-stone-300 hover:text-rose-500 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
