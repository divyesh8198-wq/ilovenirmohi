import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Lock, Plus, Trash2, BookOpen, Edit3, Save, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😔', label: 'Sad' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😌', label: 'Peaceful' },
  { emoji: '🤔', label: 'Thoughtful' },
  { emoji: '✨', label: 'Inspired' },
  { emoji: '😴', label: 'Tired' },
];

interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export default function DiaryPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<DiaryEntry | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('😊');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: entries = [], isLoading } = useQuery<DiaryEntry[]>({
    queryKey: ['diary'],
    queryFn: () => axios.get('/api/diary').then(r => r.data),
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !content) return;
    setSaving(true);
    try {
      await axios.post('/api/diary', { title, content, mood, tags });
      qc.invalidateQueries({ queryKey: ['diary'] });
      setShowNew(false); setTitle(''); setContent(''); setMood('😊'); setTags('');
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this diary entry? This cannot be undone.')) return;
    await axios.delete(`/api/diary/${id}`);
    qc.invalidateQueries({ queryKey: ['diary'] });
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Privacy banner */}
      <div className="flex items-center gap-3 p-4 mb-6 bg-gradient-to-r from-stone-50 to-cream border border-stone-200 rounded-2xl">
        <Lock size={18} className="text-stone-400 flex-shrink-0" />
        <p className="text-sm text-stone-500">
          <span className="font-medium text-stone-600">Your diary is completely private.</span>{' '}
          Only you can see these entries. They are never shared with your partner. 🔒
        </p>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">My Diary 📔</h1>
          <p className="section-subtitle">Your private space, just for you</p>
        </div>
        <button onClick={() => { setShowNew(true); setSelected(null); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Entry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry list */}
        <div className="lg:col-span-1 space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-cream-200 rounded-2xl shimmer" />)
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-handwriting text-lg text-blush-300">Your story begins here</p>
              <button onClick={() => setShowNew(true)} className="btn-primary mt-4 text-sm py-2">Write first entry</button>
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id}
                className={`glass-card p-4 cursor-pointer hover:-translate-y-0.5 transition-all group ${selected?.id === entry.id ? 'ring-2 ring-blush-300' : ''}`}
                onClick={() => { setSelected(entry); setShowNew(false); }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{entry.mood || '📔'}</span>
                      <span className="text-xs text-stone-400">{format(parseISO(entry.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <h3 className="font-medium text-rose-wine text-sm truncate">{entry.title}</h3>
                    <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{entry.content}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-rose-500 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Entry viewer / New entry form */}
        <div className="lg:col-span-2">
          {showNew ? (
            <div className="glass-card p-6 animate-slide-up">
              <h3 className="font-display text-xl text-rose-wine mb-5 flex items-center gap-2">
                <Edit3 size={18} /> New Entry
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Title..." className="input-dreamy font-display" required />
                <div>
                  <label className="text-xs text-stone-500 mb-2 block">How are you feeling?</label>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map(m => (
                      <button key={m.emoji} type="button" onClick={() => setMood(m.emoji)}
                        title={m.label}
                        className={`w-9 h-9 rounded-full text-xl transition-all hover:scale-110 ${mood === m.emoji ? 'ring-2 ring-blush-300 scale-110 bg-blush-50' : 'hover:bg-cream-200'}`}>
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Write your thoughts..."
                  className="input-dreamy resize-none h-52 font-body text-sm leading-relaxed" required />
                <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                  placeholder="Tags (comma separated): feelings, thoughts..." className="input-dreamy text-sm" />
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                    {saving ? <span className="animate-spin">💗</span> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Entry'}
                  </button>
                  <button type="button" onClick={() => setShowNew(false)} className="btn-ghost flex items-center gap-2">
                    <X size={16} /> Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : selected ? (
            <div className="glass-card p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selected.mood || '📔'}</span>
                  <div>
                    <h2 className="font-display text-xl text-rose-wine">{selected.title}</h2>
                    <p className="text-xs text-stone-400">{format(parseISO(selected.created_at), 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(selected.id)}
                  className="p-2 text-stone-300 hover:text-rose-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              {selected.tags && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="text-xs bg-lavender-100 text-lavender-500 px-2 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                <p className="font-body text-stone-600 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 flex items-center justify-center h-64 text-center text-stone-400">
              <div>
                <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-handwriting text-lg">Select an entry or write a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
