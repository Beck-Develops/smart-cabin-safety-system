// src/components/AlertFrequencyChart.js
import React, { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { ref, onValue } from 'firebase/database';
import database from '../firebaseConfig';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register chart components
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const AlertFrequencyChart = () => {
  const [alertCounts, setAlertCounts] = useState({}); // e.g. { Temperature: 3, Power: 2, Battery: 1 }

  useEffect(() => {
    const alertsRef = ref(database, 'Alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      if (snapshot.exists()) {
        const alerts = snapshot.val();
        const counts = {};

        // Aggregate counts in real time
        Object.values(alerts).forEach((alert) => {
          const type = alert.type || 'Unknown';
          counts[type] = (counts[type] || 0) + 1;
        });

        setAlertCounts(counts);
      } else {
        setAlertCounts({});
      }
    });

    return () => unsubscribe();
  }, []);

  // Convert the counts object into chart-friendly arrays
  const labels = Object.keys(alertCounts);
  const counts = Object.values(alertCounts);

  const barChartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Active Alerts',
        data: counts,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 1,
      },
    ],
  }), [labels, counts]);

  const barChartOptions = {
    plugins: {
      title: {
        display: true,
        text: 'Realtime Alert Frequency by Type',
      },
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Alert Count' },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div
      style={{
        flex: '1 1 400px',
        maxWidth: '600px',
        background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        height: '350px',
      }}
    >
      {labels.length > 0 ? (
        <Bar data={barChartData} options={barChartOptions} />
      ) : (
        <p style={{ textAlign: 'center' }}>Waiting for alerts...</p>
      )}
    </div>
  );
};

export default AlertFrequencyChart;
