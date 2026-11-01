import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, parseISO } from 'date-fns';

const CATEGORIES = ['anniversary', 'birthday', 'date', 'reminder', 'other'];
const CAT_COLORS: Record<string, string> = {
  anniversary: 'bg-rose-400',
  birthday: 'bg-amber-400',
  date: 'bg-blush-400',
  reminder: 'bg-lavender-400',
  other: 'bg-stone-400',
};
const CAT_EMOJIS: Record<string, string> = {
  anniversary: '💍', birthday: '🎂', date: '🌹', reminder: '🔔', other: '📌',
};

interface CalEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  category: string;
  color?: string;
  creator_display_name: string;
}

export default function CalendarPage() {
  const qc = useQueryClient();
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [time, setTime] = useState('');
  const [cat, setCat] = useState('reminder');
  const [saving, setSaving] = useState(false);

  const { data: events = [] } = useQuery<CalEvent[]>({
    queryKey: ['calendar'],
    queryFn: () => axios.get('/api/calendar').then(r => r.data),
  });

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = monthStart.getDay();

  function eventsOn(day: Date) {
    return events.filter(e => isSameDay(parseISO(e.event_date), day));
  }

  const selectedEvents = selected ? eventsOn(selected) : [];

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !selected) return;
    setSaving(true);
    try {
      await axios.post('/api/calendar', {
        title, description: desc, event_date: format(selected, 'yyyy-MM-dd'),
        event_time: time || null, category: cat,
      });
      qc.invalidateQueries({ queryKey: ['calendar'] });
      setShowForm(false); setTitle(''); setDesc(''); setTime('');
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await axios.delete(`/api/calendar/${id}`);
    qc.invalidateQueries({ queryKey: ['calendar'] });
  }

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Our Calendar 📅</h1>
          <p className="section-subtitle">Every important day, together</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 glass-card p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrent(subMonths(current, 1))}
              className="p-2 rounded-xl hover:bg-blush-50 text-stone-500 hover:text-rose-wine transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="font-display text-xl text-rose-wine">
              {format(current, 'MMMM yyyy')}
            </h2>
            <button onClick={() => setCurrent(addMonths(current, 1))}
              className="p-2 rounded-xl hover:bg-blush-50 text-stone-500 hover:text-rose-wine transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day of week headers */}
          <div className="grid grid-cols-7 mb-2">
            {DOW.map(d => (
              <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array(startDow).fill(null).map((_, i) => <div key={`e-${i}`} />)}
            {days.map(day => {
              const dayEvents = eventsOn(day);
              const isSelected = selected && isSameDay(day, selected);
              const isToday = isSameDay(day, new Date());
              return (
                <button key={day.toISOString()}
                  onClick={() => { setSelected(day); setShowForm(false); }}
                  className={`relative p-1 rounded-xl transition-all text-center min-h-[48px] flex flex-col items-center
                    ${isSelected ? 'bg-blush-200 ring-2 ring-blush-300' : isToday ? 'bg-lavender-50 ring-1 ring-lavender-200' : 'hover:bg-cream-200'}`}>
                  <span className={`text-sm font-medium ${isToday ? 'text-lavender-600' : isSelected ? 'text-rose-wine' : 'text-stone-600'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id}
                        className={`w-1.5 h-1.5 rounded-full ${CAT_COLORS[ev.category] || 'bg-stone-400'}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-blush-100">
            {CATEGORIES.map(c => (
              <div key={c} className="flex items-center gap-1.5 text-xs text-stone-500">
                <div className={`w-2 h-2 rounded-full ${CAT_COLORS[c]}`} />
                {CAT_EMOJIS[c]} {c}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {selected && (
            <div className="glass-card p-5 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-handwriting text-blush-400">{format(selected, 'EEEE')}</p>
                  <h3 className="font-display text-xl text-rose-wine">{format(selected, 'MMMM d, yyyy')}</h3>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                  className={`p-2 rounded-xl transition-all ${showForm ? 'bg-blush-100 text-rose-wine' : 'hover:bg-blush-50 text-stone-400'}`}>
                  {showForm ? <X size={18} /> : <Plus size={18} />}
                </button>
              </div>

              {showForm && (
                <form onSubmit={handleAdd} className="space-y-3 mb-4 pb-4 border-b border-blush-100">
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Event title *" className="input-dreamy text-sm" required />
                  <select value={cat} onChange={e => setCat(e.target.value)} className="input-dreamy text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>)}
                  </select>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="input-dreamy text-sm" />
                  <textarea value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="Notes..." className="input-dreamy text-sm resize-none h-16" />
                  <button type="submit" disabled={saving} className="btn-primary w-full text-sm py-2">
                    {saving ? '💗 Saving...' : '✦ Add Event'}
                  </button>
                </form>
              )}

              {selectedEvents.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-4">
                  No events · <button onClick={() => setShowForm(true)} className="text-blush-400 hover:underline">Add one?</button>
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map(ev => (
                    <div key={ev.id} className="flex items-start gap-3 group">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${CAT_COLORS[ev.category] || 'bg-stone-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-rose-wine text-sm">{ev.title}</p>
                        {ev.event_time && <p className="text-xs text-stone-400">🕐 {ev.event_time}</p>}
                        {ev.description && <p className="text-xs text-stone-400 mt-0.5">{ev.description}</p>}
                      </div>
                      <button onClick={() => handleDelete(ev.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-rose-500">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming events */}
          <div className="glass-card p-5">
            <h3 className="font-display text-base text-rose-wine mb-3">Upcoming Events ✦</h3>
            {events.length === 0 ? (
              <p className="text-stone-400 text-sm">No events yet. Add some important dates!</p>
            ) : (
              <div className="space-y-2">
                {events
                  .filter(e => new Date(e.event_date) >= new Date())
                  .sort((a, b) => a.event_date.localeCompare(b.event_date))
                  .slice(0, 5)
                  .map(ev => (
                    <div key={ev.id} className="flex items-center gap-3">
                      <span className="text-lg">{CAT_EMOJIS[ev.category]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-rose-wine truncate">{ev.title}</p>
                        <p className="text-xs text-stone-400">{format(parseISO(ev.event_date), 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
