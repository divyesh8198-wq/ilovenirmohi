import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Upload, X, ChevronLeft, ChevronRight, Trash2, ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Photo {
  id: number;
  filename: string;
  caption?: string;
  isFavourite: boolean;
  uploadedBy: string;
  createdAt: string;
}

export default function GalleryPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<'all' | 'favourites'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['photos', 'gallery'],
    queryFn: async () => {
      const { data } = await axios.get('/api/photos?album=gallery');
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
    form.append('album', 'gallery');
    form.append('caption', caption);
    try {
      await axios.post('/api/photos', form);
      queryClient.invalidateQueries({ queryKey: ['photos', 'gallery'] });
      setCaption('');
    } finally {
      setUploading(false);
    }
  };

  const toggleFavourite = async (id: number, current: boolean) => {
    await axios.patch(`/api/photos/${id}`, { isFavourite: !current });
    queryClient.invalidateQueries({ queryKey: ['photos', 'gallery'] });
  };

  const deletePhoto = async (id: number) => {
    await axios.delete(`/api/photos/${id}`);
    queryClient.invalidateQueries({ queryKey: ['photos', 'gallery'] });
    if (lightboxIndex !== null) setLightboxIndex(null);
  };

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex(i => (i !== null ? (i - 1 + filtered.length) % filtered.length : null));
  const nextPhoto = () => setLightboxIndex(i => (i !== null ? (i + 1) % filtered.length : null));

  const currentPhoto = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <h1 className="section-title">Our Gallery ✨</h1>
        <p className="section-subtitle">Every photo, a memory frozen in time — just for us.</p>
      </motion.div>

      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'favourites'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-full font-body text-sm font-semibold transition-all ${
                filter === tab ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {tab === 'all' ? '🖼 All Photos' : '❤️ Favourites'}
            </button>
          ))}
        </div>

        {/* Upload */}
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
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={16} />
            {uploading ? 'Uploading…' : 'Add Photo'}
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
          <ImageIcon size={60} className="text-blush opacity-40" />
          <p className="font-handwriting text-2xl text-wine-red">
            {filter === 'favourites' ? 'No favourites yet — heart the ones you love!' : 'No photos yet. Upload your first memory!'}
          </p>
        </motion.div>
      )}

      {/* Grid */}
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
                whileHover={{ rotate: 1, scale: 1.03 }}
                className="polaroid cursor-pointer relative group"
                onClick={() => openLightbox(i)}
              >
                <img
                  src={`/api/photos/${photo.id}/file?token=${token||''}`}
                  alt={photo.caption || 'Memory'}
                  className="w-full h-48 object-cover rounded"
                />
                {photo.caption && (
                  <p className="font-handwriting text-sm text-center mt-2 text-wine-red">{photo.caption}</p>
                )}
                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={`/api/photos/${currentPhoto.id}/file?token=${token||''}`}
                alt={currentPhoto.caption || 'Memory'}
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              {currentPhoto.caption && (
                <div className="p-4 text-center">
                  <p className="font-handwriting text-xl text-wine-red">{currentPhoto.caption}</p>
                  <p className="font-body text-xs text-gray-400 mt-1">{new Date(currentPhoto.createdAt).toLocaleDateString()}</p>
                </div>
              )}

              {/* Nav Buttons */}
              <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow">
                <ChevronLeft size={22} />
              </button>
              <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow">
                <ChevronRight size={22} />
              </button>

              {/* Top actions */}
              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => toggleFavourite(currentPhoto.id, currentPhoto.isFavourite)} className="bg-white rounded-full p-2 shadow">
                  <Heart size={18} fill={currentPhoto.isFavourite ? '#f8a4bc' : 'none'} stroke="#7b2d3a" />
                </button>
                {currentPhoto.uploadedBy === user?.username && (
                  <button onClick={() => deletePhoto(currentPhoto.id)} className="bg-white rounded-full p-2 shadow">
                    <Trash2 size={18} stroke="#7b2d3a" />
                  </button>
                )}
                <button onClick={closeLightbox} className="bg-white rounded-full p-2 shadow">
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
