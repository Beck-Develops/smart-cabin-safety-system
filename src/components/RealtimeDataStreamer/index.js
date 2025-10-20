import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import database from '../../firebaseConfig';

const DEVICE_ID = 'car_001';

const RealtimeDataStreamer = () => {
  const [sensorData, setSensorData] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [localLedCommand, setLocalLedCommand] = useState(false);

  useEffect(() => {
    const dataRef = ref(database, `Devices/${DEVICE_ID}`);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSensorData(data);
        setManualMode(data.control?.remote_override || false);
        setLocalLedCommand(data.control?.led_command || false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleManualMode = async () => {
    try {
      setSending(true);
      const controlRef = ref(database, `Devices/${DEVICE_ID}/control`);
      const newOverride = !manualMode;

      await update(controlRef, {
        remote_override: newOverride,
        // When turning off manual mode, reset LED command to match device state
        led_command: newOverride ? localLedCommand : sensorData.led_state,
      });

      setManualMode(newOverride);
      console.log(`Manual override ${newOverride ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Error toggling manual mode:', err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleLED = async () => {
    if (!manualMode) {
      alert('Enable manual mode first!');
      return;
    }

    try {
      setSending(true);
      const controlRef = ref(database, `Devices/${DEVICE_ID}/control`);
      const newLEDCommand = !localLedCommand;
      await update(controlRef, {
        led_command: newLEDCommand,
      });

      setLocalLedCommand(newLEDCommand);
      console.log(`🛰 Sent LED command: ${newLEDCommand ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('Error sending LED command:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p>Loading live data...</p>;

  const { temp_c, humidity, motion_detected, motion_source, safety_trigger, led_state, timestamp } =
    sensorData;

  return (
    <div
      style={{
        background: '#111',
        color: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        width: '350px',
        margin: 'auto',
        boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)',
      }}
    >
      <h2 style={{ color: '#4CAF50', textAlign: 'center' }}>Smart Cabin Dashboard</h2>

      <p>🌡️ Temperature:{" "}
        {temp_c !== undefined && temp_c !== null
          ? ((temp_c * 9) / 5 + 32).toFixed(1)
          : "--"}°F
      </p>

      <p>💧 Humidity: {humidity?.toFixed(1)}%</p>
      <p>🎯 Motion: {motion_detected ? 'Detected' : 'None'}</p>
      <p>📍 Sensor: {motion_source}</p>
      <p>⚠️ Safety Trigger: {safety_trigger ? 'YES' : 'No'}</p>

      <div style={{ margin: '1rem 0', textAlign: 'center' }}>
        <button
          onClick={handleToggleManualMode}
          disabled={sending}
          style={{
            background: manualMode ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          {manualMode ? '🔓 Exit Manual Mode' : '🔒 Enter Manual Mode'}
        </button>

        <br />

        <button
          onClick={handleToggleLED}
          disabled={sending || !manualMode}
          style={{
            background: localLedCommand ? '#4CAF50' : '#555',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            cursor: manualMode ? 'pointer' : 'not-allowed',
            opacity: manualMode ? 1 : 0.6,
          }}
        >
          💡 LED {localLedCommand ? 'ON' : 'OFF'}
        </button>
      </div>

      <div
        style={{
          marginTop: '1rem',
          width: '100%',
          height: '20px',
          borderRadius: '10px',
          background: led_state ? '#4CAF50' : '#B22222',
          boxShadow: led_state
            ? '0 0 10px #4CAF50'
            : '0 0 5px #B22222',
        }}
      ></div>

      <small style={{ display: 'block', marginTop: '0.5rem', color: '#aaa' }}>
        Last update: {new Date(timestamp).toLocaleTimeString()}
      </small>
    </div>
  );
};

export default RealtimeDataStreamer;
