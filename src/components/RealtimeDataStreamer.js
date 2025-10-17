import React, { useState, useEffect } from 'react';
import database from '../firebaseConfig'; // Import the initialized database instance
import { ref, onValue } from 'firebase/database';

// Define the unique ID for your single prototype device
const DEVICE_ID = "car_001"; 

// Define the component to stream the data
const RealtimeDataStreamer = () => {
  // State to hold the latest sensor data
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Define the path in the Realtime Database
    const deviceRef = ref(database, `Devices/${DEVICE_ID}`);

    // 2. Set up the Real-Time Listener using onValue
    // This listener fires immediately and then again every time data changes at the path.
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      setLoading(false);
      setError(null);
      
      // Check if data exists at the path
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Update the component state with the new data payload
        setSensorData(data);
        
        console.log("New data received:", data);
      } else {
        setSensorData(null);
        console.log(`No data available for device: ${DEVICE_ID}`);
      }
    }, (dbError) => {
        // Handle potential errors (e.g., permission denied, network issues)
        setLoading(false);
        setError(`Database Error: ${dbError.message}`);
        console.error("Firebase Read Error:", dbError);
    });

    // 3. Clean-up Function: Crucial for performance!
    // When the component is unmounted (removed from the screen), 
    // this function unsubscribes the listener to prevent memory leaks and unnecessary billing.
    return () => {
      unsubscribe();
      console.log("Real-time listener unsubscribed.");
    };
  },); // Empty dependency array ensures this effect runs only ONCE after the initial render.

  
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
  
  // Destructure the data for easier use and display
  const { 
    temp_c, 
    pir_1, 
    pir_2, 
    pir_3, 
    safety_trigger, 
    timestamp, 
    uptime_mins 
  } = sensorData;

  // Formatting timestamp for display
  const lastUpdated = timestamp? new Date(parseInt(timestamp)).toLocaleTimeString() : 'N/A';

  return (
    <div className="telemetry-dashboard">
      <h2>Smart Cabin Status: {DEVICE_ID}</h2>
      
      {/* Real-Time Safety Alert Banner */}
      <div className={`alert-banner ${safety_trigger === true? 'critical-danger' : 'status-ok'}`}>
        {safety_trigger === true 
         ? '!! CRITICAL SAFETY ALERT: AC ACTIVATION REQUIRED!!' 
          : 'Status OK: Conditions Nominal.'
        }
      </div>

      <div className="sensor-data-grid">
        <p><strong>Cabin Temperature:</strong> {temp_c? temp_c.toFixed(1) : 'N/A'} °C</p>
        <p><strong>PIR Status (Life Detect):</strong> {pir_1 === 1 || pir_2 === 1 || pir_3 === 1? 'DETECTED' : 'NONE'}</p>
        <p><strong>PIR 1 Raw:</strong> {pir_1}</p>
        <p><strong>PIR 2 Raw:</strong> {pir_2}</p>
        <p><strong>PIR 3 Raw:</strong> {pir_3}</p>
        <p><strong>System Uptime:</strong> {uptime_mins} minutes</p>
      </div>

      <small>Last Update: {lastUpdated}</small>
    </div>
  );
};

export default RealtimeDataStreamer;