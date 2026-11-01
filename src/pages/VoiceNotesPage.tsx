import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Play, Pause, Upload, Trash2, Mic } from 'lucide-react';

interface VoiceNote {
  id: string;
  title?: string;
  original_name: string;
  uploader_display_name: string;
  duration_seconds?: number;
  created_at: string;
}

function AudioPlayer({ note }: { note: VoiceNote }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  return (
    <div className="glass-card p-5 flex items-center gap-4 hover:shadow-glow transition-all">
      <button onClick={toggle}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-blush-300 to-lavender-300 flex items-center justify-center text-white flex-shrink-0 hover:scale-105 transition-transform shadow-md">
        {playing ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-rose-wine text-sm mb-1 truncate">{note.title || note.original_name}</p>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-1.5 bg-blush-100 rounded-full cursor-pointer"
            onClick={e => {
              const a = audioRef.current;
              if (!a) return;
              const rect = e.currentTarget.getBoundingClientRect();
              a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
            }}
          >
            <div className="h-full bg-gradient-to-r from-blush-300 to-lavender-300 rounded-full transition-all"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-stone-400 flex-shrink-0 font-mono">
            {fmt(progress)} / {fmt(duration || note.duration_seconds || 0)}
          </span>
        </div>
        <p className="text-xs text-stone-400 mt-1">by {note.uploader_display_name}</p>
      </div>
      <audio
        ref={audioRef}
        src={`/api/voice-notes/${note.id}/file?token=${localStorage.getItem('olu_token')||''}`}
        onTimeUpdate={e => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
}

export default function VoiceNotesPage() {
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: notes = [], isLoading } = useQuery<VoiceNote[]>({
    queryKey: ['voice-notes'],
    queryFn: () => axios.get('/api/voice-notes').then(r => r.data),
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('audio', file);
    fd.append('title', title);
    fd.append('visibility', 'shared');
    try {
      await axios.post('/api/voice-notes', fd);
      qc.invalidateQueries({ queryKey: ['voice-notes'] });
      setShowUpload(false); setTitle(''); setFile(null);
    } catch { /* ignore */ } finally { setUploading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this voice note?')) return;
    await axios.delete(`/api/voice-notes/${id}`);
    qc.invalidateQueries({ queryKey: ['voice-notes'] });
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Voices We Keep 🎙️</h1>
          <p className="section-subtitle">Words carried in sound, saved forever</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="btn-primary flex items-center gap-2">
          <Upload size={16} /> Add Voice Note
        </button>
      </div>

      {showUpload && (
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <h3 className="font-display text-lg text-rose-wine mb-4">Save a Voice Note 🎙️</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Give it a name..." className="input-dreamy" />
            <div className="border-2 border-dashed border-blush-200 rounded-xl p-6 text-center cursor-pointer hover:border-blush-400 transition-colors"
              onClick={() => document.getElementById('audio-file')?.click()}>
              <Mic size={32} className="mx-auto text-blush-300 mb-2" />
              <p className="text-stone-500 text-sm">{file ? file.name : 'Click to select audio file (.opus, .m4a, .mp3)'}</p>
              <input id="audio-file" type="file" accept="audio/*" className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={!file || uploading} className="btn-primary flex items-center gap-2">
                {uploading ? <span className="animate-spin">💗</span> : <Upload size={16} />}
                {uploading ? 'Saving...' : 'Save Voice Note'}
              </button>
              <button type="button" onClick={() => setShowUpload(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Intro banner */}
      <div className="glass-card p-5 mb-8 bg-gradient-to-r from-lavender-50 to-blush-50 border-lavender-200">
        <p className="font-handwriting text-xl text-lavender-500 text-center">
          "The voice you love most, saved forever 🎙️"
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-cream-200 rounded-2xl shimmer" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-6xl mb-4">🎙️</div>
          <p className="font-handwriting text-2xl text-blush-300 mb-2">No voice notes yet</p>
          <p className="text-sm">Upload those precious voice notes!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => (
            <div key={note.id} className="relative group">
              <AudioPlayer note={note} />
              <button onClick={() => handleDelete(note.id)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-rose-500 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
