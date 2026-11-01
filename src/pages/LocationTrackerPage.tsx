import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Navigation, Battery, Heart, Sparkles, RefreshCw, Compass } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface UserLocation {
  latitude: number;
  longitude: number;
  place_name?: string;
  status_text?: string;
  battery_level?: number;
  updated_at: string;
  displayName: string;
}

interface LocationResponse {
  locations: Record<string, UserLocation | null>;
  distanceKm: number | null;
  isTogether: boolean;
}

const PRESET_PLACES = [
  'Home 🏡', 'College / Work 📚', 'Café ☕', 'Traveling 🚗', 'Out with friends ✨', 'Shopping 🛍️'
];

export default function LocationTrackerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [place, setPlace] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [hugSent, setHugSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: locData, isLoading } = useQuery<LocationResponse>({
    queryKey: ['location-status'],
    queryFn: () => axios.get('/api/location/status').then(r => r.data),
    refetchInterval: 15000,
  });

  const myLoc = user ? locData?.locations?.[user.username] : null;
  const partnerUsername = user?.username === 'manuuu' ? 'divs' : 'manuuu';
  const partnerLoc = locData?.locations?.[partnerUsername];

  async function updateCurrentLocation(selectedPlace?: string) {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setUpdating(true);
    setErrorMsg('');

    // Try to get battery
    let batteryLevel: number | undefined;
    try {
      if ('getBattery' in navigator) {
        // @ts-expect-error getBattery is experimental
        const battery = await navigator.getBattery();
        batteryLevel = Math.round(battery.level * 100);
      }
    } catch { /* ignore */ }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await axios.post('/api/location/update', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            place_name: selectedPlace || place || myLoc?.place_name,
            status_text: statusMsg || myLoc?.status_text,
            battery_level: batteryLevel,
          });
          qc.invalidateQueries({ queryKey: ['location-status'] });
        } catch {
          setErrorMsg('Failed to sync location to server.');
        } finally {
          setUpdating(false);
        }
      },
      (err) => {
        setUpdating(false);
        setErrorMsg('Please allow location access in your browser settings 📍');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSendHug() {
    setHugSent(true);
    setTimeout(() => setHugSent(false), 4000);
  }

  return (
    <div className="page-container animate-fade-in space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="section-title">Where Are You? 📍</h1>
        <p className="section-subtitle">No matter how far apart, always connected by one thread 🧵💗</p>
      </div>

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-2xl text-center text-sm">
          {errorMsg}
        </div>
      )}

      {/* Distance Banner */}
      <div className="relative rounded-3xl p-8 text-center overflow-hidden shadow-kawaii"
        style={{
          background: locData?.isTogether
            ? 'linear-gradient(135deg, #fce7f3, #fed7aa, #fef08a)'
            : 'linear-gradient(135deg, #fff0f5, #f5d0fe, #ede9fe)',
          border: '2px solid rgba(244, 114, 182, 0.3)'
        }}>

        {/* Characters & Distance illustration */}
        <div className="flex items-center justify-around max-w-md mx-auto mb-6">
          {/* Manuuu */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-pink-100 border-2 border-pink-300 flex items-center justify-center text-3xl shadow-md mx-auto mb-1 animate-bounce-soft">
              🎀
            </div>
            <p className="font-display text-xs font-bold text-pink-600">Manuuu</p>
          </div>

          {/* Connection Line */}
          <div className="flex-1 px-4 flex flex-col items-center">
            <div className="w-full border-t-2 border-dashed border-pink-400 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 rounded-full text-xs font-bold text-pink-500 shadow-sm">
                {locData?.isTogether
                  ? 'TOGETHER! 🥰'
                  : locData?.distanceKm !== null && locData?.distanceKm !== undefined
                  ? `${locData.distanceKm} km`
                  : '•••'}
              </span>
            </div>
          </div>

          {/* Divs */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-3xl shadow-md mx-auto mb-1 animate-bounce-soft" style={{ animationDelay: '0.4s' }}>
              🖤
            </div>
            <p className="font-display text-xs font-bold text-purple-600">Divs</p>
          </div>
        </div>

        {/* Distance Status Text */}
        {locData?.isTogether ? (
          <div>
            <h2 className="font-display text-3xl font-bold text-rose-600 mb-1">
              Together Right Now! 💕
            </h2>
            <p className="font-handwriting text-2xl text-pink-500">
              Within each other's warm hug radius 🫂✨
            </p>
          </div>
        ) : locData?.distanceKm !== null && locData?.distanceKm !== undefined ? (
          <div>
            <h2 className="font-display text-4xl font-bold text-gradient mb-1">
              {locData.distanceKm} km apart
            </h2>
            <p className="font-handwriting text-2xl text-purple-600">
              Miles can't keep two hearts apart 💫
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-600 mb-1">
              Update Your Locations 📍
            </h2>
            <p className="font-handwriting text-xl text-pink-400">
              Tap "Update My Location" below so we can calculate the distance!
            </p>
          </div>
        )}

        {/* Send Virtual Hug Button */}
        <div className="mt-6">
          <button
            onClick={handleSendHug}
            className="btn-primary py-2.5 px-6 rounded-full inline-flex items-center gap-2 text-sm shadow-md hover:scale-105 active:scale-95"
          >
            <Heart size={16} fill="white" />
            Send a Long-Distance Hug 🫂
          </button>
          {hugSent && (
            <p className="font-handwriting text-lg text-pink-600 mt-2 animate-bounce-soft">
              Hug dispatched at the speed of light! 🤗💖
            </p>
          )}
        </div>
      </div>

      {/* Cards: Both Partners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* My Location Card */}
        <div className="glass-card p-6 border-pink-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-stone-700 flex items-center gap-2">
              <MapPin size={18} className="text-pink-500" /> My Current Spot
            </h3>
            {myLoc?.battery_level !== undefined && (
              <span className="text-xs bg-pink-50 text-pink-600 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <Battery size={12} /> {myLoc.battery_level}%
              </span>
            )}
          </div>

          <div className="bg-pink-50/50 rounded-2xl p-4 border border-pink-100 mb-4">
            <p className="font-display text-xl font-bold text-stone-800">
              {myLoc?.place_name || 'Location not updated yet'}
            </p>
            {myLoc?.status_text && (
              <p className="font-handwriting text-stone-600 text-lg mt-1 italic">
                "{myLoc.status_text}"
              </p>
            )}
            <p className="text-xs text-stone-400 mt-2">
              {myLoc?.updated_at
                ? `Updated ${formatDistanceToNow(parseISO(myLoc.updated_at), { addSuffix: true })}`
                : 'Tap below to set your location'}
            </p>
          </div>

          {/* Quick preset chips */}
          <div className="mb-4">
            <p className="text-xs text-stone-400 mb-2 font-semibold">Quick place presets:</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PLACES.map(p => (
                <button
                  key={p}
                  onClick={() => { setPlace(p); updateCurrentLocation(p); }}
                  className="text-xs bg-white/80 hover:bg-pink-100 border border-pink-200 text-stone-700 py-1 px-2.5 rounded-full transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => updateCurrentLocation()}
            disabled={updating}
            className="w-full btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 font-bold"
          >
            <RefreshCw size={16} className={updating ? 'animate-spin' : ''} />
            {updating ? 'Detecting GPS Location…' : 'Update My Location 📍'}
          </button>
        </div>

        {/* Partner Location Card */}
        <div className="glass-card p-6 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-stone-700 flex items-center gap-2">
              <Compass size={18} className="text-purple-500" />
              {partnerLoc?.displayName || 'Partner'}'s Spot
            </h3>
            {partnerLoc?.battery_level !== undefined && (
              <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <Battery size={12} /> {partnerLoc.battery_level}%
              </span>
            )}
          </div>

          <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
            <p className="font-display text-xl font-bold text-stone-800">
              {partnerLoc?.place_name || 'No location updated yet'}
            </p>
            {partnerLoc?.status_text && (
              <p className="font-handwriting text-stone-600 text-lg mt-1 italic">
                "{partnerLoc.status_text}"
              </p>
            )}
            <p className="text-xs text-stone-400 mt-2">
              {partnerLoc?.updated_at
                ? `Updated ${formatDistanceToNow(parseISO(partnerLoc.updated_at), { addSuffix: true })}`
                : 'Waiting for partner to share their spot 🌸'}
            </p>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-white/60 border border-purple-100 text-center">
            <p className="font-handwriting text-purple-600 text-lg">
              "You are my compass, my home, and my favorite destination." ✦
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
