import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Shield, AlertTriangle, Activity, TrendingUp, LogOut, FileCode, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [attacks, setAttacks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [rules, setRules] = useState({ yara_rules: [], sigma_rules: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [statsRes, attacksRes, insightsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/dashboard/attacks`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/insights`)
      ]);

      setStats(statsRes.data);
      setAttacks(attacksRes.data);
      setInsights(insightsRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAttackRules = async (attackId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API}/dashboard/rules/${attackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRules(response.data);
    } catch (error) {
      toast.error('Failed to load rules');
    }
  };

  const handleAttackClick = (attack) => {
    setSelectedAttack(attack);
    loadAttackRules(attack.attack_id);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Shield className="w-16 h-16 animate-pulse" />
        <p>Loading your security dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container" data-testid="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-brand">
            <Shield className="w-8 h-8" />
            <h1>Intellisecure</h1>
          </div>
          
          <div className="dashboard-user">
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
              {profile && <span className="user-company">{profile.company_name}</span>}
            </div>
            <Button 
              data-testid="logout-btn"
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Stats Overview */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card total" data-testid="stat-total-threats">
              <div className="stat-icon">
                <Activity className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Total Threats</p>
                <h3 className="stat-value">{stats?.total_threats || 0}</h3>
              </div>
            </div>
            
            <div className="stat-card critical" data-testid="stat-critical-threats">
              <div className="stat-icon">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Critical</p>
                <h3 className="stat-value">{stats?.critical_threats || 0}</h3>
              </div>
            </div>
            
            <div className="stat-card high" data-testid="stat-high-threats">
              <div className="stat-icon">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <p className="stat-label">High Priority</p>
                <h3 className="stat-value">{stats?.high_threats || 0}</h3>
              </div>
            </div>
            
            <div className="stat-card medium" data-testid="stat-medium-threats">
              <div className="stat-icon">
                <Shield className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Medium Priority</p>
                <h3 className="stat-value">{stats?.medium_threats || 0}</h3>
              </div>
            </div>
          </div>
          
          {profile && (
            <div className="profile-summary" data-testid="profile-summary">
              <p><strong>Industry:</strong> {profile.industry}</p>
              <p><strong>Region:</strong> {profile.region}</p>
              <p><strong>Security Solutions:</strong> {profile.security_solutions?.join(', ')}</p>
            </div>
          )}
        </section>

        {/* Main Content Tabs */}
        <Tabs defaultValue="threats" className="dashboard-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="threats" data-testid="threats-tab">Active Threats</TabsTrigger>
            <TabsTrigger value="insights" data-testid="insights-tab">Latest Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="threats" className="tab-content">
            <div className="threats-container">
              {attacks.length === 0 ? (
                <div className="empty-state" data-testid="no-threats-message">
                  <Shield className="w-16 h-16 opacity-20" />
                  <p>No threats detected matching your profile</p>
                  <span className="text-sm">Our AI is continuously monitoring threat feeds</span>
                </div>
              ) : (
                <div className="threats-list">
                  {attacks.map((attack) => (
                    <div 
                      key={attack.id} 
                      className={`threat-card severity-${attack.severity?.toLowerCase()}`}
                      data-testid={`threat-card-${attack.attack_id}`}
                      onClick={() => handleAttackClick(attack)}
                    >
                      <div className="threat-header">
                        <h3>{attack.name}</h3>
                        <span className={`severity-badge ${attack.severity?.toLowerCase()}`}>
                          {attack.severity}
                        </span>
                      </div>
                      <p className="threat-description">{attack.description}</p>
                      <div className="threat-footer">
                        <span className="threat-date">
                          {new Date(attack.discovered_at).toLocaleDateString()}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          data-testid={`view-rules-btn-${attack.attack_id}`}
                        >
                          View Rules
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="insights" className="tab-content">
            <div className="insights-container">
              {insights.length === 0 ? (
                <div className="empty-state">
                  <Activity className="w-16 h-16 opacity-20" />
                  <p>No insights available yet</p>
                </div>
              ) : (
                <div className="insights-list">
                  {insights.map((insight) => (
                    <div key={insight.id} className="insight-card" data-testid={`insight-card-${insight.id}`}>
                      <h3>{insight.title}</h3>
                      <p>{insight.summary}</p>
                      <div className="insight-footer">
                        <span className="insight-source">{insight.source}</span>
                        <a 
                          href={insight.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="insight-link"
                          data-testid={`insight-link-${insight.id}`}
                        >
                          Read more <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rules Dialog */}
      <Dialog open={!!selectedAttack} onOpenChange={() => setSelectedAttack(null)}>
        <DialogContent className="rules-dialog" data-testid="rules-dialog">
          <DialogHeader>
            <DialogTitle>{selectedAttack?.name}</DialogTitle>
            <DialogDescription>{selectedAttack?.description}</DialogDescription>
          </DialogHeader>
          
          <div className="rules-content">
            <Tabs defaultValue="yara" className="rules-tabs">
              <TabsList>
                <TabsTrigger value="yara" data-testid="yara-tab">Yara Rules</TabsTrigger>
                <TabsTrigger value="sigma" data-testid="sigma-tab">Sigma Rules</TabsTrigger>
              </TabsList>
              
              <TabsContent value="yara" data-testid="yara-rules-content">
                {rules.yara_rules.length === 0 ? (
                  <p className="text-center text-muted-foreground">No Yara rules available</p>
                ) : (
                  rules.yara_rules.map((rule) => (
                    <div key={rule.id} className="rule-block">
                      <div className="rule-header">
                        <FileCode className="w-4 h-4" />
                        <span>{rule.rule_name}</span>
                      </div>
                      <pre className="rule-code" data-testid="yara-rule-code">{rule.rule_content}</pre>
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="sigma" data-testid="sigma-rules-content">
                {rules.sigma_rules.length === 0 ? (
                  <p className="text-center text-muted-foreground">No Sigma rules available</p>
                ) : (
                  rules.sigma_rules.map((rule) => (
                    <div key={rule.id} className="rule-block">
                      <div className="rule-header">
                        <FileCode className="w-4 h-4" />
                        <span>{rule.rule_name}</span>
                      </div>
                      <pre className="rule-code" data-testid="sigma-rule-code">{rule.rule_content}</pre>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;