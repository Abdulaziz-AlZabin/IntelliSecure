import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Brain, AlertTriangle, Eye, Target, TrendingUp, Globe, Zap, Award, CheckCircle, ArrowRight, Users, Building2, Server, Database } from 'lucide-react';

const Welcome = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      if (window.scrollY > 300 && !statsVisible) {
        setStatsVisible(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [statsVisible]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { value: '99.9%', label: 'Threat Detection Accuracy', icon: Target },
    { value: '24/7', label: 'Real-Time Monitoring', icon: Eye },
    { value: '9+', label: 'Intelligence Sources', icon: Database },
    { value: '<5min', label: 'Average Response Time', icon: Zap }
  ];

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'GPT-5 driven analysis extracts IOCs, TTPs, and threat patterns from multiple intelligence feeds automatically.',
      color: '#667eea'
    },
    {
      icon: Globe,
      title: 'Geographic Threat Mapping',
      description: 'Interactive world map visualizes threat distribution across regions with real-time severity indicators.',
      color: '#f093fb'
    },
    {
      icon: Target,
      title: 'Industry-Specific Detection',
      description: 'Customized threat detection for Finance, Healthcare, Technology, Government, and more sectors.',
      color: '#4facfe'
    },
    {
      icon: Lock,
      title: 'Automated Rule Generation',
      description: 'Instantly generate deployment-ready Yara and Sigma rules tailored to your security infrastructure.',
      color: '#f5576c'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Comprehensive dashboards with trend analysis, severity distribution, and threat actor attribution.',
      color: '#43e97b'
    },
    {
      icon: Shield,
      title: 'MITRE ATT&CK Integration',
      description: 'Automatic mapping to MITRE ATT&CK framework with mitigation recommendations for each threat.',
      color: '#fa709a'
    }
  ];

  const pricingTiers = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for small teams getting started',
      features: [
        'Up to 50 threats monitored',
        'Basic threat intelligence',
        'Email alerts',
        '3 security solutions supported',
        'Community support'
      ],
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Professional',
      price: '$299',
      period: '/month',
      description: 'For growing security teams',
      features: [
        'Unlimited threat monitoring',
        'Advanced AI analysis',
        'Real-time alerts',
        'All security solutions',
        'Priority support',
        'Custom integrations',
        'API access'
      ],
      cta: 'Start 14-Day Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations',
      features: [
        'Everything in Professional',
        'Dedicated threat analyst',
        'Custom intelligence sources',
        'White-label options',
        'SLA guarantees',
        '24/7 phone support',
        'On-premise deployment'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const trustedBy = [
    { name: 'Fortune 500', count: '50+' },
    { name: 'Healthcare Orgs', count: '200+' },
    { name: 'Financial Institutions', count: '150+' },
    { name: 'Government Agencies', count: '75+' }
  ];

  return (
    <div className="welcome-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
          <div className="grid-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Shield className="w-4 h-4" />
            <span>Next-Generation Threat Intelligence Platform</span>
          </div>
          
          <h1 className="hero-title animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Protect Your Infrastructure with
            <span className="gradient-text"> AI-Powered Intelligence</span>
          </h1>
          
          <p className="hero-subtitle animate-slide-up" style={{ animationDelay: '0.3s' }}>
            Intellisecure delivers real-time threat detection, automated security rule generation, 
            and actionable insights tailored to your industry and infrastructure.
          </p>
          
          <div className="hero-buttons animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Button 
              data-testid="get-started-btn"
              size="lg" 
              className="cta-button primary"
              onClick={() => navigate('/register')}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
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

          <div className="hero-trust animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="trust-badge">
              <CheckCircle className="w-5 h-5" />
              <span>Trusted by 500+ organizations worldwide</span>
            </div>
          </div>
        </div>
        
        <div className="scroll-indicator">
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-showcase-section">
        <div className="stats-showcase-container">
          <div className="stats-grid">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={index} 
                  className={`stat-showcase-card ${statsVisible ? 'visible' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="stat-icon-wrapper">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="stat-value-large">{stat.value}</h3>
                  <p className="stat-label-large">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section-enhanced">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Enterprise-Grade Security Intelligence</h2>
            <p className="section-subtitle">Everything you need to stay ahead of cyber threats</p>
          </div>
          
          <div className="features-grid-enhanced">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className={`feature-card-enhanced ${activeFeature === index ? 'active' : ''}`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="feature-icon-enhanced" style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)` }}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="feature-arrow">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="trusted-section">
        <div className="trusted-container">
          <h3 className="trusted-title">Trusted by Industry Leaders</h3>
          <div className="trusted-grid">
            {trustedBy.map((item, index) => (
              <div key={index} className="trusted-item">
                <div className="trusted-count">{item.count}</div>
                <div className="trusted-label">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="pricing-container">
          <div className="section-header">
            <h2 className="section-title">Choose Your Plan</h2>
            <p className="section-subtitle">Flexible pricing for teams of all sizes</p>
          </div>
          
          <div className="pricing-grid">
            {pricingTiers.map((tier, index) => (
              <div key={index} className={`pricing-card ${tier.popular ? 'popular' : ''}`}>
                {tier.popular && <div className="popular-badge">Most Popular</div>}
                <div className="pricing-header">
                  <h3>{tier.name}</h3>
                  <p className="pricing-description">{tier.description}</p>
                  <div className="pricing-price">
                    <span className="price">{tier.price}</span>
                    {tier.period && <span className="period">{tier.period}</span>}
                  </div>
                </div>
                <ul className="pricing-features">
                  {tier.features.map((feature, idx) => (
                    <li key={idx}>
                      <CheckCircle className="w-5 h-5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`pricing-cta ${tier.popular ? 'primary' : 'secondary'}`}
                  onClick={() => navigate('/register')}
                  data-testid={`pricing-cta-${tier.name.toLowerCase()}`}
                >
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sources Section */}
      <section className="sources-section">
        <div className="sources-container">
          <h2 className="section-title">Comprehensive Intelligence Sources</h2>
          <p className="sources-subtitle">Real-time data aggregation from leading cybersecurity platforms</p>
          
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
            <div className="source-item">
              <div className="source-logo">SW</div>
              <p>SecurityWeek</p>
            </div>
            <div className="source-item">
              <div className="source-logo">TP</div>
              <p>Threatpost</p>
            </div>
            <div className="source-item">
              <div className="source-logo">KS</div>
              <p>Krebs on Security</p>
            </div>
            <div className="source-item">
              <div className="source-logo">US-CERT</div>
              <p>US-CERT Alerts</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section-enhanced">
        <div className="cta-content-enhanced">
          <div className="cta-icon-wrapper">
            <Shield className="w-20 h-20" />
          </div>
          <h2>Ready to Secure Your Infrastructure?</h2>
          <p>Join thousands of security professionals using Intellisecure to stay ahead of cyber threats</p>
          <div className="cta-buttons">
            <Button 
              data-testid="cta-get-started-btn"
              size="lg" 
              className="cta-button primary large"
              onClick={() => navigate('/register')}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="cta-button secondary large"
              onClick={() => window.location.href = 'mailto:sales@intellisecure.ai'}
            >
              Contact Sales
            </Button>
          </div>
          <p className="cta-note">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-enhanced">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <Shield className="w-8 h-8" />
              <span>Intellisecure</span>
            </div>
            <p>Next-generation threat intelligence platform powered by AI</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#sources">Sources</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="#careers">Careers</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#security">Security</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 Intellisecure. All rights reserved.</p>
          <div className="footer-social">
            <a href="#">LinkedIn</a>
            <a href="#">Twitter</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;