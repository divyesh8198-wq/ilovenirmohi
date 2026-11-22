import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Battery, BatteryCharging, Check, Clock3, ExternalLink, Heart, MapPin, Navigation, Pause, Play, RefreshCw, ShieldCheck, Signal, Sparkles } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  place_name?: string;
  status_text?: string;
  battery_level?: number;
  is_charging?: number | boolean;
  updated_at: string;
  displayName: string;
}

interface LocationResponse {
  locations: Record<string, UserLocation | null>;
  sharing: Record<string, { enabled: boolean; expiresAt: string | null }>;
  distanceKm: number | null;
  isTogether: boolean;
}

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

interface MapPoint { latitude: number; longitude: number; label: string; emoji: string; tint: string }

const SESSION_OPTIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 240, label: '4 hours' },
  { minutes: 1440, label: '24 hours' },
];

const PRESET_PLACES = ['Home 🏡', 'College / Work 📚', 'Café ☕', 'Traveling 🚗', 'Out with friends ✨', 'Shopping 🛍️'];
const TILE_SIZE = 256;
const MAP_SIZE = 600;

function worldPixel(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(-85.0511, Math.min(85.0511, latitude));
  const sin = Math.sin(lat * Math.PI / 180);
  return {
    x: (longitude + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function SharedMap({ points, distanceKm, mapConsent, onAllowMap }: { points: MapPoint[]; distanceKm: number | null; mapConsent: boolean; onAllowMap: () => void }) {
  const center = useMemo(() => {
    if (!points.length) return { latitude: 20.5937, longitude: 78.9629 };
    return {
      latitude: points.reduce((total, point) => total + point.latitude, 0) / points.length,
      longitude: points.reduce((total, point) => total + point.longitude, 0) / points.length,
    };
  }, [points]);

  const zoom = useMemo(() => {
    if (points.length < 2) return 12;
    const latSpan = Math.abs(points[0].latitude - points[1].latitude);
    const lonSpan = Math.abs(points[0].longitude - points[1].longitude) * Math.cos(center.latitude * Math.PI / 180);
    const span = Math.max(latSpan, lonSpan, 0.005);
    return Math.max(2, Math.min(16, Math.floor(Math.log2((MAP_SIZE * 0.8 * 360) / (TILE_SIZE * span)))));
  }, [points, center.latitude]);

  const centerPixel = worldPixel(center.latitude, center.longitude, zoom);
  const left = centerPixel.x - MAP_SIZE / 2;
  const top = centerPixel.y - MAP_SIZE / 2;
  const firstTileX = Math.floor(left / TILE_SIZE);
  const firstTileY = Math.floor(top / TILE_SIZE);
  const tileCount = Math.ceil(MAP_SIZE / TILE_SIZE) + 1;
  const maxTile = 2 ** zoom;
  const positionedPoints = points.map(point => {
    const position = worldPixel(point.latitude, point.longitude, zoom);
    return { ...point, x: position.x - left, y: position.y - top };
  });

  return (
    <div className="relative mx-auto w-full max-w-[600px] overflow-hidden rounded-[1.75rem] border border-pink-200 bg-[#e6edf0] shadow-inner" style={{ aspectRatio: '1 / 1' }}>
      {mapConsent && <div className="absolute inset-0">
        {Array.from({ length: tileCount * tileCount }, (_, index) => {
          const col = index % tileCount;
          const row = Math.floor(index / tileCount);
          const tileX = firstTileX + col;
          const tileY = firstTileY + row;
          if (tileY < 0 || tileY >= maxTile) return null;
          const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;
          return <img key={`${zoom}-${wrappedX}-${tileY}`} alt="" aria-hidden="true" draggable="false"
            src={`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`}
            className="absolute max-w-none" style={{ width: `${TILE_SIZE / MAP_SIZE * 100}%`, height: `${TILE_SIZE / MAP_SIZE * 100}%`, left: `${(tileX * TILE_SIZE - left) / MAP_SIZE * 100}%`, top: `${(tileY * TILE_SIZE - top) / MAP_SIZE * 100}%` }} />;
        })}
      </div>}
      {mapConsent && positionedPoints.length === 2 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} preserveAspectRatio="none">
          <line x1={positionedPoints[0].x} y1={positionedPoints[0].y} x2={positionedPoints[1].x} y2={positionedPoints[1].y} stroke="#ec4899" strokeWidth="4" strokeDasharray="8 10" strokeLinecap="round" opacity=".75" />
        </svg>
      )}
      {mapConsent && positionedPoints.map(point => (
        <div key={point.label} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${point.x / MAP_SIZE * 100}%`, top: `${point.y / MAP_SIZE * 100}%` }}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-white text-xl shadow-lg ${point.tint}`}>{point.emoji}</div>
          <div className="mt-1 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-center text-xs font-bold text-stone-700 shadow">{point.label}</div>
        </div>
      ))}
      {!mapConsent && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 px-6 text-center">
        <MapPin size={28} className="text-pink-500" />
        <p className="max-w-sm text-sm text-stone-600">To draw the map, this page sends the approximate map area to OpenStreetMap. Your exact marker coordinates are drawn here in this app.</p>
        <button onClick={onAllowMap} className="btn-primary px-5 py-2.5 text-sm">Load OpenStreetMap</button>
      </div>}
      {mapConsent && !points.length && <div className="absolute inset-0 flex items-center justify-center bg-white/50 px-8 text-center text-sm text-stone-600">Start a sharing session to place your marker on the map.</div>}
      {mapConsent && points.length === 1 && <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-xs text-stone-600 shadow">Waiting for your partner to share their spot</div>}
      {mapConsent && distanceKm !== null && points.length === 2 && <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-pink-700 shadow">{distanceKm} km apart</div>}
      {mapConsent && <a className="absolute bottom-2 right-2 z-20 rounded-md bg-white/90 px-2 py-1 text-[10px] text-stone-700 shadow" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>}
    </div>
  );
}

export default function LocationTrackerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [place, setPlace] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [hugSent, setHugSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mapConsent, setMapConsent] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);
  const lastSyncAt = useRef(0);
  const batteryRef = useRef<{ level: number | null; charging: boolean | null }>({ level: null, charging: null });

  const { data: locData, isLoading } = useQuery<LocationResponse>({
    queryKey: ['location-status'],
    queryFn: () => axios.get('/api/location/status').then(r => r.data),
    refetchInterval: 15000,
  });

  const myLoc = user ? locData?.locations?.[user.username] : null;
  const mySharing = user ? locData?.sharing?.[user.username] : null;
  const partnerUsername = user?.username === 'manuuu' ? 'divs' : 'manuuu';
  const partnerLoc = locData?.locations?.[partnerUsername];
  const partnerSharing = locData?.sharing?.[partnerUsername];
  const shareActive = mySharing?.enabled === true;

  useEffect(() => {
    const getBattery = (navigator as NavigatorWithBattery).getBattery;
    if (!getBattery) return;
    let battery: BatteryManager | null = null;
    const updateBattery = () => {
      if (!battery) return;
      const state = { level: Math.round(battery.level * 100), charging: battery.charging };
      batteryRef.current = state;
      setBatteryLevel(state.level);
      setCharging(state.charging);
    };
    getBattery.call(navigator).then(value => {
      battery = value;
      updateBattery();
      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
    }).catch(() => undefined);
    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', updateBattery);
        battery.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  const syncPosition = useCallback(async (position: GeolocationPosition, selectedPlace?: string) => {
    const snapshot = batteryRef.current;
    try {
      await axios.post('/api/location/update', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        place_name: selectedPlace || place || myLoc?.place_name,
        status_text: statusMsg || myLoc?.status_text,
        battery_level: snapshot.level,
        is_charging: snapshot.charging,
      });
      lastSyncAt.current = Date.now();
      qc.invalidateQueries({ queryKey: ['location-status'] });
      setErrorMsg('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) setErrorMsg('Your sharing session ended. Start a new one to share again.');
      else setErrorMsg('Could not sync right now. Check your connection and try again.');
    }
  }, [myLoc?.place_name, place, qc, statusMsg]);

  useEffect(() => {
    if (!shareActive || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(position => {
      if (Date.now() - lastSyncAt.current >= 30_000) void syncPosition(position);
    }, () => setErrorMsg('Location updates are paused. Check browser location permission and reopen this page.'), {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 20_000,
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [shareActive, syncPosition]);

  const requestLocation = (selectedPlace?: string) => {
    if (!navigator.geolocation) {
      setErrorMsg('This browser does not support location.');
      return;
    }
    setUpdating(true);
    navigator.geolocation.getCurrentPosition(position => {
      void syncPosition(position, selectedPlace).finally(() => setUpdating(false));
    }, error => {
      setUpdating(false);
      setErrorMsg(error.code === error.PERMISSION_DENIED ? 'Location permission is off. Allow it in your browser settings to share a location.' : 'Could not get a GPS fix. Try again outdoors or check your connection.');
    }, { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 });
  };

  async function startSharing(durationMinutes: number) {
    setSessionBusy(true);
    setErrorMsg('');
    try {
      await axios.post('/api/location/sharing', { enabled: true, durationMinutes });
      await qc.invalidateQueries({ queryKey: ['location-status'] });
      requestLocation();
    } catch {
      setErrorMsg('Could not start sharing. Check your connection and try again.');
    } finally {
      setSessionBusy(false);
    }
  }

  async function stopSharing() {
    setSessionBusy(true);
    try {
      await axios.post('/api/location/sharing', { enabled: false });
      await qc.invalidateQueries({ queryKey: ['location-status'] });
    } catch {
      setErrorMsg('Could not stop sharing. Please try again.');
    } finally {
      setSessionBusy(false);
    }
  }

  function sendHug() {
    setHugSent(true);
    setTimeout(() => setHugSent(false), 4000);
  }

  const mapPoints: MapPoint[] = [];
  if (myLoc) mapPoints.push({ latitude: myLoc.latitude, longitude: myLoc.longitude, label: myLoc.displayName || 'You', emoji: user?.username === 'manuuu' ? '🎀' : '🖤', tint: user?.username === 'manuuu' ? 'bg-pink-500' : 'bg-violet-600' });
  if (partnerLoc) mapPoints.push({ latitude: partnerLoc.latitude, longitude: partnerLoc.longitude, label: partnerLoc.displayName || 'Partner', emoji: partnerUsername === 'manuuu' ? '🎀' : '🖤', tint: partnerUsername === 'manuuu' ? 'bg-pink-500' : 'bg-violet-600' });
  const expiryLabel = mySharing?.expiresAt ? formatDistanceToNow(parseISO(mySharing.expiresAt), { addSuffix: true }) : null;

  return (
    <div className="page-container animate-fade-in space-y-6">
      <div className="text-center">
        <h1 className="section-title">Our Shared Map 🗺️</h1>
        <p className="section-subtitle">Share a little location when you both choose to ✦</p>
      </div>

      <div className="glass-card p-5 sm:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-stone-800"><MapPin size={20} className="text-pink-500" /> Live shared map</h2>
            <p className="mt-1 text-sm text-stone-500">Markers update while this page is open and location access is allowed.</p>
          </div>
          {locData?.isTogether && <span className="w-fit rounded-full bg-pink-100 px-3 py-1 text-sm font-bold text-pink-700">Together right now 🫂</span>}
        </div>
        {isLoading ? <div className="mx-auto aspect-square w-full max-w-[600px] animate-pulse rounded-[1.75rem] bg-pink-100" /> : <SharedMap points={mapPoints} distanceKm={locData?.distanceKm ?? null} mapConsent={mapConsent} onAllowMap={() => setMapConsent(true)} />}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1"><Signal size={13} /> Map tiles load from OpenStreetMap when shown.</span>
          {mapConsent && mapPoints.length > 0 && <a className="inline-flex items-center gap-1 font-semibold text-purple-700 hover:underline" href={`https://www.openstreetmap.org/?mlat=${mapPoints[0].latitude}&mlon=${mapPoints[0].longitude}#map=13/${mapPoints[0].latitude}/${mapPoints[0].longitude}`} target="_blank" rel="noreferrer">Open map <ExternalLink size={12} /></a>}
        </div>
      </div>

      {errorMsg && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">{errorMsg}</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="rounded-2xl bg-pink-100 p-3 text-pink-600"><ShieldCheck size={21} /></span>
            <div>
              <h2 className="font-display text-lg font-bold text-stone-800">Your location sharing</h2>
              <p className="mt-1 text-sm text-stone-500">Only share when you choose. You can stop any time.</p>
            </div>
          </div>

          {shareActive ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 font-bold text-emerald-800"><Check size={17} /> Sharing is on</div>
              <p className="mt-1 text-sm text-emerald-700">This session expires {expiryLabel || 'automatically'}.</p>
              <button onClick={stopSharing} disabled={sessionBusy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"><Pause size={16} /> Stop sharing now</button>
              <button onClick={() => requestLocation()} disabled={updating} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-pink-700 hover:bg-pink-50 disabled:opacity-60"><RefreshCw size={16} className={updating ? 'animate-spin' : ''} /> {updating ? 'Getting location…' : 'Refresh my location'}</button>
            </div>
          ) : (
            <>
              <p className="mb-3 rounded-xl bg-white/70 p-3 text-sm text-stone-600">Start a timed session. Your phone may pause updates when the browser is in the background.</p>
              <div className="grid grid-cols-2 gap-2">
                {SESSION_OPTIONS.map(option => <button key={option.minutes} onClick={() => void startSharing(option.minutes)} disabled={sessionBusy} className="btn-primary py-2.5 text-sm disabled:opacity-60"><Play size={14} className="mr-1 inline" /> Share for {option.label}</button>)}
              </div>
            </>
          )}

          <div className="mt-5 border-t border-pink-100 pt-4">
            <label className="mb-2 block text-xs font-semibold text-stone-500" htmlFor="location-status">Add a status (optional)</label>
            <input id="location-status" value={statusMsg} onChange={event => setStatusMsg(event.target.value)} maxLength={100} placeholder="On my way home 💗" className="input-dreamy py-2.5 text-sm" />
            <label className="mb-2 mt-3 block text-xs font-semibold text-stone-500" htmlFor="location-place">Place name (optional)</label>
            <input id="location-place" value={place} onChange={event => setPlace(event.target.value)} maxLength={80} placeholder="Home, campus, café…" className="input-dreamy py-2.5 text-sm" />
            <div className="mt-3 flex flex-wrap gap-1.5">{PRESET_PLACES.map(p => <button key={p} onClick={() => { setPlace(p); if (shareActive) requestLocation(p); }} className="rounded-full border border-pink-200 bg-white px-2.5 py-1 text-xs text-stone-600 hover:bg-pink-50">{p}</button>)}</div>
          </div>
        </section>

        <section className="glass-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-2xl bg-violet-100 p-3 text-violet-600"><BatteryCharging size={21} /></span>
            <div><h2 className="font-display text-lg font-bold text-stone-800">Phone status</h2><p className="text-sm text-stone-500">Battery and last location update</p></div>
          </div>
          <div className="space-y-3">
            <BatteryCard title="Your phone" level={batteryLevel} charging={charging} />
            <BatteryCard title={partnerLoc?.displayName ? `${partnerLoc.displayName}'s phone` : 'Partner phone'} level={partnerLoc?.battery_level ?? null} charging={partnerLoc?.is_charging == null ? null : Boolean(partnerLoc.is_charging)} />
          </div>
          <div className="mt-4 rounded-2xl bg-white/70 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-700"><Clock3 size={16} className="text-purple-500" /> Location freshness</div>
            <p className="mt-1 text-sm text-stone-600">You: {myLoc?.updated_at ? formatDistanceToNow(parseISO(myLoc.updated_at), { addSuffix: true }) : 'No shared location yet'}</p>
            <p className="mt-1 text-sm text-stone-600">Partner: {partnerLoc?.updated_at ? formatDistanceToNow(parseISO(partnerLoc.updated_at), { addSuffix: true }) : partnerSharing?.enabled ? 'Waiting for their first fix' : 'Not sharing right now'}</p>
            {myLoc?.accuracy != null && <p className="mt-2 text-xs text-stone-400">Your GPS accuracy: about {Math.round(myLoc.accuracy)} m</p>}
          </div>
          <button onClick={sendHug} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 font-bold text-pink-700 hover:bg-pink-100"><Heart size={17} fill="currentColor" /> Send a long-distance hug</button>
          {hugSent && <p className="mt-2 text-center font-handwriting text-lg text-pink-600"><Sparkles size={15} className="mr-1 inline" /> Hug dispatched ✦</p>}
        </section>
      </div>

      <div className="rounded-2xl border border-purple-100 bg-white/60 p-4 text-xs leading-relaxed text-stone-500">
        <strong className="text-stone-700">Privacy & battery:</strong> Locations are visible only during an active timed session. Stop sharing to hide your marker immediately. This web app updates while its page is open; browsers and phones may pause background web pages, so this is not guaranteed 24/7 tracking. Battery status is shown only when the browser exposes it. For dependable background updates, this needs a native mobile app with a visible location permission and system indicator.
      </div>
    </div>
  );
}

function BatteryCard({ title, level, charging }: { title: string; level: number | null; charging: boolean | null }) {
  const Icon = charging ? BatteryCharging : Battery;
  return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-4">
      <div className="flex items-center gap-3"><span className={`rounded-xl p-2 ${level !== null && level <= 20 ? 'bg-amber-100 text-amber-700' : 'bg-pink-50 text-pink-600'}`}><Icon size={19} /></span><div><p className="text-sm font-bold text-stone-700">{title}</p><p className={`text-xs ${level !== null && level <= 20 ? 'font-semibold text-amber-700' : 'text-stone-500'}`}>{level !== null && level <= 20 ? 'Low battery · ' : ''}{charging === null ? 'Charging status unavailable' : charging ? 'Charging now' : 'Not charging'}</p></div></div>
      <span className={`whitespace-nowrap text-sm font-bold ${level !== null && level <= 20 ? 'text-amber-700' : 'text-stone-700'}`}>{level === null ? 'Unavailable' : `${level}%`}</span>
    </div>
  );
}
