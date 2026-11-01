import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Clock, Image, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Memory {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  uploader_display_name: string;
  created_at: string;
  photos?: { id: string }[];
}

function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-card p-5 hover:shadow-glow transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-blush-100 text-blush-500 px-2 py-0.5 rounded-full">
              {format(parseISO(memory.event_date), 'MMM d, yyyy')}
            </span>
            {memory.location && (
              <span className="text-xs text-stone-400">📍 {memory.location}</span>
            )}
          </div>
          <h3 className="font-display text-lg text-rose-wine mb-1">{memory.title}</h3>
          {memory.description && (
            <div>
              <p className={`text-stone-500 text-sm ${!expanded ? 'line-clamp-2' : ''}`}>
                {memory.description}
              </p>
              {memory.description.length > 120 && (
                <button onClick={() => setExpanded(!expanded)}
                  className="text-xs text-blush-400 flex items-center gap-1 mt-1 hover:text-blush-600">
                  {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-stone-400 mt-2">Added by {memory.uploader_display_name}</p>
        </div>
        <button onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-rose-500 transition-all flex-shrink-0">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: memories = [], isLoading } = useQuery<Memory[]>({
    queryKey: ['memories'],
    queryFn: () => axios.get('/api/memories').then(r => r.data),
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    setSaving(true);
    try {
      await axios.post('/api/memories', { title, description: desc, event_date: date, location });
      qc.invalidateQueries({ queryKey: ['memories'] });
      setShowForm(false); setTitle(''); setDesc(''); setDate(''); setLocation('');
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this memory?')) return;
    await axios.delete(`/api/memories/${id}`);
    qc.invalidateQueries({ queryKey: ['memories'] });
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Memory Timeline ⏳</h1>
          <p className="section-subtitle">Every chapter of our story</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Memory
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <h3 className="font-display text-lg text-rose-wine mb-4">New Memory ✦</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What happened? *" className="input-dreamy" required />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="input-dreamy" required />
              </div>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Location (optional)" className="input-dreamy" />
            </div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Describe this memory..." className="input-dreamy resize-none h-24" />
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="animate-spin">💗</span> : <Clock size={16} />}
                {saving ? 'Saving...' : 'Save Memory'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-cream-200 rounded-2xl shimmer" />)}
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">⏳</div>
          <p className="font-handwriting text-2xl text-blush-300 mb-2">Your story starts here</p>
          <p className="text-stone-400 text-sm mb-4">Add your first memory to begin your timeline!</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} className="inline mr-2" />Add First Memory
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blush-200 via-lavender-200 to-blush-100" />
          <div className="space-y-6 pl-12">
            {memories.map((m, i) => (
              <div key={m.id} className="relative animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                {/* Dot */}
                <div className="absolute -left-12 top-5 w-5 h-5 rounded-full bg-gradient-to-br from-blush-300 to-lavender-400 shadow-md flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <MemoryCard memory={m} onDelete={() => handleDelete(m.id)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
