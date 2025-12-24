import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Activity, Zap, Target, Lock, Eye, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InteractiveThreatDemo = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [threatsDetected, setThreatsDetected] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeThreats, setActiveThreats] = useState([]);
  const [hoveredThreat, setHoveredThreat] = useState(null);

  const threatTypes = [
    { type: 'Ransomware', icon: Lock, severity: 'Critical', color: '#ff6b6b' },
    { type: 'Phishing', icon: Target, severity: 'High', color: '#f5576c' },
    { type: 'DDoS', icon: Activity, severity: 'High', color: '#f5576c' },
    { type: 'Malware', icon: AlertTriangle, severity: 'Medium', color: '#4facfe' },
    { type: 'SQL Injection', icon: Eye, severity: 'Critical', color: '#ff6b6b' },
    { type: 'Zero-Day', icon: Zap, severity: 'Critical', color: '#ff6b6b' },
    { type: 'Brute Force', icon: TrendingUp, severity: 'Medium', color: '#4facfe' },
    { type: 'XSS Attack', icon: Target, severity: 'High', color: '#f5576c' }
  ];

  useEffect(() => {
    if (isScanning && scanProgress < 100) {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            setIsScanning(false);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isScanning, scanProgress]);

  useEffect(() => {
    if (isScanning && scanProgress > 0 && scanProgress < 100) {
      if (Math.random() > 0.7) {
        const randomThreat = threatTypes[Math.floor(Math.random() * threatTypes.length)];
        const newThreat = {
          id: Date.now() + Math.random(),
          ...randomThreat,
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10
        };
        setActiveThreats(prev => [...prev.slice(-6), newThreat]);
        setThreatsDetected(prev => prev + 1);
      }
    }
  }, [scanProgress, isScanning]);

  const startScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setThreatsDetected(0);
    setActiveThreats([]);
  };

  const resetScan = () => {
    setIsScanning(false);
    setScanProgress(0);
    setThreatsDetected(0);
    setActiveThreats([]);
  };

  return (
    <div className="threat-demo-container" data-testid="interactive-threat-demo">
      <div className="demo-header">
        <div className="demo-icon-wrapper">
          <Shield className="w-12 h-12" />
        </div>
        <h3>Live Threat Detection Simulator</h3>
        <p>Experience real-time threat monitoring in action</p>
      </div>

      <div className="scanning-area">
        {/* Threat Detection Grid */}
        <div className="detection-grid">
          {activeThreats.map((threat) => {
            const Icon = threat.icon;
            return (
              <div
                key={threat.id}
                className="threat-marker"
                style={{
                  left: `${threat.x}%`,
                  top: `${threat.y}%`,
                  borderColor: threat.color
                }}
                onMouseEnter={() => setHoveredThreat(threat)}
                onMouseLeave={() => setHoveredThreat(null)}
                data-testid={`threat-marker-${threat.type}`}
              >
                <Icon className="w-4 h-4" style={{ color: threat.color }} />
                <div className="threat-pulse" style={{ borderColor: threat.color }}></div>
              </div>
            );
          })}

          {/* Scanning Wave Effect */}
          {isScanning && (
            <div 
              className="scan-wave" 
              style={{ top: `${scanProgress}%` }}
            ></div>
          )}

          {/* Grid Lines */}
          <div className="grid-lines">
            {[...Array(8)].map((_, i) => (
              <div key={`h-${i}`} className="grid-line horizontal" style={{ top: `${i * 12.5}%` }}></div>
            ))}
            {[...Array(8)].map((_, i) => (
              <div key={`v-${i}`} className="grid-line vertical" style={{ left: `${i * 12.5}%` }}></div>
            ))}
          </div>

          {/* Tooltip */}
          {hoveredThreat && (
            <div className="threat-tooltip">
              <div className="tooltip-header">
                <strong>{hoveredThreat.type}</strong>
                <span className={`severity-badge-small ${hoveredThreat.severity.toLowerCase()}`}>
                  {hoveredThreat.severity}
                </span>
              </div>
              <p>Detected in real-time scan</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="scan-progress-bar">
          <div className="progress-fill" style={{ width: `${scanProgress}%` }}></div>
          <span className="progress-text">{scanProgress}% Complete</span>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="demo-stats">
        <div className="stat-item">
          <div className="stat-icon">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{threatsDetected}</div>
            <div className="stat-label">Threats Detected</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">
            <Activity className="w-5 h-5" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{isScanning ? 'Active' : 'Idle'}</div>
            <div className="stat-label">Scan Status</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">
            <Shield className="w-5 h-5" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{activeThreats.length}</div>
            <div className="stat-label">Active Alerts</div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="demo-controls">
        <Button
          onClick={startScan}
          disabled={isScanning}
          className="demo-btn primary"
          data-testid="start-scan-btn"
        >
          {isScanning ? 'Scanning...' : 'Start Threat Scan'}
        </Button>
        <Button
          onClick={resetScan}
          variant="outline"
          className="demo-btn secondary"
          data-testid="reset-scan-btn"
        >
          Reset
        </Button>
      </div>

      {/* Real Features Notice */}
      <div className="demo-notice">
        <Shield className="w-4 h-4" />
        <span>This is a simulation. Real platform analyzes 9+ intelligence sources with AI.</span>
      </div>
    </div>
  );
};

export default InteractiveThreatDemo;
