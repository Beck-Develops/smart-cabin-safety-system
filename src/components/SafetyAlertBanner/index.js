import React from 'react';
import './SafetyAlertBanner.css';

const SafetyAlertBanner = ({ safety_trigger }) => {
  if (safety_trigger === undefined || safety_trigger === null) return null;

  const isCritical = safety_trigger === 1 || safety_trigger === true;

  return (
    <div className={`alert-banner ${isCritical ? 'critical-danger' : 'status-ok'}`}>
      {isCritical 
        ? '⚠️ CRITICAL SAFETY ALERT: AC ACTIVATION REQUIRED ⚠️'
        : '✅ Status OK: Cabin Conditions Nominal'}
    </div>
  );
};

export default SafetyAlertBanner;
