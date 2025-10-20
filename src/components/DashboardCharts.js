import React, { useEffect, useState, useMemo } from 'react';
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

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler
);

const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

const DashboardCharts = ({ deviceId }) => {
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [intervalMinutes, setIntervalMinutes] = useState(30);

  // --- Helper: Aggregate readings by interval ---
  const aggregateByInterval = (data, minutes) => {
    const grouped = {};
    const msPerBucket = minutes * 60 * 1000;

    data.forEach((entry) => {
      const ts = new Date(entry.time).getTime();
      const bucket = Math.floor(ts / msPerBucket) * msPerBucket;
      if (!grouped[bucket]) grouped[bucket] = [];
      grouped[bucket].push(entry.value);
    });

    return Object.entries(grouped).map(([bucket, vals]) => ({
      time: new Date(parseInt(bucket)).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: vals.reduce((a, b) => a + b, 0) / vals.length,
    }));
  };

  // --- Load data from Firebase ---
  useEffect(() => {
    if (!deviceId) return;

    const loadData = async (start, end, isBackground = false) => {
      if (isBackground) setIsRefreshing(true);
      else setLoading(true);

      try {
        const data = await fetchHistoricalData(deviceId, start, end);

        if (Array.isArray(data) && data.length > 0) {
          const temps = data
            .filter((d) => d.temp !== undefined)
            .map((d) => ({
              time: d.time,
              value: Math.round((d.temp * 9) / 5 + 32),
            }));

          const humids = data
            .filter((d) => d.humidity !== undefined)
            .map((d) => ({
              time: d.time,
              value: d.humidity,
            }));

          const groupedTemp = aggregateByInterval(temps, intervalMinutes);
          const groupedHumidity = aggregateByInterval(humids, intervalMinutes);

          setTemperatureData(groupedTemp);
          setHumidityData(groupedHumidity);
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
    };

    // Initial load
    loadData(startDate?.getTime() || null, endDate?.getTime() || null, false);

    // Background refresh
    const interval = setInterval(() => {
      loadData(startDate?.getTime() || null, endDate?.getTime() || null, true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [deviceId, startDate, endDate, intervalMinutes]);

  // --- Dynamic axis scaling ---
  const [tempMin, tempMax] = useMemo(() => {
    if (temperatureData.length === 0) return [0, 100];
    const vals = temperatureData.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = (max - min) * 0.1 || 5;
    return [min - padding, max + padding];
  }, [temperatureData]);

  const [humidMin, humidMax] = useMemo(() => {
    if (humidityData.length === 0) return [0, 100];
    const vals = humidityData.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = (max - min) * 0.1 || 5;
    return [min - padding, max + padding];
  }, [humidityData]);

  // --- Chart Data ---
  const lineChartData = useMemo(
    () => ({
      labels: temperatureData.map((d) => d.time),
      datasets: [
        {
          label: 'Temperature (°F)',
          data: temperatureData.map((d) => d.value),
          borderColor: '#FF7043',
          backgroundColor: 'rgba(255, 112, 67, 0.2)',
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.4,
          fill: {
            target: 'origin',
            above: 'rgba(255, 112, 67, 0.1)',
          },
          yAxisID: 'yTemp',
        },
        {
          label: 'Humidity (%)',
          data: humidityData.map((d) => d.value),
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66, 165, 245, 0.2)',
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.4,
          fill: {
            target: 'origin',
            above: 'rgba(66, 165, 245, 0.1)',
          },
          yAxisID: 'yHumid',
        },
        {
          label: 'Safety Threshold (88°F)',
          data: Array(temperatureData.length).fill(88),
          borderColor: '#f44336',
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          yAxisID: 'yTemp',
        },
      ],
    }),
    [temperatureData, humidityData]
  );

  // --- Chart Options ---
  const lineChartOptions = useMemo(
    () => ({
      plugins: {
        title: { display: true, text: 'Temperature & Humidity History (Auto-Refreshing)' },
        legend: { position: 'bottom' },
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.05)' } },
        yTemp: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Temperature (°F)' },
          grid: { color: 'rgba(255, 112, 67, 0.1)' },
          min: tempMin,
          max: tempMax,
        },
        yHumid: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Humidity (%)' },
          grid: { drawOnChartArea: false },
          min: humidMin,
          max: humidMax,
        },
      },
      animation: { duration: 800, easing: 'easeInOutQuad' },
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
    }),
    [tempMin, tempMax, humidMin, humidMax]
  );

  // --- JSX ---
  return (
    <div
      className="dashboard-container"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '30px',
        padding: '20px',
      }}
    >
      <RealtimeDataStreamer />

      {/* ===== Temperature + Humidity Chart ===== */}
      <div
        className="line-card"
        style={{
          flex: '1 1 500px',
          maxWidth: '650px',
          maxHeight: '470px',
          background: '#fff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        {/* Filters */}
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <input
            type="date"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setStartDate(new Date(e.target.value))}
          />
          <input
            type="date"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            min={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            style={{ marginLeft: '10px' }}
          />

          <select
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            style={{
              marginLeft: '10px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              backgroundColor: '#f9f9f9',
              cursor: 'pointer',
            }}
          >
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
          </select>
        </div>

        {/* Chart */}
        {loading ? (
          <p style={{ textAlign: 'center' }}>Loading temperature and humidity data...</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={lastUpdated?.getTime() || 'chart'}
              initial={{ opacity: 0, scaleY: 0.9 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.9 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                transformOrigin: 'bottom center',
                height: '350px',
                position: 'relative',
              }}
            >
              <Line data={lineChartData} options={lineChartOptions} />

              {/* Overlay fade spinner during background refresh */}
              {isRefreshing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9em',
                    color: '#444',
                    borderRadius: '8px',
                  }}
                >
                  🔄 Refreshing data...
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Last Updated */}
        <div style={{ marginTop: '10px', textAlign: 'center', color: '#555', fontSize: '0.9em' }}>
          {lastUpdated ? (
            <p>
              ⏱ Last Updated:{' '}
              {lastUpdated.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          ) : (
            <p>⏱ Waiting for first data update...</p>
          )}
        </div>
      </div>

      {/* ===== Alert Frequency Bar Chart ===== */}
      <div
        className="bar-card"
        style={{
          flex: '1 1 500px',
          maxWidth: '600px',
          background: '#fff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minHeight: '350px',
        }}
      >
        <AlertFrequencyChart />
      </div>
    </div>
  );
};

export default DashboardCharts;
