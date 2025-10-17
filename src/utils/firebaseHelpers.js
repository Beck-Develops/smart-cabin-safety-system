import { ref, set } from 'firebase/database';
import database from '../firebaseConfig';

export const pushTemperatureReading = async (deviceId, temperature) => {
    if (!deviceId) throw new Error('Missing deviceId');

    const timestamp = new Date().toISOString();
    const tempRef = ref(database, `TemperatureHistory/${deviceId}/${timestamp}`);

    await set(tempRef, temperature);
    console.log(`Saved temperature: ${temperature}°C at ${timestamp}`);
};
