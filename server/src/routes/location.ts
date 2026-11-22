import { Router, Response } from 'express';
import db from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Calculate distance in km using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/location/status
router.get('/status', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await db.prepare('SELECT id, username, display_name FROM users').all() as {
    id: string; username: string; display_name: string;
  }[];

  const locations: Record<string, unknown> = {};
  const sharing: Record<string, { enabled: boolean; expiresAt: string | null }> = {};
  const userLocs: { lat: number; lng: number }[] = [];

  for (const u of users) {
    const share = await db.prepare('SELECT enabled, expires_at, updated_at FROM location_sharing WHERE user_id = ?').get(u.id) as {
      enabled: number; expires_at: string | null; updated_at: string;
    } | undefined;
    const isShareActive = Boolean(share?.enabled) && (!share?.expires_at || new Date(share.expires_at).getTime() > Date.now());
    sharing[u.username] = { enabled: isShareActive, expiresAt: isShareActive ? share?.expires_at ?? null : null };
    const loc = await db.prepare('SELECT * FROM location_tracker WHERE user_id = ?').get(u.id) as {
      latitude: number; longitude: number; place_name?: string; status_text?: string;
      battery_level?: number; is_charging?: number; updated_at: string;
    } | undefined;

    if (loc && isShareActive && share && new Date(loc.updated_at).getTime() >= new Date(share.updated_at).getTime()) {
      locations[u.username] = {
        ...loc,
        displayName: u.display_name,
      };
      userLocs.push({ lat: loc.latitude, lng: loc.longitude });
    } else {
      locations[u.username] = null;
    }
  }

  let distanceKm: number | null = null;
  let isTogether = false;

  if (userLocs.length === 2) {
    distanceKm = calculateDistance(userLocs[0].lat, userLocs[0].lng, userLocs[1].lat, userLocs[1].lng);
    isTogether = distanceKm <= 0.15; // Within 150 meters
  }

  res.json({
    locations,
    sharing,
    distanceKm,
    isTogether,
  });
});

// Sharing is always started or stopped by the account owner. Sessions expire automatically.
router.post('/sharing', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const enabled = req.body?.enabled === true;
  const now = new Date();
  const durationMinutes = Number(req.body?.durationMinutes);

  if (enabled && ![15, 60, 240, 1440].includes(durationMinutes)) {
    res.status(400).json({ error: 'Choose a sharing duration of 15 minutes, 1 hour, 4 hours, or 24 hours.' });
    return;
  }

  const expiresAt = enabled ? new Date(now.getTime() + durationMinutes * 60_000).toISOString() : null;
  await db.prepare(`
    INSERT INTO location_sharing (user_id, enabled, expires_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      enabled = excluded.enabled,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
  `).run(user.id, enabled ? 1 : 0, expiresAt, now.toISOString());

  res.json({ enabled, expiresAt });
});

// POST /api/location/update
router.post('/update', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { latitude, longitude, accuracy, placeName, place_name, statusText, status_text, batteryLevel, battery_level, isCharging, is_charging } = req.body;

  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: 'Latitude and longitude required' });
    return;
  }

  const place = placeName || place_name || null;
  const status = statusText || status_text || null;
  const battery = batteryLevel !== undefined ? batteryLevel : (battery_level !== undefined ? battery_level : null);
  const rawCharging = isCharging !== undefined ? isCharging : (is_charging !== undefined ? is_charging : null);
  const charging = rawCharging === null ? null : rawCharging ? 1 : 0;
  const now = new Date().toISOString();

  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);
  if (!Number.isFinite(latitudeNumber) || latitudeNumber < -90 || latitudeNumber > 90 ||
      !Number.isFinite(longitudeNumber) || longitudeNumber < -180 || longitudeNumber > 180) {
    res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    return;
  }

  const share = await db.prepare('SELECT enabled, expires_at FROM location_sharing WHERE user_id = ?').get(user.id) as {
    enabled: number; expires_at: string | null;
  } | undefined;
  if (!share?.enabled || (share.expires_at && new Date(share.expires_at).getTime() <= Date.now())) {
    res.status(409).json({ error: 'Start a location sharing session before syncing your location.' });
    return;
  }

  await db.prepare(`
    INSERT INTO location_tracker (user_id, latitude, longitude, accuracy, place_name, status_text, battery_level, is_charging, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      accuracy = excluded.accuracy,
      place_name = COALESCE(excluded.place_name, location_tracker.place_name),
      status_text = COALESCE(excluded.status_text, location_tracker.status_text),
      battery_level = COALESCE(excluded.battery_level, location_tracker.battery_level),
      is_charging = COALESCE(excluded.is_charging, location_tracker.is_charging),
      updated_at = excluded.updated_at
  `).run(user.id, latitudeNumber, longitudeNumber, accuracy || null, place, status, battery, charging, now);

  res.json({ message: 'Location updated! 📍', updatedAt: now });
});

export default router;
