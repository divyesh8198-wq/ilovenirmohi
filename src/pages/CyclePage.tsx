import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Plus, Globe, Lock, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Mood swings', 'Acne', 'Tender breasts'];
const MOODS = [
  { emoji: '😊', label: 'Good' },
  { emoji: '😔', label: 'Low' },
  { emoji: '😤', label: 'Irritable' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '💪', label: 'Strong' },
];
const FLOW = ['light', 'medium', 'heavy', 'spotting'];

interface CycleEntry {
  id: string;
  start_date: string;
  end_date?: string;
  flow_level?: string;
  symptoms?: string;
  mood?: string;
  notes?: string;
  is_shared: boolean;
}

interface CyclePrediction {
  predicted_next: string | null;
  avg_cycle_length: number;
}

export default function CyclePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [flow, setFlow] = useState('medium');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState('😊');
  const [notes, setNotes] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  // Server also enforces this, but redirect non-manuuu for UX
  if (user?.username !== 'manuuu') {
    return (
      <div className="page-container text-center py-20">
        <div className="text-6xl mb-4">🔒</div>
        <p className="font-display text-xl text-rose-wine mb-2">This page is private</p>
        <p className="text-stone-400">The cycle tracker belongs to Manuuu only.</p>
        <Navigate to="/" replace />
      </div>
    );
  }

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return;
    setSaving(true);
    try {
      await axios.post('/api/cycle', {
        start_date: startDate,
        end_date: endDate || null,
        flow_level: flow,
        symptoms: symptoms.join(', '),
        mood,
        notes,
        is_shared: isShared,
      });
      qc.invalidateQueries({ queryKey: ['cycle'] });
      qc.invalidateQueries({ queryKey: ['cycle-prediction'] });
      setShowForm(false); setStartDate(''); setEndDate(''); setSymptoms([]); setNotes('');
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this cycle log?')) return;
    await axios.delete(`/api/cycle/${id}`);
    qc.invalidateQueries({ queryKey: ['cycle'] });
    qc.invalidateQueries({ queryKey: ['cycle-prediction'] });
  }

  async function toggleShare(entry: CycleEntry) {
    await axios.patch(`/api/cycle/${entry.id}`, { is_shared: !entry.is_shared });
    qc.invalidateQueries({ queryKey: ['cycle'] });
  }

  const { data: cycles = [], isLoading } = useQuery<CycleEntry[]>({
    queryKey: ['cycle'],
    queryFn: () => axios.get('/api/cycle').then(r => r.data),
  });

  const { data: prediction } = useQuery<CyclePrediction>({
    queryKey: ['cycle-prediction'],
    queryFn: () => axios.get('/api/cycle/prediction').then(r => r.data).catch(() => null),
  });

  return (
    <div className="page-container animate-fade-in">
      {/* Privacy header */}
      <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 border border-rose-200 rounded-2xl">
        <Lock size={18} className="text-rose-400 flex-shrink-0" />
        <p className="text-sm text-rose-700">
          <span className="font-medium">This is your private cycle tracker.</span>{' '}
          Only you can see your logs. You control what (if anything) to share.
        </p>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Cycle Tracker 🌙</h1>
          <p className="section-subtitle">Your body, your record</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Log Period
        </button>
      </div>

      {/* Prediction card */}
      {prediction?.predicted_next && (
        <div className="glass-card p-5 mb-8 bg-gradient-to-br from-rose-50 to-blush-50 border-blush-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-handwriting text-blush-400 text-lg mb-1">Next predicted period 🌙</p>
              <p className="font-display text-2xl text-rose-wine">
                {format(parseISO(prediction.predicted_next), 'MMMM d, yyyy')}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Based on avg cycle of {prediction.avg_cycle_length} days
              </p>
            </div>
            <div className="text-5xl animate-float">🌙</div>
          </div>
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <h3 className="font-display text-lg text-rose-wine mb-5">Log your period 🌸</h3>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Start Date *</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="input-dreamy" required />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="input-dreamy" />
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-2 block">Flow Level</label>
              <div className="flex gap-2">
                {FLOW.map(f => (
                  <button key={f} type="button" onClick={() => setFlow(f)}
                    className={`px-3 py-1.5 rounded-full text-sm capitalize transition-all ${flow === f ? 'bg-rose-200 text-rose-700 ring-2 ring-rose-300' : 'bg-cream-200 text-stone-500 hover:bg-rose-100'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-2 block">Symptoms</label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSymptom(s)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${symptoms.includes(s) ? 'bg-blush-200 text-rose-wine ring-2 ring-blush-300' : 'bg-cream-200 text-stone-500 hover:bg-blush-100'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-2 block">Mood</label>
              <div className="flex gap-3">
                {MOODS.map(m => (
                  <button key={m.emoji} type="button" onClick={() => setMood(m.emoji)}
                    title={m.label}
                    className={`w-10 h-10 rounded-full text-xl transition-all hover:scale-110 ${mood === m.emoji ? 'ring-2 ring-blush-300 scale-110 bg-blush-50' : 'hover:bg-cream-200'}`}>
                    {m.emoji}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any notes for yourself..." className="input-dreamy resize-none h-20" />

            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setIsShared(!isShared)}
                className={`w-11 h-6 rounded-full transition-colors relative ${isShared ? 'bg-blush-400' : 'bg-stone-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${isShared ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-stone-500">
                {isShared
                  ? <span className="flex items-center gap-1"><Globe size={14} className="text-blush-400" /> Share predicted date with Divs (details stay private)</span>
                  : <span className="flex items-center gap-1"><Lock size={14} /> Keep completely private</span>}
              </span>
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <span className="animate-spin">💗</span> : '🌸'}
                {saving ? 'Saving...' : 'Save Log'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      <h2 className="font-display text-lg text-rose-wine mb-4">Your History</h2>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-cream-200 rounded-2xl shimmer" />)}
        </div>
      ) : cycles.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <div className="text-5xl mb-3">🌙</div>
          <p className="font-handwriting text-xl text-blush-300">No logs yet. Start tracking!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cycles.map(entry => (
            <div key={entry.id} className="glass-card p-5 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{entry.mood || '🌙'}</span>
                    <div>
                      <p className="font-medium text-rose-wine text-sm">
                        {format(parseISO(entry.start_date), 'MMM d, yyyy')}
                        {entry.end_date && ` – ${format(parseISO(entry.end_date), 'MMM d')}`}
                      </p>
                      {entry.flow_level && (
                        <p className="text-xs text-stone-400 capitalize">{entry.flow_level} flow</p>
                      )}
                    </div>
                  </div>
                  {entry.symptoms && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {entry.symptoms.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                        <span key={s} className="text-xs bg-rose-100 text-rose-500 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                  {entry.notes && <p className="text-xs text-stone-500 italic">{entry.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleShare(entry)}
                    className="p-1.5 text-stone-300 hover:text-blush-400 transition-colors"
                    title={entry.is_shared ? 'Stop sharing' : 'Share predicted date'}>
                    {entry.is_shared ? <Globe size={14} className="text-blush-400" /> : <Lock size={14} />}
                  </button>
                  <button onClick={() => handleDelete(entry.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-rose-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
