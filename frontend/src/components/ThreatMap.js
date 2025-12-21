import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const ThreatMap = ({ geoData }) => {
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!geoData || !geoData.locations || geoData.locations.length === 0) {
    return (
      <div className="empty-state">
        <AlertTriangle className="w-16 h-16 opacity-20" />
        <p>No geographic threat data available</p>
      </div>
    );
  }

  const getSeverityColor = (location) => {
    if (location.critical > 0) return '#ff6b6b';
    if (location.high > 0) return '#f5576c';
    if (location.medium > 0) return '#4facfe';
    return '#a0aec0';
  };

  const getMarkerSize = (total) => {
    if (total > 10) return 14;
    if (total > 5) return 10;
    return 6;
  };

  const handleMarkerEnter = (location, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({ x: rect.left, y: rect.top });
    setTooltipContent(location);
  };

  const handleMarkerLeave = () => {
    setTooltipContent(null);
  };

  return (
    <div className="threat-map-container" data-testid="threat-map">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 140,
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <ZoomableGroup center={[0, 20]} zoom={1}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1a1a2e"
                  stroke="#2a2a3e"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#252538', outline: 'none' },
                    pressed: { fill: '#2a2a3e', outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
          
          {geoData.locations.map((location, index) => {
            if (!location.coordinates || location.coordinates.lat === 0 && location.coordinates.lon === 0) {
              return null;
            }
            
            return (
              <Marker
                key={index}
                coordinates={[location.coordinates.lon, location.coordinates.lat]}
                onMouseEnter={(e) => handleMarkerEnter(location, e)}
                onMouseLeave={handleMarkerLeave}
              >
                <circle
                  r={getMarkerSize(location.total)}
                  fill={getSeverityColor(location)}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{
                    cursor: 'pointer',
                    filter: 'drop-shadow(0 0 8px rgba(102, 126, 234, 0.6))',
                  }}
                  data-testid={`marker-${location.region}`}
                />
                <circle
                  r={getMarkerSize(location.total) + 8}
                  fill={getSeverityColor(location)}
                  opacity={0.2}
                  className="pulse-ring"
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {tooltipContent && (
        <div 
          className="map-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x + 20,
            top: tooltipPosition.y - 80,
            pointerEvents: 'none',
          }}
          data-testid="map-tooltip"
        >
          <div className="map-tooltip-content">
            <h4>{tooltipContent.region}</h4>
            <p className="tooltip-location">{tooltipContent.coordinates.name}</p>
            <div className="tooltip-stats">
              <div className="tooltip-stat">
                <span className="stat-label">Total Threats:</span>
                <span className="stat-value">{tooltipContent.total}</span>
              </div>
              {tooltipContent.critical > 0 && (
                <div className="tooltip-stat critical">
                  <span className="stat-label">Critical:</span>
                  <span className="stat-value">{tooltipContent.critical}</span>
                </div>
              )}
              {tooltipContent.high > 0 && (
                <div className="tooltip-stat high">
                  <span className="stat-label">High:</span>
                  <span className="stat-value">{tooltipContent.high}</span>
                </div>
              )}
              {tooltipContent.medium > 0 && (
                <div className="tooltip-stat medium">
                  <span className="stat-label">Medium:</span>
                  <span className="stat-value">{tooltipContent.medium}</span>
                </div>
              )}
            </div>
            {tooltipContent.attacks.slice(0, 3).map((attack, idx) => (
              <div key={idx} className="tooltip-attack">
                <span className={`severity-dot ${attack.severity?.toLowerCase()}`}></span>
                <span className="attack-name">{attack.name}</span>
              </div>
            ))}
            {tooltipContent.attacks.length > 3 && (
              <p className="tooltip-more">+{tooltipContent.attacks.length - 3} more threats</p>
            )}
          </div>
        </div>
      )}

      <div className="map-legend">
        <h4>Threat Severity</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff6b6b' }}></div>
            <span>Critical</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f5576c' }}></div>
            <span>High</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#4facfe' }}></div>
            <span>Medium</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#a0aec0' }}></div>
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatMap;
