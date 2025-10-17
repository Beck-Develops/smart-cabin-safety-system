// src/components/DashboardCharts.js
import React, { useEffect, useState, useMemo } from 'react';
import { Doughnut, Line, } from 'react-chartjs-2';
import { query, orderByKey, limitToLast, ref, onValue } from 'firebase/database';
import database from '../firebaseConfig';
//import { pushTemperatureReading } from '../utils/firebaseHelpers';
import AlertFrequencyChart from './AlertFrequencyChart';
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
    LineElement,
    BarElement
);

const DashboardCharts = ({ deviceId }) => {
    const [temperatureData, setTemperatureData] = useState([]);
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

    // Fetch Temperature History from Firebase
    useEffect(() => {
        if (!deviceId) return;

        const historyQuery = query(
        ref(database, `TemperatureHistory/${deviceId}`),
        orderByKey(),
        limitToLast(24) // last 24 entries
    );

    const unsubscribe = onValue(historyQuery, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const entries = Object.entries(data).map(([timestamp, temp]) => ({
                timestamp: new Date(timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                temperature: parseFloat(temp),
            }));
            setTemperatureData(entries);
        }
    });
        return () => unsubscribe();
    }, [deviceId]);

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

    

    const lineChartData = useMemo(() => ({
        labels: temperatureData.map(d => d.timestamp),
        datasets: [
            {
                label: 'Temperature (°C)',
                data: temperatureData.map(d => d.temperature),
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Safety Threshold (30°C)',
                data: Array(temperatureData.length).fill(30),
                borderColor: '#f44336',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
            },
        ],
    }), [temperatureData]);

    const lineChartOptions = useMemo(() => ({
        plugins: {
            title: { display: true, text: '24-Hour Temperature Trend' },
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
        responsive: true,
        maintainAspectRatio: false,
    }), []);


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
            {/* Health Gauge */}
            <div
                className="gauge-card"
                style={{
                    flex: '1 1 300px',
                    maxWidth: '350px',
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
            >
                <h3>Fleet Operational Health</h3>
                <div style={{ height: '250px', width: '100%' }}>
                    <Doughnut
                        data={gaugeData} 
                        options={gaugeOptions}
                    />
                </div>
                <p style={{ textAlign: 'center', marginTop: '10px' }}>
                    Total Devices: {totalDevices}
                </p>
            </div>

            {/* Temperature Line Chart */}
            <div
                className="line-card"
                style={{
                    flex: '1 1 500px',
                    maxWidth: '600px',
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
            >
                {temperatureData.length > 0 ? (
                    <Line data={lineChartData} options={lineChartOptions} />
                ) : (
                    <p>Loading temperature data...</p>
                )}
            </div>
            {/* 3. Alert Frequency Bar Chart */}
            <div
                className="bar-card"
                style={{
                    flex: '1 1 500px',
                    maxWidth: '600px',
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    minHeight: '350px' // Ensure minimum height is defined for the chart
                }}
            >
                <AlertFrequencyChart /> {/* <--- 3. RENDER THE NEW COMPONENT HERE */}
            </div>
        </div>
    );
};


export default DashboardCharts;
