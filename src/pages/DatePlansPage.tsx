import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Heart, Check, Trash2, MapPin, IndianRupee } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUSES = ['idea', 'planned', 'done'] as const;
const STATUS_LABELS: Record<string, string> = { idea: '💡 Ideas', planned: '📅 Planned', done: '✓ Done' };
const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-lavender-50 border-lavender-200',
  planned: 'bg-blush-50 border-blush-200',
  done: 'bg-cream border-cream-300',
};

interface DatePlan {
  id: string;
  title: string;
  description?: string;
  location?: string;
  planned_date?: string;
  budget?: number;
  status: string;
  rating?: number;
  creator_display_name: string;
}

function RatingStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Heart key={n} size={14}
          className={`${n <= value ? 'text-blush-400' : 'text-stone-200'} ${onChange ? 'cursor-pointer hover:text-blush-300' : ''} transition-colors`}
          fill={n <= value ? 'currentColor' : 'none'}
          onClick={() => onChange?.(n)} />
      ))}
    </div>
  );
}

export default function DatePlansPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [loc, setLoc] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: plans = [], isLoading } = useQuery<DatePlan[]>({
    queryKey: ['date-plans'],
    queryFn: () => axios.get('/api/date-plans').then(r => r.data),
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    setSaving(true);
    try {
      await axios.post('/api/date-plans', {
        title, description: desc, location: loc,
        planned_date: date || null, budget: budget ? Number(budget) : null,
        status: 'idea',
      });
      qc.invalidateQueries({ queryKey: ['date-plans'] });
      setShowForm(false); setTitle(''); setDesc(''); setLoc(''); setDate(''); setBudget('');
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    await axios.patch(`/api/date-plans/${id}`, { status });
    qc.invalidateQueries({ queryKey: ['date-plans'] });
  }

  async function updateRating(id: string, rating: number) {
    await axios.patch(`/api/date-plans/${id}`, { rating });
    qc.invalidateQueries({ queryKey: ['date-plans'] });
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this date plan?')) return;
    await axios.delete(`/api/date-plans/${id}`);
    qc.invalidateQueries({ queryKey: ['date-plans'] });
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Date Planner 🌹</h1>
          <p className="section-subtitle">Plan the most beautiful moments together</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Date Idea
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <h3 className="font-display text-lg text-rose-wine mb-4">New Date Idea 🌹</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Date idea *" className="input-dreamy" required />
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Describe your dream date..." className="input-dreamy resize-none h-20" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input type="text" value={loc} onChange={e => setLoc(e.target.value)}
                placeholder="📍 Location" className="input-dreamy" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="input-dreamy" />
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="Budget" className="input-dreamy pl-8" min="0" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="animate-spin">💗</span> : <Heart size={16} />}
                {saving ? 'Saving...' : 'Save Idea'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-cream-200 rounded-2xl shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATUSES.map(status => (
            <div key={status}>
              <h2 className="font-display text-base text-rose-wine mb-3 flex items-center gap-2">
                {STATUS_LABELS[status]}
                <span className="text-xs bg-blush-100 text-blush-500 px-2 py-0.5 rounded-full">
                  {plans.filter(p => p.status === status).length}
                </span>
              </h2>
              <div className={`min-h-32 rounded-2xl border-2 border-dashed p-3 space-y-3 ${STATUS_COLORS[status]}`}>
                {plans.filter(p => p.status === status).map(plan => (
                  <div key={plan.id} className="bg-white rounded-xl p-4 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-rose-wine text-sm">{plan.title}</h3>
                      <button onClick={() => handleDelete(plan.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-rose-500 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {plan.description && <p className="text-xs text-stone-500 mb-2 line-clamp-2">{plan.description}</p>}
                    <div className="space-y-1">
                      {plan.location && (
                        <p className="text-xs text-stone-400 flex items-center gap-1">
                          <MapPin size={10} /> {plan.location}
                        </p>
                      )}
                      {plan.planned_date && (
                        <p className="text-xs text-stone-400">📅 {format(parseISO(plan.planned_date), 'MMM d, yyyy')}</p>
                      )}
                      {plan.budget && (
                        <p className="text-xs text-stone-400 flex items-center gap-1">
                          <IndianRupee size={10} /> {plan.budget.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                    {status === 'done' && (
                      <div className="mt-2 pt-2 border-t border-stone-100">
                        <RatingStars value={plan.rating || 0} onChange={v => updateRating(plan.id, v)} />
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-3">
                      {STATUSES.filter(s => s !== status).map(s => (
                        <button key={s} onClick={() => updateStatus(plan.id, s)}
                          className="text-xs px-2 py-1 rounded-lg bg-cream-200 text-stone-500 hover:bg-blush-100 hover:text-rose-wine transition-all flex items-center gap-1">
                          {s === 'done' && <Check size={10} />}
                          Move to {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {plans.filter(p => p.status === status).length === 0 && (
                  <div className="text-center py-6 text-stone-400 text-xs">
                    {status === 'idea' ? 'Add your first date idea! 🌹' :
                     status === 'planned' ? 'Move ideas here when planned 📅' :
                     'Completed dates show here ✓'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
