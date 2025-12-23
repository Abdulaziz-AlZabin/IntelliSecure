import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Brain, Target, Lock, TrendingUp, Globe as GlobeIcon, Zap, Eye, Database, FileCode, Bell, Activity, BarChart3, Map, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import NettedGlobe from '@/components/NettedGlobe';

const Welcome = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Threat locations for globe
  const threatLocations = [
    { lat: 40.7128, lng: -74.0060, size: 0.8, color: '#ff6b6b', name: 'North America' },
    { lat: 51.5074, lng: -0.1278, size: 0.6, color: '#f5576c', name: 'Europe' },
    { lat: 35.6762, lng: 139.6503, size: 0.9, color: '#ff6b6b', name: 'Asia' },
    { lat: 25.2048, lng: 55.2708, size: 0.5, color: '#4facfe', name: 'Middle East' },
    { lat: -23.5505, lng: -46.6333, size: 0.4, color: '#4facfe', name: 'Latin America' },
    { lat: -1.2864, lng: 36.8172, size: 0.3, color: '#a0aec0', name: 'Africa' },
    { lat: -33.8688, lng: 151.2093, size: 0.5, color: '#f5576c', name: 'Oceania' }
  ];

  const coreFeatures = [
    {
      icon: Brain,
      title: 'AI-Powered Threat Analysis',
      description: 'GPT-5 automatically analyzes threat intelligence feeds, extracting IOCs, TTPs, and attack patterns in real-time.',
      features: ['Automated IOC extraction', 'TTP identification', 'Pattern recognition'],
      color: '#667eea',
      demo: 'live-analysis'
    },
    {
      icon: Target,
      title: 'Industry-Specific Detection',
      description: 'Customized threat monitoring for your specific industry, region, and security infrastructure.',
      features: ['Vertical attack detection', 'Regional targeting', 'Custom profile matching'],
      color: '#f093fb',
      demo: 'profile-matching'
    },
    {
      icon: Map,
      title: 'Geographic Threat Mapping',
      description: 'Interactive world map visualizing global threat distribution with real-time severity indicators.',
      features: ['Interactive globe view', 'Regional clustering', 'Severity heatmaps'],
      color: '#4facfe',
      demo: 'geo-map'
    },
    {
      icon: FileCode,
      title: 'Automated Rule Generation',
      description: 'Instantly generate deployment-ready Yara and Sigma rules with MITRE ATT&CK mapping.',
      features: ['Yara rule generation', 'Sigma rule creation', 'MITRE integration'],
      color: '#43e97b',
      demo: 'rule-gen'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics Dashboard',
      description: 'Comprehensive dashboards with threat trends, severity analysis, and actor attribution.',
      features: ['Real-time charts', 'Trend analysis', 'Actor tracking'],
      color: '#fa709a',
      demo: 'analytics'
    },
    {
      icon: Bell,
      title: 'Real-Time Alerting',
      description: 'Instant notifications when threats matching your profile are detected across 9+ intelligence sources.',
      features: ['Multi-source monitoring', 'Smart filtering', 'Priority alerts'],
      color: '#764ba2',
      demo: 'alerts'
    }
  ];

  const intelligenceSources = [
    { name: 'CISA', full: 'Cybersecurity & Infrastructure Security Agency', icon: Shield },
    { name: 'The Hacker News', full: 'Global Cybersecurity News', icon: Activity },
    { name: 'BleepingComputer', full: 'Technology News & Support', icon: Database },
    { name: 'Dark Reading', full: 'Cybersecurity Intelligence', icon: Eye },
    { name: 'SecurityWeek', full: 'Enterprise Security', icon: Lock },
    { name: 'Threatpost', full: 'Threat Intelligence', icon: Target },
    { name: 'Krebs on Security', full: 'In-depth Security News', icon: Brain },
    { name: 'US-CERT', full: 'United States CERT', icon: Shield },
    { name: 'Schneier on Security', full: 'Security Analysis', icon: TrendingUp }
  ];

  const capabilities = [
    { icon: Zap, label: 'Real-Time Processing', value: '<5min' },
    { icon: Database, label: 'Intelligence Sources', value: '9+' },
    { icon: Eye, label: 'Detection Accuracy', value: '99.9%' },
    { icon: Activity, label: 'Continuous Monitoring', value: '24/7' }
  ];

  return (
    <div className="welcome-container">
      {/* Hero Section with Interactive Globe */}
      <section className="hero-section-globe">
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        
        <div className="hero-split">
          <div className="hero-content-left animate-slide-up">
            <div className="hero-badge">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Threat Intelligence Platform</span>
            </div>
            
            <h1 className="hero-title-large">
              <span className="gradient-text-animated">Intellisecure</span>
            </h1>
            
            <h2 className="hero-subtitle-large">
              Protect Your Infrastructure with Real-Time Threat Intelligence
            </h2>
            
            <p className="hero-description-large">
              Advanced AI analyzes global cyber threats, generates security rules, and delivers actionable insights tailored to your industry.
            </p>
            
            <div className="hero-buttons-large">
              <Button 
                data-testid="get-started-btn"
                size="lg" 
                className="cta-button primary large"
                onClick={() => navigate('/register')}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                data-testid="login-btn"
                size="lg" 
                variant="outline" 
                className="cta-button secondary large"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </div>

            <div className="hero-capabilities">
              {capabilities.map((cap, idx) => {
                const Icon = cap.icon;
                return (
                  <div key={idx} className="capability-item">
                    <Icon className="w-5 h-5" />
                    <div>
                      <div className="capability-value">{cap.value}</div>
                      <div className="capability-label">{cap.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="hero-globe-container">
            <div className="globe-wrapper">
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
                pointLabel={d => `<div style="color: white; background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; font-family: sans-serif;">${d.name}</div>`}
                atmosphereColor="#667eea"
                atmosphereAltitude={0.25}
                hexPolygonsData={[]}
                hexPolygonResolution={3}
                hexPolygonMargin={0.3}
                hexPolygonColor={() => 'rgba(102, 126, 234, 0.1)'}
                showGraticules={true}
                graticulesColor="#667eea"
                graticulesOpacity={0.3}
                height={600}
                width={600}
                onGlobeReady={() => {
                  if (globeEl.current) {
                    // Set custom material for wireframe effect
                    const globe = globeEl.current.scene().children.find(obj => obj.type === 'Mesh');
                    if (globe) {
                      globe.material.wireframe = true;
                      globe.material.color.setHex(0x667eea);
                      globe.material.transparent = true;
                      globe.material.opacity = 0.15;
                    }
                  }
                }}
              />
            </div>
            <div className="globe-label">Live Threat Distribution</div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="features-showcase">
        <div className="features-showcase-container">
          <div className="section-header-centered">
            <h2 className="section-title-xl">Core Capabilities</h2>
            <p className="section-subtitle-xl">Everything you need to stay ahead of cyber threats</p>
          </div>
          
          <div className="features-grid-showcase">
            {coreFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="feature-showcase-card">
                  <div className="feature-showcase-header">
                    <div className="feature-showcase-icon" style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)` }}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3>{feature.title}</h3>
                  </div>
                  <p className="feature-showcase-description">{feature.description}</p>
                  <ul className="feature-showcase-list">
                    {feature.features.map((item, idx) => (
                      <li key={idx}>
                        <CheckCircle className="w-4 h-4" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Intelligence Sources Section */}
      <section className="sources-showcase">
        <div className="sources-showcase-container">
          <div className="section-header-centered">
            <h2 className="section-title-xl">Multi-Source Intelligence</h2>
            <p className="section-subtitle-xl">Real-time data aggregation from 9+ leading cybersecurity platforms</p>
          </div>
          
          <div className="sources-grid-enhanced">
            {intelligenceSources.map((source, index) => {
              const Icon = source.icon;
              return (
                <div key={index} className="source-showcase-card">
                  <div className="source-icon-wrapper">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="source-info">
                    <h4>{source.name}</h4>
                    <p>{source.full}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="how-it-works-container">
          <div className="section-header-centered">
            <h2 className="section-title-xl">How It Works</h2>
            <p className="section-subtitle-xl">Automated threat intelligence in 4 simple steps</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Profile Creation</h3>
              <p>Define your company profile including industry, region, and security solutions</p>
            </div>
            <div className="step-arrow">
              <ArrowRight className="w-8 h-8" />
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>AI Analysis</h3>
              <p>Our AI continuously monitors and analyzes threats from 9+ intelligence sources</p>
            </div>
            <div className="step-arrow">
              <ArrowRight className="w-8 h-8" />
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Smart Matching</h3>
              <p>Threats are matched to your profile based on industry, region, and infrastructure</p>
            </div>
            <div className="step-arrow">
              <ArrowRight className="w-8 h-8" />
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Actionable Rules</h3>
              <p>Get deployment-ready Yara and Sigma rules with mitigation strategies</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-section-final">
        <div className="cta-content-final">
          <div className="cta-icon-large">
            <Shield className="w-24 h-24" />
          </div>
          <h2>Start Protecting Your Infrastructure Today</h2>
          <p>Join security professionals using Intellisecure to detect and respond to threats faster</p>
          <Button 
            data-testid="cta-get-started-btn"
            size="lg" 
            className="cta-button primary xl"
            onClick={() => navigate('/register')}
          >
            Get Started Now
            <ArrowRight className="w-6 h-6 ml-2" />
          </Button>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="footer-minimal">
        <div className="footer-minimal-content">
          <div className="footer-brand-minimal">
            <Shield className="w-6 h-6" />
            <span>Intellisecure</span>
          </div>
          <p>&copy; 2025 Intellisecure. Advanced Threat Intelligence Platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;