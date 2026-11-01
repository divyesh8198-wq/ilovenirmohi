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
router.get('/status', authenticate, (_req: AuthRequest, res: Response): void => {
  const users = db.prepare('SELECT id, username, display_name FROM users').all() as {
    id: string; username: string; display_name: string;
  }[];

  const locations: Record<string, unknown> = {};
  const userLocs: { lat: number; lng: number }[] = [];

  for (const u of users) {
    const loc = db.prepare('SELECT * FROM location_tracker WHERE user_id = ?').get(u.id) as {
      latitude: number; longitude: number; place_name?: string; status_text?: string;
      battery_level?: number; updated_at: string;
    } | undefined;

    if (loc) {
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
    distanceKm,
    isTogether,
  });
});

// POST /api/location/update
router.post('/update', authenticate, (req: AuthRequest, res: Response): void => {
  const user = req.user!;
  const { latitude, longitude, accuracy, placeName, place_name, statusText, status_text, batteryLevel, battery_level } = req.body;

  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: 'Latitude and longitude required' });
    return;
  }

  const place = placeName || place_name || null;
  const status = statusText || status_text || null;
  const battery = batteryLevel !== undefined ? batteryLevel : (battery_level !== undefined ? battery_level : null);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO location_tracker (user_id, latitude, longitude, accuracy, place_name, status_text, battery_level, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      accuracy = excluded.accuracy,
      place_name = COALESCE(excluded.place_name, location_tracker.place_name),
      status_text = COALESCE(excluded.status_text, location_tracker.status_text),
      battery_level = COALESCE(excluded.battery_level, location_tracker.battery_level),
      updated_at = excluded.updated_at
  `).run(user.id, latitude, longitude, accuracy || null, place, status, battery, now);

  res.json({ message: 'Location updated! 📍', updatedAt: now });
});

export default router;
