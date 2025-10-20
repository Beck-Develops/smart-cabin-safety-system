import { get, ref, push, set } from 'firebase/database';
import database from '../firebaseConfig';

/**
 * Fetch historical temperature data for a specific device.
 * Reads from Realtime Database path: Logs/{deviceId}
 * Each entry is expected to have fields: temp_c and timestamp
 */
export const fetchHistoricalData = async (deviceId, startTimestamp, endTimestamp) => {
  if (!deviceId) throw new Error('Missing deviceId');

  try {
    const dbRef = ref(database, `Logs/${deviceId}`);
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) {
      console.warn(`⚠️ No data found for device: ${deviceId}`);
      return [];
    }

    const allData = Object.values(snapshot.val());

    // Map Firebase structure → chart-friendly format
    const dataPoints = allData
      .filter((entry) => entry.temp_c !== undefined && entry.timestamp)
      .map((entry) => ({
        temp: entry.temp_c,
        time: entry.timestamp,
      }))
      .filter((entry) => {
        const ts = new Date(entry.time).getTime();
        if (startTimestamp && ts < startTimestamp) return false;
        if (endTimestamp && ts > endTimestamp) return false;
        return true;
      })
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    console.log(`✅ Fetched ${dataPoints.length} historical data points for ${deviceId}`);
    return dataPoints;
  } catch (err) {
    console.error('❌ Error fetching historical data:', err);
    throw err;
  }
};

/**
 * Push a new temperature reading to Logs/{deviceId}.
 * Each log entry will have an auto-generated key and include temp_c + timestamp.
 */
export const pushTemperatureReading = async (deviceId, temperature) => {
  if (!deviceId) throw new Error('Missing deviceId');

  try {
    const timestamp = new Date().toISOString();
    const logRef = ref(database, `Logs/${deviceId}`);
    const newEntryRef = push(logRef);

    await set(newEntryRef, {
      temp_c: temperature,
      timestamp,
    });

    console.log(`✅ Saved temperature: ${temperature}°C at ${timestamp}`);
  } catch (err) {
    console.error('❌ Error saving temperature reading:', err);
    throw err;
  }
};
