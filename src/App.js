import React from 'react';
import RealtimeDataStreamer from './components/RealtimeDataStreamer';
import DashboardCharts from './components/DashboardCharts';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Smart Vehicle Safety Dashboard</h1>
      </header>
      <main>
        <RealtimeDataStreamer />
        <DashboardCharts deviceId="car_001" />
      </main>
    </div>
  );
}

export default App;
