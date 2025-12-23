import React, { useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';

const NettedGlobe = ({ threatLocations }) => {
  const globeEl = useRef();

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.8;
      globeEl.current.controls().enableZoom = false;
      
      setTimeout(() => {
        const scene = globeEl.current.scene();
        scene.traverse((obj) => {
          if (obj.type === 'Mesh' && obj.geometry && obj.geometry.type === 'SphereGeometry') {
            obj.material.wireframe = true;
            obj.material.color.setHex(0x667eea);
            obj.material.transparent = true;
            obj.material.opacity = 0.25;
            obj.material.emissive.setHex(0x667eea);
            obj.material.emissiveIntensity = 0.2;
          }
        });
      }, 100);
    }
  }, []);

  const getPointLabel = (d) => {
    return '<div style="color: white; background: rgba(10, 10, 15, 0.95); padding: 12px 16px; border-radius: 8px; font-family: Manrope, sans-serif; border: 1px solid rgba(102, 126, 234, 0.5); box-shadow: 0 4px 20px rgba(0,0,0,0.5);"><strong style="color: #667eea;">' + d.name + '</strong></div>';
  };

  return (
    <Globe
      ref={globeEl}
      globeImageUrl=""
      showGlobe={true}
      showAtmosphere={true}
      backgroundColor="rgba(0,0,0,0)"
      pointsData={threatLocations}
      pointAltitude={0.02}
      pointRadius={d => d.size}
      pointColor={d => d.color}
      pointLabel={getPointLabel}
      atmosphereColor="#667eea"
      atmosphereAltitude={0.3}
      showGraticules={true}
      graticulesColor="#667eea"
      graticulesOpacity={0.35}
      height={600}
      width={600}
    />
  );
};

export default NettedGlobe;
