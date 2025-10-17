// src/components/DashboardCharts.js
import React, { useEffect, useState, useMemo } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import { ref, onValue } from 'firebase/database';
import database from '../firebaseConfig';
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
} from 'chart.js';


// Register necessary Chart.js elements
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    Title,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement
);

const DashboardCharts = ({ deviceId }) => {
    const [healthScore, setHealthScore] = useState(0);
    const [totalDevices, setTotalDevices] = useState(0);

    useEffect(() => {
        const devicesRef = ref(database, 'Devices');

        const unsubscribe = onValue(devicesRef, (snapshot) => {
            if (snapshot.exists()) {
                const devices = snapshot.val();
                let reportingDevices = 0;
                let totalCount = 0;
                const oneMinuteAgo = Date.now() - 60000;

                Object.keys(devices).forEach((key) => {
                    totalCount++;
                    const lastTimestamp = devices[key].timestamp;
                    if (lastTimestamp && lastTimestamp > oneMinuteAgo) {
                        reportingDevices++;
                    }
                });

                setTotalDevices(totalCount);
                if (totalCount > 0) {
                    const score = Math.round((reportingDevices / totalCount) * 100);
                    setHealthScore(score);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Memoize chart data to prevent flicker
    const gaugeData = useMemo(() => ({
        labels: ['Reporting', 'Not Reporting'],
        datasets: [
            {
                data: [healthScore, 100 - healthScore],
                backgroundColor: ['#4CAF50', '#efefef'], // green & gray
                borderWidth: 0,
                hoverOffset: 0,
            },
        ],
    }), [healthScore]);

    // Animated gauge options
    const gaugeOptions = {
        circumference: 180,  // half-circle
        rotation: -90,       // starts at bottom
        cutout: '80%',
        animation: {
            duration: 1000,  // smooth 1s transition
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: `Fleet Health: ${healthScore}%`,
                padding: { top: 10, bottom: 10 },
                font: { size: 18 }
            },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.label}: ${context.parsed}%`,
                },
            },
        },
        responsive: true,
        maintainAspectRatio: false,
    };

    // --- SIMULATED HISTORICAL DATA (Replace with Firebase Listener later) ---
    const simulateHistoricalData = () => {
        const data = [];
        const now = Date.now();
        for (let i = 24; i >= 0; i--) {
            const time = new Date(now - (i * 3600000)); // 1 hour intervals
            // Simulate a fluctuating temperature with a spike around 3PM
            let temp = 20 + Math.sin(i / 4) * 5 + (i > 10 && i < 16 ? 5 : 0) + Math.random() * 2;

            data.push({
                timestamp: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                temperature: parseFloat(temp.toFixed(1)),
            });
        }
        return data;
    };

    // --- Time-Series Data Structure ---
    const historicalData = simulateHistoricalData(); // Call the simulation function

    const lineChartData = useMemo(() => ({
        labels: historicalData.map(d => d.timestamp),
        datasets: [
            {
                label: 'Temperature (°C)',
                data: historicalData.map(d => d.temperature),
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Safety Threshold (30°C)',
                data: Array(historicalData.length).fill(30),
                borderColor: '#f44336',
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0,
                fill: false,
            },
        ],
    }), [historicalData]);

    const lineChartOptions = useMemo(() => ({
        plugins: {
            title: {
                display: true,
                text: '24-Hour Temperature Trend & Safety Threshold',
            },
            legend: { position: 'bottom' },
        },
        scales: {
            y: {
                title: { display: true, text: 'Temperature (°C)' },
                min: 15,
                max: 35,
            },
        },
        animation: { duration: 800, easing: 'easeOutQuart' },
    }), []);


    return (
        <div className="dashboard-container" style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '30px',
            padding: '20px',
        }}>
            {/* Fleet Health Gauge */}
            <div className="gauge-card" style={{
                flex: '1 1 300px',
                maxWidth: '350px',
                background: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                <h3>Fleet Operational Health</h3>
                <div style={{ height: '250px', width: '100%' }}>
                    <Doughnut data={gaugeData} options={gaugeOptions} />
                </div>
                <p style={{ textAlign: 'center', marginTop: '10px' }}>
                    Total Devices: {totalDevices}
                </p>
            </div>

            {/* Temperature Trend Line Chart */}
            <div className="line-card" style={{
                flex: '1 1 500px',
                maxWidth: '600px',
                background: '#fff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
                <Line data={lineChartData} options={lineChartOptions} />
            </div>
        </div>
    );

};

export default DashboardCharts;
