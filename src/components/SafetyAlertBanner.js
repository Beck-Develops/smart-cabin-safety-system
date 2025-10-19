// src/components/SafetyAlertBanner.js

import React from 'react';

const SafetyAlertBanner = ({ isCritical, temp, motion, override }) => {
    // Determine the main message based on the critical safety trigger
    const statusText = isCritical 
       ? "!! CRITICAL SAFETY ALERT: ACTIVATE AC NOW!!"
        : "System Nominal: Monitoring Active.";
        
    // Determine the style (red for critical, green/blue for nominal)
    const bannerStyle = {
        padding: '15px',
        margin: '20px 0',
        borderRadius: '8px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        backgroundColor: isCritical? '#f44336' : '#4CAF50', // Red vs. Green
        color: 'white',
        boxShadow: isCritical? '0 0 15px rgba(244, 67, 54, 0.7)' : 'none',
        animation: isCritical? 'blink 1s infinite' : 'none',
    };

    return (
        <div style={bannerStyle}>
            {statusText}
            {isCritical && (
                <p style={{ marginTop: '5px', fontSize: '0.9rem' }}>
                    Conditions: {temp} °C (Threshold Exceeded) | Motion: {motion? 'DETECTED' : 'NONE'}
                </p>
            )}
            <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                Remote Override Status: {override? 'ENABLED' : 'AUTO'}
            </p>
        </div>
    );
};

export default SafetyAlertBanner;

// NOTE: You would typically define a keyframe animation for 'blink' in your App.css.