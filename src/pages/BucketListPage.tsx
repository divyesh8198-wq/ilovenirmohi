import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Star, Check, Trash2 } from 'lucide-react';

const CATEGORIES = ['Travel', 'Food', 'Experience', 'Creative', 'Adventure', 'Romantic'];
const CAT_EMOJIS: Record<string, string> = {
  Travel: '✈️', Food: '🍜', Experience: '🎭', Creative: '🎨', Adventure: '🏔️', Romantic: '💗',
};

interface BucketItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: number;
  completed: boolean;
  completed_date?: string;
  creator_display_name: string;
}

function PriorityStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={11}
          className={n <= (value || 0) ? 'text-amber-400' : 'text-stone-200'}
          fill={n <= (value || 0) ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

export default function BucketListPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [catFilter, setCatFilter] = useState<string>('All');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(3);
  const [saving, setSaving] = useState(false);

  const { data: items = [], isLoading } = useQuery<BucketItem[]>({
    queryKey: ['bucket-list'],
    queryFn: () => axios.get('/api/bucket-list').then(r => r.data),
  });

  const filtered = catFilter === 'All' ? items : items.filter(i => i.category === catFilter);
  const completed = filtered.filter(i => i.completed).length;
  const total = filtered.length;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setSaving(true);
    try {
      await axios.post('/api/bucket-list', { title, description: desc, category: cat, priority });
      qc.invalidateQueries({ queryKey: ['bucket-list'] });
      setShowForm(false); setTitle(''); setDesc('');
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function toggleComplete(item: BucketItem) {
    await axios.patch(`/api/bucket-list/${item.id}`, {
      completed: !item.completed,
      completed_date: !item.completed ? new Date().toISOString().split('T')[0] : null,
    });
    qc.invalidateQueries({ queryKey: ['bucket-list'] });
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove from bucket list?')) return;
    await axios.delete(`/api/bucket-list/${id}`);
    qc.invalidateQueries({ queryKey: ['bucket-list'] });
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Bucket List ✨</h1>
          <p className="section-subtitle">Dreams we'll chase together</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Dream
        </button>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-handwriting text-blush-400 text-lg">{completed} of {total} adventures completed ✦</p>
            <p className="text-sm font-medium text-rose-wine">{Math.round((completed / total) * 100)}%</p>
          </div>
          <div className="h-2 bg-blush-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blush-300 to-lavender-400 rounded-full transition-all duration-500"
              style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </div>
      )}

      {showForm && (
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <h3 className="font-display text-lg text-rose-wine mb-4">Add a Dream ✨</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Something we dream of doing..." className="input-dreamy" required />
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Tell me more about this dream..." className="input-dreamy resize-none h-20" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Category</label>
                <select value={cat} onChange={e => setCat(e.target.value)} className="input-dreamy">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Priority</label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setPriority(n)}>
                      <Star size={20} className={n <= priority ? 'text-amber-400' : 'text-stone-200'}
                        fill={n <= priority ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="animate-spin">💗</span> : <Star size={16} />}
                {saving ? 'Saving...' : 'Add to List'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['All', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-3 py-1.5 rounded-full text-sm transition-all ${catFilter === c ? 'bg-blush-200 text-rose-wine ring-2 ring-blush-300' : 'bg-cream-200 text-stone-500 hover:bg-blush-100'}`}>
            {c !== 'All' && CAT_EMOJIS[c]} {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-cream-200 rounded-2xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✨</div>
          <p className="font-handwriting text-2xl text-blush-300 mb-2">Dream big together!</p>
          <p className="text-stone-400 text-sm">Add dreams and adventures you want to experience.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Incomplete first */}
          {[...filtered.filter(i => !i.completed), ...filtered.filter(i => i.completed)].map(item => (
            <div key={item.id}
              className={`glass-card p-4 group transition-all hover:-translate-y-0.5 ${item.completed ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleComplete(item)}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
                    ${item.completed ? 'bg-blush-300 border-blush-300 text-white' : 'border-blush-200 hover:border-blush-400'}`}>
                  {item.completed && <Check size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{CAT_EMOJIS[item.category || 'Experience']}</span>
                    <PriorityStars value={item.priority || 0} />
                  </div>
                  <h3 className={`font-medium text-sm ${item.completed ? 'line-through text-stone-400' : 'text-rose-wine'}`}>
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  {item.completed && item.completed_date && (
                    <p className="text-xs text-blush-400 mt-1">✓ Done!</p>
                  )}
                </div>
                <button onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-rose-500 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
