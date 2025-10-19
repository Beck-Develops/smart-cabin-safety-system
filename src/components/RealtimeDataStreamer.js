import React, { useState, useEffect } from 'react';
import database from '../firebaseConfig'; // Import the initialized database instance
import { ref, onValue } from 'firebase/database';
import SafetyAlertBanner from './SafetyAlertBanner'; // Import the alert component

// Define the unique ID for your prototype device
const DEVICE_ID = "car_001"; 

const RealtimeDataStreamer = () => {
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Define the Firebase path
    const deviceRef = ref(database, `Devices/${DEVICE_ID}`);

    // 2. Attach the real-time listener
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      setLoading(false);
      setError(null);

      if (snapshot.exists()) {
        const data = snapshot.val();
        setSensorData(data);
        console.log("New data received:", data);
      } else {
        setSensorData(null);
        console.log(`No data available for device: ${DEVICE_ID}`);
      }
    }, (dbError) => {
      setLoading(false);
      setError(`Database Error: ${dbError.message}`);
      console.error("Firebase Read Error:", dbError);
    });

    // 3. Cleanup listener on component unmount
    return () => {
      unsubscribe();
      console.log("Real-time listener unsubscribed.");
    };
  }, []); // Run only once after initial render


  // --- RENDERING LOGIC ---

  if (loading) {
    return <div className="loading-state">Connecting to Vehicle Edge...</div>;
  }

  if (error) {
    return <div className="error-state">Error: {error}</div>;
  }

  if (!sensorData) {
    return <div className="no-data-state">Waiting for initial telemetry data from {DEVICE_ID}.</div>;
  }

  // ✅ Destructure fields to match your Firebase structure
  const { 
    temp_c,
    humidity,
    led_state,
    motion_detected,
    motion_source,
    safety_trigger,
    timestamp
  } = sensorData;

  // Optional: interpret timestamp as uptime in minutes if it's a counter
  const uptimeMins = timestamp ? (timestamp / 60000).toFixed(1) : 'N/A';

  return (
    <div className="telemetry-dashboard">
      <h2>Smart Cabin Status: {DEVICE_ID}</h2>

      {/* ✅ Reusable Real-Time Safety Alert Banner */}
      <SafetyAlertBanner safety_trigger={safety_trigger} />

      <div className="sensor-data-grid">
        <p><strong>Cabin Temperature:</strong> {temp_c ? temp_c.toFixed(1) : 'N/A'} °C</p>
        <p><strong>Humidity:</strong> {humidity ? humidity.toFixed(1) : 'N/A'} %</p>
        <p><strong>Motion Detected:</strong> {motion_detected ? 'YES' : 'NO'}</p>
        <p><strong>Motion Source:</strong> {motion_source || 'None'}</p>
        <p><strong>LED State:</strong> {led_state ? 'ON' : 'OFF'}</p>
        <p><strong>Safety Trigger:</strong> {safety_trigger ? 'ACTIVE' : 'INACTIVE'}</p>
        <p><strong>Uptime:</strong> {uptimeMins} minutes</p>
      </div>

      <small>Last Data Timestamp: {timestamp}</small>
    </div>
  );
};

export default RealtimeDataStreamer;
