import { get, ref, push, set } from 'firebase/database';
import database from '../firebaseConfig';

/**
 * Fetch historical temperature + humidity data for a specific device.
 * Reads from: Logs/{deviceId}
 * Each entry is expected to have fields: temp_c, humidity, and timestamp
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
      .filter(
        (entry) =>
          (entry.temp_c !== undefined || entry.humidity !== undefined) && entry.timestamp
      )
      .map((entry) => ({
        temp: entry.temp_c ?? null,
        humidity: entry.humidity ?? null,
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
 * Push a new temperature & humidity reading to Logs/{deviceId}.
 * Each log entry has auto-generated key and includes temp_c, humidity, and timestamp.
 */
export const pushTemperatureReading = async (deviceId, temperature, humidity) => {
  if (!deviceId) throw new Error('Missing deviceId');

  try {
    const timestamp = new Date().toISOString();
    const logRef = ref(database, `Logs/${deviceId}`);
    const newEntryRef = push(logRef);

    await set(newEntryRef, {
      temp_c: temperature,
      humidity: humidity ?? null,
      timestamp,
    });

    console.log(
      `✅ Saved temperature: ${temperature}°C, humidity: ${humidity ?? 'N/A'}% at ${timestamp}`
    );
  } catch (err) {
    console.error('❌ Error saving temperature reading:', err);
    throw err;
  }
};
