import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, Activity, TrendingUp, LogOut, FileCode, ExternalLink, Download, BarChart3, Clock, Search, Filter, User, Settings, Globe, FileText } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ThreatMap from '@/components/ThreatMap';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#ff6b6b', '#f5576c', '#4facfe', '#a0aec0'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [attacks, setAttacks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [rules, setRules] = useState({ yara_rules: [], sigma_rules: [], mitigations: [], mitre_tactics: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [severityFilter]);

  const loadDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const results = await Promise.allSettled([
        axios.get(`${API}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/dashboard/attacks?severity=${severityFilter}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/insights`),
        axios.get(`${API}/dashboard/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/dashboard/timeline`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/dashboard/geo-map`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      // Handle stats
      if (results[0].status === 'fulfilled') {
        setStats(results[0].value.data);
      }
      
      // Handle attacks - critical data
      if (results[1].status === 'fulfilled') {
        setAttacks(results[1].value.data);
        console.log('Attacks loaded:', results[1].value.data.length, 'threats');
      }
      
      // Handle insights
      if (results[2].status === 'fulfilled') {
        setInsights(results[2].value.data);
        console.log('Insights loaded:', results[2].value.data.length, 'items');
      }
      
      // Handle analytics
      if (results[3].status === 'fulfilled') {
        setAnalytics(results[3].value.data);
      }
      
      // Handle timeline
      if (results[4].status === 'fulfilled') {
        setTimeline(results[4].value.data);
      }
      
      // Handle geo-map
      if (results[5].status === 'fulfilled') {
        setGeoData(results[5].value.data);
      } else {
        console.warn('Geo-map data not available');
      }
      
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

  const handleExportRules = async (attackId, ruleType) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        `${API}/dashboard/export-rules/${attackId}?rule_type=${ruleType}`,
        {},
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${ruleType}_rules_${attackId}.${ruleType === 'yara' ? 'yar' : 'yml'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${ruleType.toUpperCase()} rules exported successfully`);
    } catch (error) {
      toast.error('Failed to export rules');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDownloadWeeklyReport = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API}/dashboard/weekly-report`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `intellisecure_weekly_report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Weekly report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const filteredAttacks = attacks.filter(attack => 
    searchTerm ? (
      attack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attack.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) : true
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Shield className="w-16 h-16 animate-pulse" />
        <p>Loading your security dashboard...</p>
      </div>
    );
  }

  const severityData = analytics?.severity_distribution ? [
    { name: 'Critical', value: analytics.severity_distribution.Critical, color: '#ff6b6b' },
    { name: 'High', value: analytics.severity_distribution.High, color: '#f5576c' },
    { name: 'Medium', value: analytics.severity_distribution.Medium, color: '#4facfe' },
    { name: 'Low', value: analytics.severity_distribution.Low, color: '#a0aec0' }
  ] : [];

  return (
    <div className="dashboard-container" data-testid="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-brand">
            <Shield className="w-8 h-8" />
            <h1>Intellisecure</h1>
          </div>
          
          <div className="dashboard-user">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDownloadWeeklyReport}
              data-testid="download-report-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              Weekly Report
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowProfile(true)}
              data-testid="profile-btn"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
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
                <span className="stat-trend">Last 7 days</span>
              </div>
            </div>
            
            <div className="stat-card critical" data-testid="stat-critical-threats">
              <div className="stat-icon">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Critical</p>
                <h3 className="stat-value">{stats?.critical_threats || 0}</h3>
                <span className="stat-trend">Requires immediate action</span>
              </div>
            </div>
            
            <div className="stat-card high" data-testid="stat-high-threats">
              <div className="stat-icon">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <p className="stat-label">High Priority</p>
                <h3 className="stat-value">{stats?.high_threats || 0}</h3>
                <span className="stat-trend">Action needed</span>
              </div>
            </div>
            
            <div className="stat-card medium" data-testid="stat-medium-threats">
              <div className="stat-icon">
                <Shield className="w-6 h-6" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Medium Priority</p>
                <h3 className="stat-value">{stats?.medium_threats || 0}</h3>
                <span className="stat-trend">Monitor closely</span>
              </div>
            </div>
          </div>
          
          {/* Trend Chart */}
          {stats?.trends && (
            <div className="trend-chart-card">
              <h3 className="chart-title">Threat Trend (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis dataKey="date" stroke="#a0aec0" />
                  <YAxis stroke="#a0aec0" />
                  <Tooltip 
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #667eea', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="threats" stroke="#667eea" strokeWidth={2} dot={{ fill: '#667eea' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Main Content Tabs */}
        <Tabs defaultValue="threats" className="dashboard-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="threats" data-testid="threats-tab">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Active Threats
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="timeline-tab">
              <Clock className="w-4 h-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="insights" data-testid="insights-tab">
              <Activity className="w-4 h-4 mr-2" />
              Latest Insights
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="threats" className="tab-content">
            <div className="threats-controls">
              <div className="search-box">
                <Search className="w-4 h-4" />
                <Input
                  placeholder="Search threats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="search-input"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="filter-select" data-testid="severity-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="threats-container">
              {filteredAttacks.length === 0 ? (
                <div className="empty-state" data-testid="no-threats-message">
                  <Shield className="w-16 h-16 opacity-20" />
                  <p>No threats detected matching your criteria</p>
                  <span className="text-sm">Our AI is continuously monitoring threat feeds</span>
                </div>
              ) : (
                <div className="threats-list">
                  {filteredAttacks.map((attack) => (
                    <div 
                      key={attack.id} 
                      className={`threat-card severity-${attack.severity?.toLowerCase()}`}
                      data-testid={`threat-card-${attack.attack_id}`}
                      onClick={() => handleAttackClick(attack)}
                    >
                      <div className="threat-header">
                        <div>
                          <h3>{attack.name}</h3>
                          {attack.threat_actor && (
                            <span className="threat-actor">Threat Actor: {attack.threat_actor}</span>
                          )}
                        </div>
                        <span className={`severity-badge ${attack.severity?.toLowerCase()}`}>
                          {attack.severity}
                        </span>
                      </div>
                      <p className="threat-description">{attack.description}</p>
                      <div className="threat-footer">
                        <span className="threat-date">
                          {new Date(attack.discovered_at).toLocaleString()}
                        </span>
                        <div className="threat-actions">
                          <a 
                            href={attack.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`article-link-${attack.attack_id}`}
                          >
                            <Button 
                              size="sm" 
                              variant="outline"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Article
                            </Button>
                          </a>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            data-testid={`view-rules-btn-${attack.attack_id}`}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="map" className="tab-content map-tab-content">
            <div className="map-section">
              <div className="map-header">
                <h3>Global Threat Distribution</h3>
                <p>Interactive map showing geographic locations of detected threats</p>
              </div>
              <ThreatMap geoData={geoData} />
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="tab-content">
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3 className="chart-title">Threat Severity Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="analytics-card">
                <h3 className="chart-title">Top Threat Actors</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.top_threat_actors || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                    <XAxis dataKey="name" stroke="#a0aec0" />
                    <YAxis stroke="#a0aec0" />
                    <Tooltip 
                      contentStyle={{ background: '#1a1a2e', border: '1px solid #667eea', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" fill="#667eea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="timeline" className="tab-content">
            <div className="timeline-container">
              {timeline.length === 0 ? (
                <div className="empty-state">
                  <Clock className="w-16 h-16 opacity-20" />
                  <p>No timeline data available</p>
                </div>
              ) : (
                <div className="timeline-list">
                  {timeline.map((event) => (
                    <div key={event.id} className="timeline-item" data-testid={`timeline-item-${event.id}`}>
                      <div className={`timeline-marker severity-${event.severity?.toLowerCase()}`}></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <h4>{event.name}</h4>
                          <span className={`severity-badge ${event.severity?.toLowerCase()}`}>
                            {event.severity}
                          </span>
                        </div>
                        <p className="timeline-date">{new Date(event.timestamp).toLocaleString()}</p>
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
                  {insights.map((insight) => {
                    const cleanSummary = insight.summary?.replace(/<[^>]*>/g, '').substring(0, 200) || 'No description available';
                    const cleanSource = insight.source?.split('/')[2] || insight.source;
                    
                    return (
                      <div key={insight.id} className="insight-card" data-testid={`insight-card-${insight.id}`}>
                        <h3>{insight.title}</h3>
                        <p>{cleanSummary}...</p>
                        <div className="insight-footer">
                          <span className="insight-source">{cleanSource}</span>
                          <a 
                            href={insight.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="insight-link-btn"
                            data-testid={`read-article-btn-${insight.id}`}
                          >
                            <Button size="sm" variant="outline">
                              Read Article
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rules Dialog */}
      <Dialog open={!!selectedAttack} onOpenChange={() => setSelectedAttack(null)}>
        <DialogContent className="rules-dialog max-w-4xl" data-testid="rules-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedAttack?.name}</span>
              {selectedAttack?.threat_actor && (
                <span className="text-sm text-muted-foreground">Actor: {selectedAttack.threat_actor}</span>
              )}
            </DialogTitle>
            <DialogDescription>{selectedAttack?.description}</DialogDescription>
          </DialogHeader>
          
          <div className="rules-content">
            {rules.mitre_tactics?.length > 0 && (
              <div className="mitre-section">
                <h4 className="section-title">MITRE ATT&CK Tactics</h4>
                <div className="mitre-tags">
                  {rules.mitre_tactics.map((tactic, idx) => (
                    <span key={idx} className="mitre-tag">{tactic}</span>
                  ))}
                </div>
              </div>
            )}
            
            <Tabs defaultValue="yara" className="rules-tabs">
              <TabsList>
                <TabsTrigger value="yara" data-testid="yara-tab">Yara Rules</TabsTrigger>
                <TabsTrigger value="sigma" data-testid="sigma-tab">Sigma Rules</TabsTrigger>
                <TabsTrigger value="mitigations">Mitigations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="yara" data-testid="yara-rules-content">
                <div className="rules-actions">
                  <Button 
                    size="sm" 
                    onClick={() => handleExportRules(selectedAttack.attack_id, 'yara')}
                    data-testid="export-yara-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Yara Rules
                  </Button>
                </div>
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
                <div className="rules-actions">
                  <Button 
                    size="sm" 
                    onClick={() => handleExportRules(selectedAttack.attack_id, 'sigma')}
                    data-testid="export-sigma-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Sigma Rules
                  </Button>
                </div>
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
              
              <TabsContent value="mitigations">
                {rules.mitigations?.length === 0 ? (
                  <p className="text-center text-muted-foreground">No mitigation recommendations available</p>
                ) : (
                  <div className="mitigations-list">
                    {rules.mitigations?.map((mitigation, idx) => (
                      <div key={idx} className="mitigation-card">
                        <h4>{mitigation.title}</h4>
                        <p>{mitigation.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="profile-dialog" data-testid="profile-dialog">
          <DialogHeader>
            <DialogTitle>Company Profile</DialogTitle>
          </DialogHeader>
          {profile && (
            <div className="profile-details">
              <div className="profile-item">
                <span className="profile-label">Company:</span>
                <span className="profile-value">{profile.company_name}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Industry:</span>
                <span className="profile-value">{profile.industry}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Region:</span>
                <span className="profile-value">{profile.region}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Employees:</span>
                <span className="profile-value">{profile.num_employees}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Security Solutions:</span>
                <span className="profile-value">{profile.security_solutions?.join(', ')}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Policies:</span>
                <span className="profile-value">{profile.applied_policies?.join(', ')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;