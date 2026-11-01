import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Upload, X, ChevronLeft, ChevronRight, Trash2, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Photo {
  id: number;
  filename: string;
  caption?: string;
  isFavourite: boolean;
  uploadedBy: string;
  createdAt: string;
}

export default function ChildhoodPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<'all' | 'favourites'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['photos', 'childhood'],
    queryFn: async () => {
      const { data } = await axios.get('/api/photos?album=childhood');
      return data;
    },
  });

  const filtered = filter === 'favourites' ? photos.filter(p => p.isFavourite) : photos;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('photo', file);
    form.append('album', 'childhood');
    form.append('caption', caption);
    try {
      await axios.post('/api/photos', form);
      queryClient.invalidateQueries({ queryKey: ['photos', 'childhood'] });
      setCaption('');
    } finally {
      setUploading(false);
    }
  };

  const toggleFavourite = async (id: number, current: boolean) => {
    await axios.patch(`/api/photos/${id}`, { isFavourite: !current });
    queryClient.invalidateQueries({ queryKey: ['photos', 'childhood'] });
  };

  const deletePhoto = async (id: number) => {
    await axios.delete(`/api/photos/${id}`);
    queryClient.invalidateQueries({ queryKey: ['photos', 'childhood'] });
    if (lightboxIndex !== null) setLightboxIndex(null);
  };

  const currentPhoto = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <div className="page-container">
      {/* Intro Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card mb-10 text-center py-8 px-6 border border-amber-200"
        style={{ background: 'linear-gradient(135deg, #fdf8f0 0%, #fef3c7 100%)' }}
      >
        <Camera size={40} className="mx-auto mb-3 text-amber-600" />
        <h1 className="font-display text-4xl font-bold text-amber-800 mb-2">Little Us 🌻</h1>
        <p className="font-handwriting text-lg text-amber-700 max-w-xl mx-auto">
          Before we found each other, there were two little kids growing up separately — each collecting moments that would one day weave into our story. These are those moments.
        </p>
      </motion.div>

      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex gap-2">
          {(['all', 'favourites'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-full font-body text-sm font-semibold transition-all ${
                filter === tab
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              {tab === 'all' ? '📷 All Memories' : '💛 Favourites'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Caption..."
            className="input-dreamy text-sm w-40"
          />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-full bg-amber-600 text-white font-semibold text-sm flex items-center gap-2 hover:bg-amber-700 transition-all"
          >
            <Upload size={16} />
            {uploading ? 'Uploading…' : 'Add Memory'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="polaroid shimmer h-64 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-20 gap-4">
          <span className="text-6xl">🌻</span>
          <p className="font-handwriting text-2xl text-amber-700 text-center max-w-sm">
            {filter === 'favourites'
              ? 'No favourites yet — cherish the ones that make you smile!'
              : 'No childhood memories yet. Share a little piece of your past!'}
          </p>
        </motion.div>
      )}

      {/* Grid with sepia effect */}
      {!isLoading && (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filtered.map((photo, i) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ rotate: -1, scale: 1.03 }}
                className="cursor-pointer relative group"
                style={{
                  background: '#fdf8f0',
                  padding: '12px 12px 40px',
                  boxShadow: '2px 3px 12px rgba(0,0,0,0.15)',
                  transform: `rotate(${(i % 3 - 1) * 1.5}deg)`,
                }}
                onClick={() => setLightboxIndex(i)}
              >
                <img
                  src={`/api/photos/${photo.id}/file?token=${token||localStorage.getItem('olu_token')||''}`}
                  alt={photo.caption || 'Childhood memory'}
                  className="w-full h-48 object-cover"
                  style={{ filter: 'sepia(40%) brightness(0.95)' }}
                />
                {photo.caption && (
                  <p className="font-handwriting text-sm text-center mt-2 text-amber-800">{photo.caption}</p>
                )}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavourite(photo.id, photo.isFavourite); }}
                    className="bg-white rounded-full p-1 shadow"
                  >
                    <Heart size={14} fill={photo.isFavourite ? '#f8a4bc' : 'none'} stroke="#7b2d3a" />
                  </button>
                  {photo.uploadedBy === user?.username && (
                    <button
                      onClick={e => { e.stopPropagation(); deletePhoto(photo.id); }}
                      className="bg-white rounded-full p-1 shadow"
                    >
                      <Trash2 size={14} stroke="#7b2d3a" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {currentPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: '#fdf8f0', padding: '16px 16px 60px' }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={`/api/photos/${currentPhoto.id}/file?token=${token||localStorage.getItem('olu_token')||''}`}
                alt={currentPhoto.caption || 'Memory'}
                className="w-full max-h-[65vh] object-contain"
                style={{ filter: 'sepia(30%)' }}
              />
              {currentPhoto.caption && (
                <p className="font-handwriting text-xl text-amber-800 text-center mt-4">{currentPhoto.caption}</p>
              )}
              <p className="font-body text-xs text-center text-amber-500 mt-1">
                {new Date(currentPhoto.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <button
                onClick={() => setLightboxIndex(i => (i !== null ? (i - 1 + filtered.length) % filtered.length : null))}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={() => setLightboxIndex(i => (i !== null ? (i + 1) % filtered.length : null))}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow"
              >
                <ChevronRight size={22} />
              </button>

              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => toggleFavourite(currentPhoto.id, currentPhoto.isFavourite)} className="bg-white rounded-full p-2 shadow">
                  <Heart size={18} fill={currentPhoto.isFavourite ? '#f8a4bc' : 'none'} stroke="#7b2d3a" />
                </button>
                {currentPhoto.uploadedBy === user?.username && (
                  <button onClick={() => deletePhoto(currentPhoto.id)} className="bg-white rounded-full p-2 shadow">
                    <Trash2 size={18} stroke="#7b2d3a" />
                  </button>
                )}
                <button onClick={() => setLightboxIndex(null)} className="bg-white rounded-full p-2 shadow">
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
