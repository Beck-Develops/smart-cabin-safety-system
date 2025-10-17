// src/components/DashboardCharts.js
import React, { useEffect, useState, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { ref, onValue } from 'firebase/database';
import database from '../firebaseConfig';

// Register necessary Chart.js elements
ChartJS.register(ArcElement, Tooltip, Legend, Title);

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

    return (
        <div className="dashboard-charts">
            <h3>Fleet Operational Health</h3>
            <div style={{ height: '250px', width: '300px' }}>
                <Doughnut data={gaugeData} options={gaugeOptions} />
            </div>
            <div className="chart-placeholder">
                <p>Total Devices Monitored: {totalDevices}</p>
            </div>
        </div>
    );
};

export default DashboardCharts;
