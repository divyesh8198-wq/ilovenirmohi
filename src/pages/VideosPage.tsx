import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Upload, Play, X, Trash2, Video } from 'lucide-react';

interface VideoItem {
  id: string;
  title?: string;
  description?: string;
  original_name: string;
  uploader_display_name: string;
  created_at: string;
  visibility: string;
}

function VideoPlayer({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-blush-300 transition-colors">
          <X size={28} />
        </button>
        <video
          src={`/api/videos/${video.id}/file?token=${localStorage.getItem('olu_token')||''}`}
          controls
          autoPlay
          className="w-full rounded-2xl shadow-2xl"
        />
        <div className="mt-3 text-white text-center">
          <p className="font-display text-lg">{video.title || video.original_name}</p>
          {video.description && <p className="text-white/60 text-sm mt-1">{video.description}</p>}
        </div>
      </div>
    </div>
  );
}

export default function VideosPage() {
  const qc = useQueryClient();
  const [active, setActive] = useState<VideoItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: videos = [], isLoading } = useQuery<VideoItem[]>({
    queryKey: ['videos'],
    queryFn: () => axios.get('/api/videos').then(r => r.data),
  });

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('video', file);
    fd.append('title', title);
    fd.append('description', desc);
    fd.append('visibility', 'shared');
    try {
      await axios.post('/api/videos', fd);
      qc.invalidateQueries({ queryKey: ['videos'] });
      setShowUpload(false);
      setTitle(''); setDesc(''); setFile(null);
    } catch { /* ignore */ } finally { setUploading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this video?')) return;
    await axios.delete(`/api/videos/${id}`);
    qc.invalidateQueries({ queryKey: ['videos'] });
  }

  return (
    <div className="page-container animate-fade-in">
      {active && <VideoPlayer video={active} onClose={() => setActive(null)} />}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Little Videos 🎬</h1>
          <p className="section-subtitle">Moving memories, forever saved</p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="btn-primary flex items-center gap-2">
          <Upload size={16} /> Upload Video
        </button>
      </div>

      {showUpload && (
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <h3 className="font-display text-lg text-rose-wine mb-4">Add a Video 🎬</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Video title..." className="input-dreamy" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Description (optional)..." className="input-dreamy resize-none h-20" />
            <div className="border-2 border-dashed border-blush-200 rounded-xl p-6 text-center cursor-pointer hover:border-blush-400 transition-colors"
              onClick={() => document.getElementById('vid-file')?.click()}>
              <Video size={32} className="mx-auto text-blush-300 mb-2" />
              <p className="text-stone-500 text-sm">{file ? file.name : 'Click to select video file'}</p>
              <input id="vid-file" type="file" accept="video/*" className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={!file || uploading} className="btn-primary flex items-center gap-2">
                {uploading ? <span className="animate-spin">💗</span> : <Upload size={16} />}
                {uploading ? 'Uploading...' : 'Save Video'}
              </button>
              <button type="button" onClick={() => setShowUpload(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-video bg-cream-200 rounded-2xl shimmer" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-6xl mb-4">🎬</div>
          <p className="font-handwriting text-2xl text-blush-300 mb-2">No videos yet</p>
          <p className="text-sm">Upload your first little video together!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => (
            <div key={video.id} className="glass-card overflow-hidden group hover:-translate-y-1 transition-all duration-200">
              <div className="relative aspect-video bg-stone-900 cursor-pointer" onClick={() => setActive(video)}>
                <video src={`/api/videos/${video.id}/file?token=${localStorage.getItem('olu_token')||''}`} className="w-full h-full object-cover opacity-80" preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={24} className="text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-rose-wine text-sm mb-1">{video.title || video.original_name}</h3>
                {video.description && <p className="text-xs text-stone-400 mb-2 line-clamp-2">{video.description}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-stone-400">by {video.uploader_display_name}</p>
                  <button onClick={() => handleDelete(video.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-rose-500 transition-all">
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
