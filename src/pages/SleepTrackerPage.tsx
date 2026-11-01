import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Moon, Sun, Heart, Sparkles, Send, Clock, Bed, Star } from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';

interface PartnerSleep {
  user: { id: string; username: string; displayName: string };
  isSleeping: boolean;
  fellAsleepAt: string | null;
  lastWokeUpAt: string | null;
  lastDuration: number | null;
  bedsideNote: string | null;
}

interface SleepHistoryItem {
  id: string;
  display_name: string;
  username: string;
  fell_asleep_at: string;
  woke_up_at: string;
  duration_minutes: number;
  sleep_quality?: string;
  bedside_note?: string;
}

export default function SleepTrackerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [bedsideMsg, setBedsideMsg] = useState('');
  const [sentNote, setSentNote] = useState(false);
  const [quality, setQuality] = useState('peaceful');
  const [updating, setUpdating] = useState(false);

  const { data: sleepStatus, isLoading } = useQuery<Record<string, PartnerSleep>>({
    queryKey: ['sleep-status'],
    queryFn: () => axios.get('/api/sleep/status').then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: history = [] } = useQuery<SleepHistoryItem[]>({
    queryKey: ['sleep-history'],
    queryFn: () => axios.get('/api/sleep/history').then(r => r.data),
  });

  const myData = user ? sleepStatus?.[user.username] : null;
  const partnerUsername = user?.username === 'manuuu' ? 'divs' : 'manuuu';
  const partnerData = sleepStatus?.[partnerUsername];

  const isMeSleeping = !!myData?.isSleeping;
  const isPartnerSleeping = !!partnerData?.isSleeping;

  async function handleToggleSleep() {
    setUpdating(true);
    try {
      await axios.post('/api/sleep/toggle', { quality });
      qc.invalidateQueries({ queryKey: ['sleep-status'] });
      qc.invalidateQueries({ queryKey: ['sleep-history'] });
    } finally {
      setUpdating(false);
    }
  }

  async function handleSendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!bedsideMsg.trim()) return;
    try {
      await axios.post('/api/sleep/note', { note: bedsideMsg.trim() });
      setSentNote(true);
      setBedsideMsg('');
      qc.invalidateQueries({ queryKey: ['sleep-status'] });
      setTimeout(() => setSentNote(false), 4000);
    } catch { /* ignore */ }
  }

  return (
    <div className="page-container animate-fade-in space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="section-title">Sleep & Dreamland 🌙</h1>
        <p className="section-subtitle">Knowing when my love is sleeping, dreaming, and waking up 💤✨</p>
      </div>

      {/* Main Sleep Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* My Status Card */}
        <div className={`glass-card p-6 text-center border-2 transition-all ${
          isMeSleeping ? 'bg-gradient-to-b from-indigo-950/20 to-purple-950/20 border-purple-300' : 'bg-gradient-to-b from-pink-50/50 to-rose-50/50 border-pink-200'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-stone-400">My Sleep Status</span>
            <span className="text-xl">{isMeSleeping ? '😴' : '☀️'}</span>
          </div>

          <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl shadow-inner mb-4 transition-transform hover:scale-105"
            style={{ background: isMeSleeping ? 'linear-gradient(135deg, #7c3aed, #4338ca)' : 'linear-gradient(135deg, #f472b6, #fb7185)' }}>
            {isMeSleeping ? <Moon size={40} className="text-yellow-200 animate-pulse" /> : <Sun size={40} className="text-yellow-100 animate-spin" style={{ animationDuration: '20s' }} />}
          </div>

          <h3 className="font-display text-2xl font-bold mb-1" style={{ color: isMeSleeping ? '#6366f1' : '#e11d48' }}>
            {isMeSleeping ? "You're Asleep in Dreamland 💤" : "You're Wide Awake 🌸"}
          </h3>

          <p className="text-stone-500 text-sm font-handwriting text-lg mb-6">
            {isMeSleeping && myData?.fellAsleepAt
              ? `Fell asleep ${formatDistanceToNow(parseISO(myData.fellAsleepAt), { addSuffix: true })}`
              : myData?.lastWokeUpAt
              ? `Woke up ${formatDistanceToNow(parseISO(myData.lastWokeUpAt), { addSuffix: true })}`
              : "Ready for bed or ready for a new day?"}
          </p>

          <button
            onClick={handleToggleSleep}
            disabled={updating}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
              isMeSleeping
                ? 'bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500'
                : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'
            }`}
          >
            {isMeSleeping ? "☀️ Good Morning! I'm Awake 🌸" : "🌙 Going to Sleep (Goodnight!) 😴💤"}
          </button>
        </div>

        {/* Partner Status Card */}
        <div className={`glass-card p-6 text-center border-2 transition-all ${
          isPartnerSleeping ? 'bg-gradient-to-b from-purple-900/10 to-indigo-900/10 border-purple-200' : 'bg-gradient-to-b from-pink-50/30 to-purple-50/30 border-pink-200'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-stone-400">
              {partnerData?.user.displayName || 'Partner'}'s Status
            </span>
            <span className="text-xl">{isPartnerSleeping ? '🌙' : '✨'}</span>
          </div>

          <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl shadow-inner mb-4 transition-transform hover:scale-105"
            style={{ background: isPartnerSleeping ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'linear-gradient(135deg, #fda4af, #f472b6)' }}>
            <span className="text-4xl">{isPartnerSleeping ? '😴' : '🥰'}</span>
          </div>

          <h3 className="font-display text-2xl font-bold mb-1" style={{ color: isPartnerSleeping ? '#7c3aed' : '#db2777' }}>
            {isPartnerSleeping
              ? `Shhh... ${partnerData?.user.displayName} is sleeping 💤`
              : `${partnerData?.user.displayName} is awake 💖`}
          </h3>

          <p className="text-stone-500 text-sm font-handwriting text-lg mb-4">
            {isPartnerSleeping && partnerData?.fellAsleepAt
              ? `Sleeping peacefully for ${formatDistanceToNow(parseISO(partnerData.fellAsleepAt))}`
              : partnerData?.lastWokeUpAt
              ? `Last woke up ${formatDistanceToNow(parseISO(partnerData.lastWokeUpAt), { addSuffix: true })}`
              : "Connected in heart & dreams ✦"}
          </p>

          {/* Bedside note form if partner is sleeping */}
          {isPartnerSleeping ? (
            <div className="mt-4 pt-4 border-t border-purple-100">
              <p className="font-handwriting text-purple-600 text-base mb-2">
                Leave a sweet dream note by their bedside 💌
              </p>
              <form onSubmit={handleSendNote} className="flex gap-2">
                <input
                  type="text"
                  value={bedsideMsg}
                  onChange={e => setBedsideMsg(e.target.value)}
                  placeholder="Sleep tight my sweetheart 💋..."
                  className="input-dreamy text-sm flex-1"
                />
                <button type="submit" className="btn-primary py-2 px-4 flex items-center gap-1">
                  <Send size={14} /> Send
                </button>
              </form>
              {sentNote && (
                <p className="text-xs text-green-600 mt-2 font-handwriting text-base">
                  Tucked under their pillow! They'll see it when they wake up 🎀
                </p>
              )}
            </div>
          ) : (
            partnerData?.bedsideNote && (
              <div className="bg-pink-50 border border-pink-200 rounded-2xl p-3 mt-4 text-center">
                <p className="text-xs text-pink-500 font-semibold mb-1">💌 Sweet Morning Note:</p>
                <p className="font-handwriting text-stone-700 text-base italic">"{partnerData.bedsideNote}"</p>
              </div>
            )
          )}
        </div>

      </div>

      {/* Sleep Log History */}
      <div className="glass-card p-6">
        <h2 className="font-display text-2xl font-bold text-gradient mb-1">Recent Sleep Logs 📊</h2>
        <p className="font-handwriting text-pink-400 mb-4">Every night we rested under the same moon 🌙</p>

        {history.length === 0 ? (
          <p className="text-center text-stone-400 py-8 font-handwriting text-xl">
            No sleep logs yet! Tap "Going to Sleep" tonight to record your first dream 💤
          </p>
        ) : (
          <div className="space-y-3">
            {history.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3.5 bg-white/70 rounded-2xl border border-pink-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.username === 'manuuu' ? '🎀' : '🖤'}</span>
                  <div>
                    <p className="font-semibold text-sm text-stone-700">{item.display_name}</p>
                    <p className="text-xs text-stone-400">
                      {format(parseISO(item.woke_up_at), 'EEE, MMM d')} • Slept {Math.floor(item.duration_minutes / 60)}h {item.duration_minutes % 60}m
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-medium">
                    {item.sleep_quality || 'peaceful'} ✨
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
