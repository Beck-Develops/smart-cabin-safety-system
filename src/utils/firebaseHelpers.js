import { get, ref, push, set } from 'firebase/database';
import database from '../firebaseConfig';

/**
 * Fetch historical temp + humidity for a device from Logs/{deviceId}.
 * - Accepts ISO strings, epoch millis, and old `millis()` (small numbers).
 * - If it detects `millis()` rows, it aligns them to wall time so filters still work.
 */
export const fetchHistoricalData = async (deviceId, startTs, endTs) => {
  if (!deviceId) throw new Error('Missing deviceId');

  const snap = await get(ref(database, `Logs/${deviceId}`));
  if (!snap.exists()) return [];

  const raw = Object.values(snap.val() || {});

  // Parse and split by timestamp type
  const EPOCH_THRESHOLD = 946684800000; // 2000-01-01
  const isoOrEpoch = [];
  const millisOnly = [];

  for (const e of raw) {
    const hasReading = e && (e.temp_c != null || e.humidity != null);
    if (!hasReading || e.timestamp == null) continue;

    let ts;
    if (typeof e.timestamp === 'number') {
      ts = e.timestamp;
    } else {
      const p = Date.parse(e.timestamp);
      ts = Number.isFinite(p) ? p : null;
    }
    if (ts == null) continue;

    const row = {
      temp: e.temp_c ?? null,
      humidity: e.humidity ?? null,
      _ts: ts,
    };

    if (ts >= EPOCH_THRESHOLD) isoOrEpoch.push(row);
    else millisOnly.push(row); // old `millis()`
  }

  // Align millis()-based rows to wall time
  if (millisOnly.length) {
    const maxMillis = Math.max(...millisOnly.map(r => r._ts));
    let anchorNow = Date.now();

    // If we have real epoch rows too, align against them (better)
    if (isoOrEpoch.length) {
      const maxEpoch = Math.max(...isoOrEpoch.map(r => r._ts));
      const offset = maxEpoch - maxMillis;
      for (const r of millisOnly) r._ts = r._ts + offset;
    } else {
      // Otherwise align to "now" so newest millis() ≈ now
      const offset = anchorNow - maxMillis;
      for (const r of millisOnly) r._ts = r._ts + offset;
    }
  }

  const all = [...isoOrEpoch, ...millisOnly]
    .filter(r => {
      if (startTs != null && r._ts < startTs) return false;
      if (endTs != null && r._ts > endTs) return false;
      return true;
    })
    .sort((a, b) => a._ts - b._ts)
    .map(r => ({
      temp: r.temp,
      humidity: r.humidity,
      time: new Date(r._ts).toISOString(),
    }));

  return all;
};

/**
 * Push temp + humidity (used by your web test sender).
 * Uses ISO so it’s epoch-friendly.
 */
export const pushTemperatureReading = async (deviceId, temperature, humidity) => {
  if (!deviceId) throw new Error('Missing deviceId');
  const timestamp = new Date().toISOString();
  const newRef = push(ref(database, `Logs/${deviceId}`));
  await set(newRef, { temp_c: temperature, humidity: humidity ?? null, timestamp });
};

/**
 * Optional helper to push full snapshot from web (test).
 */
export const pushEnvironmentalReading = async (deviceId, data) => {
  if (!deviceId) throw new Error('Missing deviceId');
  const {
    temp_c = null,
    humidity = null,
    motion_detected = null,
    motion_source = null,
    safety_trigger = null,
    led_state = null,
    timestamp = new Date().toISOString(),
  } = data;

  const newRef = push(ref(database, `Logs/${deviceId}`));
  await set(newRef, { temp_c, humidity, motion_detected, motion_source, safety_trigger, led_state, timestamp });
};
