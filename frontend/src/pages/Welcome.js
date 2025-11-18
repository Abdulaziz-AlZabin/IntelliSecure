import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Brain, AlertTriangle, Eye, Target } from 'lucide-react';

const Welcome = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="welcome-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Shield className="w-4 h-4" />
            <span>Advanced Threat Intelligence Platform</span>
          </div>
          
          <h1 className="hero-title animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Intellisecure
          </h1>
          
          <p className="hero-subtitle animate-slide-up" style={{ animationDelay: '0.3s' }}>
            AI-Powered Threat Detection & Configuration Management
          </p>
          
          <p className="hero-description animate-slide-up" style={{ animationDelay: '0.4s' }}>
            Stay ahead of cyber threats with real-time intelligence, automated Yara & Sigma rule generation,
            and industry-specific attack detection tailored to your security infrastructure.
          </p>
          
          <div className="hero-buttons animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <Button 
              data-testid="get-started-btn"
              size="lg" 
              className="cta-button primary"
              onClick={() => navigate('/register')}
            >
              Get Started
            </Button>
            <Button 
              data-testid="login-btn"
              size="lg" 
              variant="outline" 
              className="cta-button secondary"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>
        
        <div className="scroll-indicator">
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">Powered by Advanced Intelligence</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Brain className="w-8 h-8" />
              </div>
              <h3>AI-Driven Analysis</h3>
              <p>Leverages GPT-5 to analyze threat intelligence from multiple sources, extracting IOCs and TTPs automatically.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Target className="w-8 h-8" />
              </div>
              <h3>Vertical Attack Detection</h3>
              <p>Identifies industry-specific threats targeting your sector, region, and security infrastructure.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Lock className="w-8 h-8" />
              </div>
              <h3>Automated Rule Generation</h3>
              <p>Generates Yara and Sigma rules tailored to your security solutions for immediate deployment.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3>Real-Time Alerts</h3>
              <p>Get notified instantly when threats matching your profile are detected in the wild.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Eye className="w-8 h-8" />
              </div>
              <h3>Comprehensive Dashboard</h3>
              <p>Visualize threats, attacker profiles, and security configurations in a unified interface.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Shield className="w-8 h-8" />
              </div>
              <h3>Multiple Data Sources</h3>
              <p>Aggregates intelligence from CISA, security blogs, and threat feeds for comprehensive coverage.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sources Section */}
      <section className="sources-section">
        <div className="sources-container">
          <h2 className="section-title">Trusted Intelligence Sources</h2>
          <p className="sources-subtitle">We aggregate threat intelligence from leading cybersecurity organizations and platforms</p>
          
          <div className="sources-grid">
            <div className="source-item">
              <div className="source-logo">CISA</div>
              <p>Cybersecurity & Infrastructure Security Agency</p>
            </div>
            <div className="source-item">
              <div className="source-logo">THN</div>
              <p>The Hacker News</p>
            </div>
            <div className="source-item">
              <div className="source-logo">BC</div>
              <p>BleepingComputer</p>
            </div>
            <div className="source-item">
              <div className="source-logo">DR</div>
              <p>Dark Reading</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Secure Your Infrastructure?</h2>
          <p>Join Intellisecure today and stay ahead of emerging threats</p>
          <Button 
            data-testid="cta-get-started-btn"
            size="lg" 
            className="cta-button primary"
            onClick={() => navigate('/register')}
          >
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2025 Intellisecure. Advanced Threat Intelligence Platform.</p>
      </footer>
    </div>
  );
};

export default Welcome;