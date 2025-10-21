// src/components/AlertFrequencyChart.js
import React, { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { ref, onValue, push, set } from 'firebase/database';
import database from '../firebaseConfig';
import * as tf from '@tensorflow/tfjs';
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
  const [alertCounts, setAlertCounts] = useState({});
  const [model, setModel] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState('Analyzing...');
  const [aiConfidence, setAiConfidence] = useState(null);

  // 🧠 Load the TensorFlow.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const loaded = await tf.loadGraphModel('/models/model.json');
        setModel(loaded);
        console.log('✅ AI prescriptive model loaded');
      } catch (err) {
        console.error('❌ Error loading AI model:', err);
      }
    };
    loadModel();
  }, []);

  // 🧮 Fetch alerts in realtime and run AI inference
  useEffect(() => {
    const alertsRef = ref(database, 'Alerts');
    const unsubscribe = onValue(alertsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setAlertCounts({});
        setAiRecommendation('No Data');
        return;
      }

      const alerts = snapshot.val();
      const counts = {};

      Object.values(alerts).forEach((alert) => {
        const type = alert.type || 'Unknown';
        counts[type] = (counts[type] || 0) + 1;
      });

      setAlertCounts(counts);

      // 🔮 Run AI inference on latest sensor readings
      if (model) {
        const alertsArray = Object.values(alerts);
        const recentAlert = alertsArray.reverse().find(a => a.temp_c != null && a.humidity != null);

        if (recentAlert) {
          const { temp_c, humidity, motion_detected, safety_trigger } = recentAlert;

          // 🧩 RULE-BASED SAFETY LOGIC
          let ruleLabel = 'Safe';
          if (safety_trigger) ruleLabel = 'Emergency';
          else if (motion_detected && temp_c > 27) ruleLabel = 'Emergency';
          else if (temp_c > 35 && !motion_detected) ruleLabel = 'Danger';
          else if (humidity > 85 && temp_c > 27) ruleLabel = 'Warning';
          else if (temp_c > 27) ruleLabel = 'Warning';
          else ruleLabel = 'Safe';

          // 🧠 AI Model (optional refinement)
          const input = tf.tensor2d([[temp_c, humidity]]);
          const prediction = model.predict(input);
          const result = await prediction.array();
          const [safe, warning, danger, emergency] = result[0];
          const probs = [safe, warning, danger, emergency];
          const labels = ['Safe', 'Warning', 'Danger', 'Emergency'];
          const maxIdx = probs.indexOf(Math.max(...probs));

          // Merge rule-based and AI logic
          const finalLabel =
            ruleLabel === 'Emergency' && labels[maxIdx] !== 'Emergency'
              ? 'Emergency'
              : ruleLabel;

          const confidence = Math.round(probs[maxIdx] * 100);
          setAiRecommendation(finalLabel);
          setAiConfidence(confidence);

          // Optional: Log recommendation to Firebase
          try {
            const newRef = push(ref(database, 'AI_Recommendations'));
            await set(newRef, {
              recommendation: finalLabel,
              confidence,
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.warn('⚠️ Failed to log AI recommendation:', err);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [model]);

  // 🎨 Dynamic colors based on AI state
  const baseColors = {
    Safe: 'rgba(75, 192, 192, 0.6)',
    Warning: 'rgba(255, 206, 86, 0.6)',
    Danger: 'rgba(255, 159, 64, 0.6)',
    Emergency: 'rgba(255, 99, 132, 0.6)',
    Default: 'rgba(54, 162, 235, 0.6)',
  };

  const bgColor = baseColors[aiRecommendation] || baseColors.Default;

  // 🧾 Chart data
  const labels = Object.keys(alertCounts);
  const counts = Object.values(alertCounts);

  const barChartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Active Alerts',
        data: counts,
        backgroundColor: bgColor,
        borderColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 1,
      },
    ],
  }), [labels, counts, bgColor]);

  const barChartOptions = {
    plugins: {
      title: { display: true, text: 'Realtime Alert Frequency by Type' },
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Alert Count' } },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // 🧠 Recommendation card color logic
  const recColor =
    aiRecommendation === 'Safe' ? '#4CAF50' :
    aiRecommendation === 'Warning' ? '#FFC107' :
    aiRecommendation === 'Danger' ? '#FF5722' :
    aiRecommendation === 'Emergency' ? '#F44336' :
    '#9E9E9E';

  return (
    <div
      style={{
        flex: '1 1 400px',
        maxWidth: '600px',
        background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        height: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* 🔮 AI Recommendation Panel */}
      <div
        style={{
          textAlign: 'center',
          backgroundColor: recColor,
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '10px',
          transition: 'background-color 0.5s ease',
        }}
      >
        <h4 style={{ margin: 0 }}>AI Safety Recommendation</h4>
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em' }}>
          {aiRecommendation}
        </p>
        {aiConfidence != null && (
          <p style={{ margin: 0, fontSize: '0.9em' }}>
            Confidence: {aiConfidence}%
          </p>
        )}
      </div>

      {/* 📊 Bar Chart */}
      <div style={{ flex: 1 }}>
        {labels.length > 0 ? (
          <Bar data={barChartData} options={barChartOptions} />
        ) : (
          <p style={{ textAlign: 'center' }}>Waiting for alerts...</p>
        )}
      </div>
    </div>
  );
};

export default AlertFrequencyChart;
