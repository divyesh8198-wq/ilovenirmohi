import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Plus, Send, Trash2, Heart, Lock, Unlock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const MOODS = ['💗 Romantic', '😊 Happy', '🥺 Missing You', '🙏 Grateful', '✨ Inspired', '😔 Sad'];

interface Letter {
  id: string;
  subject: string;
  content: string;
  mood?: string;
  author_display_name: string;
  author_username: string;
  is_draft: boolean;
  created_at: string;
}

function LetterCard({ letter, isOwn, onDelete }: {
  letter: Letter; isOwn: boolean; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`glass-card cursor-pointer hover:-translate-y-0.5 transition-all group ${open ? 'ring-2 ring-blush-200' : ''}`}
      onClick={() => setOpen(!open)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {letter.mood && <span className="text-xs">{letter.mood.split(' ')[0]}</span>}
              {letter.is_draft
                ? <span className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock size={10} />Draft</span>
                : <span className="text-xs bg-blush-100 text-blush-500 px-2 py-0.5 rounded-full flex items-center gap-1"><Unlock size={10} />Sent</span>
              }
            </div>
            <h3 className="font-display text-rose-wine text-base">{letter.subject}</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {isOwn ? 'You' : letter.author_display_name} · {format(parseISO(letter.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          {isOwn && (
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-rose-500 transition-all">
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {open && (
          <div className="mt-4 pt-4 border-t border-blush-100 animate-fade-in">
            <p className="font-handwriting text-stone-600 leading-relaxed whitespace-pre-wrap text-base">
              {letter.content}
            </p>
            <p className="font-handwriting text-blush-400 text-right mt-4 text-lg">
              — {letter.author_display_name} 💗
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LettersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(MOODS[0]);
  const [isDraft, setIsDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  const { data: letters = [], isLoading } = useQuery<Letter[]>({
    queryKey: ['letters'],
    queryFn: () => axios.get('/api/letters').then(r => r.data),
  });

  const received = letters.filter(l => l.author_username !== user?.username && !l.is_draft);
  const sent = letters.filter(l => l.author_username === user?.username);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !content) return;
    setSaving(true);
    try {
      await axios.post('/api/letters', { subject, content, mood, is_draft: isDraft });
      qc.invalidateQueries({ queryKey: ['letters'] });
      setShowCompose(false); setSubject(''); setContent(''); setMood(MOODS[0]);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this letter?')) return;
    await axios.delete(`/api/letters/${id}`);
    qc.invalidateQueries({ queryKey: ['letters'] });
  }

  const displayed = tab === 'received' ? received : sent;

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Love Letters 💌</h1>
          <p className="section-subtitle">Words straight from the heart</p>
        </div>
        <button onClick={() => setShowCompose(!showCompose)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Write a Letter
        </button>
      </div>

      {showCompose && (
        <div className="glass-card p-6 mb-8 animate-slide-up bg-gradient-to-br from-white to-blush-50">
          <h3 className="font-display text-xl text-rose-wine mb-5">Dear {user?.username === 'divs' ? 'Manuuu' : 'Divs'} 💌</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Subject..." className="input-dreamy font-display" required />
            <div>
              <label className="text-xs text-stone-500 mb-2 block">Mood</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => (
                  <button key={m} type="button" onClick={() => setMood(m)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${mood === m ? 'bg-blush-200 text-rose-wine ring-2 ring-blush-300' : 'bg-cream-200 text-stone-500 hover:bg-blush-100'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Write from your heart..."
              className="input-dreamy resize-none h-48 font-handwriting text-base leading-relaxed" required />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)}
                  className="rounded border-blush-300 text-blush-400" />
                <span className="text-sm text-stone-500 flex items-center gap-1"><Lock size={12} /> Save as draft (private)</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCompose(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <span className="animate-spin">💗</span> : isDraft ? <Lock size={16} /> : <Send size={16} />}
                  {isDraft ? 'Save Draft' : 'Send Letter'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-cream-200 rounded-xl p-1 mb-6 max-w-xs">
        {(['received', 'sent'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${tab === t ? 'bg-white text-rose-wine shadow-sm' : 'text-stone-500'}`}>
            {t === 'received' ? '💌 Received' : '✉️ Sent'} {t === 'received' ? `(${received.length})` : `(${sent.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-cream-200 rounded-2xl shimmer" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">💌</div>
          <p className="font-handwriting text-2xl text-blush-300 mb-2">
            {tab === 'received' ? 'No letters yet' : "You haven't written yet"}
          </p>
          <p className="text-stone-400 text-sm">
            {tab === 'received' ? 'Letters from your partner will appear here' : 'Write your first love letter!'}
          </p>
          {tab === 'sent' && (
            <button onClick={() => setShowCompose(true)} className="btn-primary mt-4">
              <Heart size={16} className="inline mr-2" />Write a Letter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(l => (
            <LetterCard key={l.id} letter={l}
              isOwn={l.author_username === user?.username}
              onDelete={() => handleDelete(l.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
