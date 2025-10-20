import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { fetchHistoricalData } from '../utils/firebaseHelpers';
import AlertFrequencyChart from './AlertFrequencyChart';
import RealtimeDataStreamer from '../components/RealtimeDataStreamer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
} from 'chart.js';

ChartJS.register(
  ArcElement, Tooltip, Legend, Title, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler
);

const REFRESH_INTERVAL = 30 * 1000;

const DashboardCharts = ({ deviceId }) => {
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [liveMode, setLiveMode] = useState(true); 

    // Group points into buckets for chart display
  const aggregateByInterval = (data, minutes) => {
    const grouped = {};
    const msPerBucket = minutes * 60 * 1000;
    data.forEach((e) => {
      const ts = new Date(e.time).getTime();
      const bucket = Math.floor(ts / msPerBucket) * msPerBucket;
      if (!grouped[bucket]) grouped[bucket] = [];
      grouped[bucket].push(e.value);
    });
    return Object.entries(grouped).map(([bucket, vals]) => ({
      time: new Date(Number(bucket)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: vals.reduce((a, b) => a + b, 0) / vals.length,
    }));
  };

  // ✅ Local time range (no UTC shift)
  const getAdjustedRange = useCallback(() => {
    let s = startDate
      ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0).getTime()
      : null;
    let e = endDate
      ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime()
      : null;

    if (s != null && e == null) e = Date.now();
    if (s == null && e != null) s = 0;
    if (s != null && e != null && s > e) [s, e] = [e, s];

    return { adjustedStart: s, adjustedEnd: e };
  }, [startDate, endDate]);

  // ✅ Unified data loader for both live & filter mode
  const loadData = useCallback(
    async (isBackground = false) => {
      if (!deviceId) return;

      if (isBackground) setIsRefreshing(true);
      else setLoading(true);

      try {
        let adjustedStart = null;
        let adjustedEnd = null;

        if (!liveMode) {
        // 📅 Filtered mode – use selected date range
        ({ adjustedStart, adjustedEnd } = getAdjustedRange());
        } else {
        // ⏱ Live mode – show last 24 hours
        adjustedEnd = Date.now();
        adjustedStart = adjustedEnd - 24 * 60 * 60 * 1000;
        }

        const data = await fetchHistoricalData(deviceId, adjustedStart, adjustedEnd);

        if (Array.isArray(data) && data.length > 0) {
          const temps = data
            .filter((d) => d.temp !== undefined && d.temp !== null)
            .map((d) => ({ time: d.time, value: Math.round((d.temp * 9) / 5 + 32) }));

          const humids = data
            .filter((d) => d.humidity !== undefined && d.humidity !== null)
            .map((d) => ({ time: d.time, value: d.humidity }));

          setTemperatureData(aggregateByInterval(temps, intervalMinutes));
          setHumidityData(aggregateByInterval(humids, intervalMinutes));
        } else {
          setTemperatureData([]);
          setHumidityData([]);
        }

        setLastUpdated(new Date());
      } catch (err) {
        console.error('❌ Error fetching historical data:', err);
      } finally {
        if (isBackground) setIsRefreshing(false);
        else setLoading(false);
      }
    },
    [deviceId, getAdjustedRange, intervalMinutes, liveMode]
  );
  // Auto-refresh only in live mode
  useEffect(() => {
    console.log('🔁 Mode:', liveMode ? 'LIVE' : 'FILTER');
    (async () => {
        await loadData(false);
    })();

    let id = null;
    if (liveMode) {
        id = setInterval(() => loadData(true), REFRESH_INTERVAL);
    }

    return () => id && clearInterval(id);
    }, [deviceId, intervalMinutes, liveMode, loadData]);


  // Dynamic chart scaling
  const [tempMin, tempMax] = useMemo(() => {
    if (!temperatureData.length) return [0, 100];
    const vals = temperatureData.map((d) => d.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.1 || 5;
    return [min - pad, max + pad];
  }, [temperatureData]);

  const [humidMin, humidMax] = useMemo(() => {
    if (!humidityData.length) return [0, 100];
    const vals = humidityData.map((d) => d.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.1 || 5;
    return [Math.max(0, min - pad), Math.min(100, max + pad)];
  }, [humidityData]);

  const lineChartData = useMemo(() => ({
    labels: temperatureData.map((d) => d.time),
    datasets: [
      {
        label: 'Temperature (°F)',
        data: temperatureData.map((d) => d.value),
        borderColor: '#FF7043',
        backgroundColor: 'rgba(255, 112, 67, 0.2)',
        borderWidth: 2, pointRadius: 2, tension: 0.4,
        fill: { target: 'origin', above: 'rgba(255, 112, 67, 0.1)' },
        yAxisID: 'yTemp',
      },
      {
        label: 'Humidity (%)',
        data: humidityData.map((d) => d.value),
        borderColor: '#42A5F5',
        backgroundColor: 'rgba(66, 165, 245, 0.2)',
        borderWidth: 2, pointRadius: 2, tension: 0.4,
        fill: { target: 'origin', above: 'rgba(66, 165, 245, 0.1)' },
        yAxisID: 'yHumid',
      },
      {
        label: 'Safety Threshold (88°F)',
        data: Array(temperatureData.length).fill(88),
        borderColor: '#f44336',
        borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, fill: false,
        yAxisID: 'yTemp',
      },
    ],
  }), [temperatureData, humidityData]);

  const lineChartOptions = useMemo(() => ({
    plugins: {
      title: { display: true, text: `Temperature & Humidity History (${liveMode ? 'Live' : 'Filtered'})` },
      legend: { position: 'bottom' },
    },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.05)' } },
      yTemp:  { type: 'linear', position: 'left',  title: { display: true, text: 'Temperature (°F)' }, grid: { color: 'rgba(255,112,67,0.1)' }, min: tempMin,  max: tempMax },
      yHumid: { type: 'linear', position: 'right', title: { display: true, text: 'Humidity (%)' }, grid: { drawOnChartArea: false }, min: humidMin, max: humidMax },
    },
    animation: { duration: 800, easing: 'easeInOutQuad' },
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
  }), [tempMin, tempMax, humidMin, humidMax, liveMode]);

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px', padding: '20px' }}>
      <RealtimeDataStreamer />

      <div className="line-card" style={{ flex: '1 1 500px', maxWidth: '650px', maxHeight: '470px', background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative' }}>
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <button
            onClick={() => setLiveMode(!liveMode)}
            style={{
              marginRight: '10px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: liveMode ? '#1976d2' : '#9e9e9e',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {liveMode ? 'Switch to Filter Mode' : 'Switch to Live Mode'}
          </button>

          {!liveMode && (
            <>
              <input type="date" value={startDate ? startDate.toISOString().split('T')[0] : ''} onChange={(e) => setStartDate(new Date(e.target.value))} />
              <input type="date" value={endDate ? endDate.toISOString().split('T')[0] : ''} min={startDate ? startDate.toISOString().split('T')[0] : ''} onChange={(e) => setEndDate(new Date(e.target.value))} style={{ marginLeft: '10px' }} />
              <select value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value))} style={{ marginLeft: '10px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', cursor: 'pointer' }}>
                <option value={5}>5 min</option><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>1 hour</option>
              </select>
              <button onClick={() => loadData(false)} style={{ marginLeft: '10px', padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#4CAF50', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                Apply Filter
              </button>
            </>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center' }}>Loading temperature and humidity data...</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={lastUpdated?.getTime() || 'chart'} initial={{ opacity: 0, scaleY: 0.9 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0.9 }} transition={{ duration: 0.6, ease: 'easeOut' }} style={{ transformOrigin: 'bottom center', height: '350px', position: 'relative' }}>
              <Line data={lineChartData} options={lineChartOptions} />
              {isRefreshing && liveMode && (
                <motion.div initial={{ opacity: 0.4 }} animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95em', color: '#444', borderRadius: '8px', pointerEvents: 'none' }}>
                  🔄 Refreshing data...
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <div style={{ marginTop: '10px', textAlign: 'center', color: '#555', fontSize: '0.9em' }}>
          {lastUpdated ? (
            <p>⏱ Last Updated: {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          ) : (
            <p>⏱ Waiting for first data update...</p>
          )}
        </div>
      </div>

      <div className="bar-card" style={{ flex: '1 1 500px', maxWidth: '600px', background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minHeight: '350px' }}>
        <AlertFrequencyChart />
      </div>
    </div>
  );
};

export default DashboardCharts;
