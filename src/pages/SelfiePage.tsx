import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Upload, Globe, Lock, Trash2 } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';

interface Selfie {
  id: string;
  caption?: string;
  taken_date: string;
  is_public: boolean;
  uploader_username: string;
  uploader_display_name: string;
  created_at: string;
}

export default function SelfiePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);

  const { data: selfies = [], isLoading } = useQuery<Selfie[]>({
    queryKey: ['selfies'],
    queryFn: () => axios.get('/api/selfies').then(r => r.data),
  });

  const mySelfies = selfies.filter(s => s.uploader_username === user?.username);
  const partnerSelfies = selfies.filter(s => s.uploader_username !== user?.username && s.is_public);
  const uploadedToday = mySelfies.some(s => isToday(parseISO(s.taken_date)));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('selfie', file);
    fd.append('caption', caption);
    fd.append('is_public', String(isPublic));
    fd.append('taken_date', new Date().toISOString().split('T')[0]);
    try {
      await axios.post('/api/selfies', fd);
      qc.invalidateQueries({ queryKey: ['selfies'] });
      setFile(null); setPreview(null); setCaption('');
    } catch { /* ignore */ } finally { setUploading(false); }
  }

  async function togglePublic(s: Selfie) {
    await axios.patch(`/api/selfies/${s.id}`, { is_public: !s.is_public });
    qc.invalidateQueries({ queryKey: ['selfies'] });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this selfie?')) return;
    await axios.delete(`/api/selfies/${id}`);
    qc.invalidateQueries({ queryKey: ['selfies'] });
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-8">
        <h1 className="section-title">Daily Selfie 🤳</h1>
        <p className="section-subtitle">One photo a day, just for us</p>
      </div>

      {/* Upload section */}
      {!uploadedToday ? (
        <div className="glass-card p-6 mb-8 bg-gradient-to-br from-blush-50 to-lavender-50">
          <h3 className="font-display text-lg text-rose-wine mb-4 text-center">
            Today's selfie 📷
          </h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              className="border-2 border-dashed border-blush-200 rounded-2xl overflow-hidden cursor-pointer hover:border-blush-400 transition-colors relative"
              onClick={() => document.getElementById('selfie-file')?.click()}>
              {preview ? (
                <img src={preview} alt="Preview" className="w-full max-h-64 object-cover" />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-stone-400">
                  <Camera size={40} className="mb-2 text-blush-300" />
                  <p className="text-sm">Click to choose your photo</p>
                </div>
              )}
              <input id="selfie-file" type="file" accept="image/*" capture="user"
                className="hidden" onChange={handleFileChange} />
            </div>
            {file && (
              <>
                <input type="text" value={caption} onChange={e => setCaption(e.target.value)}
                  placeholder="Add a caption... (optional)" className="input-dreamy" />
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setIsPublic(!isPublic)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-blush-400' : 'bg-stone-200'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-stone-500 flex items-center gap-2">
                    {isPublic ? <><Globe size={14} className="text-blush-400" /> Visible to partner</> : <><Lock size={14} /> Private</>}
                  </span>
                </label>
                <button type="submit" disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {uploading ? <span className="animate-spin">💗</span> : <Upload size={16} />}
                  {uploading ? 'Uploading...' : 'Share Today\'s Selfie'}
                </button>
              </>
            )}
          </form>
        </div>
      ) : (
        <div className="glass-card p-6 mb-8 text-center bg-gradient-to-br from-blush-50 to-lavender-50">
          <div className="text-4xl mb-2">✅</div>
          <p className="font-handwriting text-xl text-blush-400">You've uploaded today's selfie 💗</p>
          <p className="text-stone-400 text-sm mt-1">Come back tomorrow for the next one!</p>
        </div>
      )}

      {/* Partner selfies */}
      {partnerSelfies.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg text-rose-wine mb-4">
            From {user?.username === 'divs' ? 'Manuuu' : 'Divs'} 🌸
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {partnerSelfies.map(s => (
              <div key={s.id} className="polaroid group">
                <img src={`/api/selfies/${s.id}/file?token=${localStorage.getItem('olu_token')||''}`} alt={s.caption || 'Selfie'}
                  className="w-full aspect-square object-cover" loading="lazy" />
                {s.caption && (
                  <p className="mt-2 text-center text-xs font-handwriting text-stone-500">{s.caption}</p>
                )}
                <p className="text-center text-xs text-stone-400 mt-1">
                  {format(parseISO(s.taken_date), 'MMM d')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My selfies */}
      <div>
        <h2 className="font-display text-lg text-rose-wine mb-4">My Archive 📸</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-square bg-cream-200 rounded-2xl shimmer" />)}
          </div>
        ) : mySelfies.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Camera size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-handwriting text-lg">No selfies yet. Start today!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mySelfies.map(s => (
              <div key={s.id} className="polaroid group relative">
                <img src={`/api/selfies/${s.id}/file?token=${localStorage.getItem('olu_token')||''}`} alt={s.caption || 'Selfie'}
                  className="w-full aspect-square object-cover" loading="lazy" />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => togglePublic(s)}
                    className="p-1.5 bg-white/90 rounded-lg text-stone-500 hover:text-blush-500 shadow">
                    {s.is_public ? <Globe size={12} /> : <Lock size={12} />}
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="p-1.5 bg-white/90 rounded-lg text-stone-500 hover:text-rose-500 shadow">
                    <Trash2 size={12} />
                  </button>
                </div>
                {s.caption && (
                  <p className="mt-1.5 text-center text-xs font-handwriting text-stone-500">{s.caption}</p>
                )}
                <p className="text-center text-xs text-stone-400 mt-0.5">
                  {format(parseISO(s.taken_date), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
