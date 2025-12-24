import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, Database, FileCode, Plus, Trash2, LogOut, Building2, Mail, Calendar, Lock, Target } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [resources, setResources] = useState([]);
  const [attacks, setAttacks] = useState([]);
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [newResource, setNewResource] = useState('');
  const [loading, setLoading] = useState(true);
  const [yaraIOCs, setYaraIOCs] = useState([{ type: 'hash', value: '' }]);
  const [sigmaTTPs, setSigmaTTPs] = useState(['']);
  const [threatHuntIOCs, setThreatHuntIOCs] = useState([]);
  const [iocStats, setIocStats] = useState({});
  const [newIOC, setNewIOC] = useState({ type: 'ip', value: '', description: '', source: '' });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadAdminData();
  }, [navigate]);

  const loadAdminData = async () => {
    const token = localStorage.getItem('admin_token');
    try {
      const [companiesRes, resourcesRes, attacksRes, iocsRes] = await Promise.all([
        axios.get(`${API}/admin/companies`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/resources`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/attacks`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/threat-hunt-iocs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCompanies(companiesRes.data);
      setResources(resourcesRes.data.sources);
      setAttacks(attacksRes.data);
      setThreatHuntIOCs(iocsRes.data.iocs);
      setIocStats(iocsRes.data.stats);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      } else {
        toast.error('Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = async () => {
    if (!newResource.trim()) return;
    const token = localStorage.getItem('admin_token');
    try {
      const response = await axios.post(
        `${API}/admin/resources`,
        { url: newResource },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResources(response.data.sources);
      setNewResource('');
      toast.success('Resource added successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add resource');
    }
  };

  const handleDeleteResource = async (url) => {
    const token = localStorage.getItem('admin_token');
    try {
      const response = await axios.delete(
        `${API}/admin/resources`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { url }
        }
      );
      setResources(response.data.sources);
      toast.success('Resource removed successfully');
    } catch (error) {
      toast.error('Failed to remove resource');
    }
  };

  const handleUpdateRules = async () => {
    if (!selectedAttack) return;
    const token = localStorage.getItem('admin_token');
    
    const validIOCs = yaraIOCs.filter(ioc => ioc.value.trim() !== '');
    const validTTPs = sigmaTTPs.filter(ttp => ttp.trim() !== '');
    
    try {
      await axios.put(
        `${API}/admin/attack/${selectedAttack.id}/rules`,
        {
          yara_iocs: validIOCs,
          sigma_ttps: validTTPs
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Rules updated successfully');
      setSelectedAttack(null);
      setYaraIOCs([{ type: 'hash', value: '' }]);
      setSigmaTTPs(['']);
    } catch (error) {
      toast.error('Failed to update rules');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleAddThreatHuntIOC = async () => {
    if (!newIOC.value.trim()) {
      toast.error('IOC value is required');
      return;
    }

    const token = localStorage.getItem('admin_token');
    try {
      await axios.post(`${API}/admin/threat-hunt-iocs`, newIOC, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('IOC added successfully');
      setNewIOC({ type: 'ip', value: '', description: '', source: '' });
      loadAdminData();
    } catch (error) {
      toast.error('Failed to add IOC');
    }
  };

  const handleDeleteThreatHuntIOC = async (iocId) => {
    const token = localStorage.getItem('admin_token');
    try {
      await axios.delete(`${API}/admin/threat-hunt-iocs/${iocId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('IOC deleted successfully');
      loadAdminData();
    } catch (error) {
      toast.error('Failed to delete IOC');
    }
  };

  const addIOC = () => {
    setYaraIOCs([...yaraIOCs, { type: 'hash', value: '' }]);
  };

  const updateIOC = (index, field, value) => {
    const newIOCs = [...yaraIOCs];
    newIOCs[index][field] = value;
    setYaraIOCs(newIOCs);
  };

  const removeIOC = (index) => {
    setYaraIOCs(yaraIOCs.filter((_, i) => i !== index));
  };

  const addTTP = () => {
    setSigmaTTPs([...sigmaTTPs, '']);
  };

  const updateTTP = (index, value) => {
    const newTTPs = [...sigmaTTPs];
    newTTPs[index] = value;
    setSigmaTTPs(newTTPs);
  };

  const removeTTP = (index) => {
    setSigmaTTPs(sigmaTTPs.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Shield className="w-16 h-16 animate-pulse" />
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" data-testid="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-brand">
            <Lock className="w-8 h-8" />
            <h1>Admin Panel</h1>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="admin-logout-btn">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="admin-content">
        <Tabs defaultValue="companies" className="admin-tabs">
          <TabsList>
            <TabsTrigger value="companies" data-testid="companies-tab">
              <Users className="w-4 h-4 mr-2" />
              Companies ({companies.length})
            </TabsTrigger>
            <TabsTrigger value="threat-hunt-iocs" data-testid="threat-hunt-iocs-tab">
              <Target className="w-4 h-4 mr-2" />
              Threat Hunt IOCs ({iocStats.total || 0})
            </TabsTrigger>
            <TabsTrigger value="resources" data-testid="resources-tab">
              <Database className="w-4 h-4 mr-2" />
              Resources ({resources.length})
            </TabsTrigger>
            <TabsTrigger value="rules" data-testid="rules-tab">
              <FileCode className="w-4 h-4 mr-2" />
              Rules Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <div className="companies-grid">
              {companies.map((company) => (
                <Card key={company.id} className="company-card" data-testid={`company-card-${company.id}`}>
                  <div className="company-header">
                    <Building2 className="w-6 h-6" />
                    <h3>{company.company_name}</h3>
                  </div>
                  <div className="company-details">
                    <div className="detail-item">
                      <Mail className="w-4 h-4" />
                      <span>{company.user_email}</span>
                    </div>
                    <div className="detail-item">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(company.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Industry:</span>
                      <span className="detail-value">{company.industry}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Region:</span>
                      <span className="detail-value">{company.region}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Employees:</span>
                      <span className="detail-value">{company.num_employees}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Size:</span>
                      <span className="detail-value">{company.company_size}</span>
                    </div>
                    <div className="detail-column">
                      <span className="detail-label">Security Solutions:</span>
                      <div className="badges">
                        {company.security_solutions?.map((sol, idx) => (
                          <span key={idx} className="badge">{sol}</span>
                        ))}
                      </div>
                    </div>
                    <div className="detail-column">
                      <span className="detail-label">Policies:</span>
                      <div className="badges">
                        {company.applied_policies?.map((pol, idx) => (
                          <span key={idx} className="badge">{pol}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="threat-hunt-iocs">
            <div className="threat-hunt-iocs-section">
              <div className="ioc-stats-header">
                <h2 className="text-2xl font-bold mb-4">Threat Hunt IOCs</h2>
                <p className="text-muted-foreground mb-6">
                  Manage IOCs that will be used to generate threat hunting queries for users
                </p>
                <div className="ioc-stats-grid-admin">
                  <div className="ioc-stat-card">
                    <span className="stat-label">Total IOCs</span>
                    <span className="stat-value">{iocStats.total || 0}</span>
                  </div>
                  <div className="ioc-stat-card">
                    <span className="stat-label">IPs</span>
                    <span className="stat-value">{iocStats.ips || 0}</span>
                  </div>
                  <div className="ioc-stat-card">
                    <span className="stat-label">Domains</span>
                    <span className="stat-value">{iocStats.domains || 0}</span>
                  </div>
                  <div className="ioc-stat-card">
                    <span className="stat-label">Hashes</span>
                    <span className="stat-value">{iocStats.hashes || 0}</span>
                  </div>
                  <div className="ioc-stat-card">
                    <span className="stat-label">URLs</span>
                    <span className="stat-value">{iocStats.urls || 0}</span>
                  </div>
                  <div className="ioc-stat-card">
                    <span className="stat-label">Emails</span>
                    <span className="stat-value">{iocStats.emails || 0}</span>
                  </div>
                </div>
              </div>

              <Card className="add-ioc-card">
                <h3 className="text-lg font-semibold mb-4">Add New IOC</h3>
                <div className="add-ioc-form">
                  <Select value={newIOC.type} onValueChange={(value) => setNewIOC({...newIOC, type: value})}>
                    <SelectTrigger className="ioc-type-select">
                      <SelectValue placeholder="Select IOC type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ip">IP Address</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="hash">File Hash</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="IOC Value (e.g., 192.168.1.1, malicious.com, abc123...)"
                    value={newIOC.value}
                    onChange={(e) => setNewIOC({...newIOC, value: e.target.value})}
                    className="ioc-value-input"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newIOC.description}
                    onChange={(e) => setNewIOC({...newIOC, description: e.target.value})}
                    className="ioc-description-input"
                  />
                  <Input
                    placeholder="Source (optional)"
                    value={newIOC.source}
                    onChange={(e) => setNewIOC({...newIOC, source: e.target.value})}
                    className="ioc-source-input"
                  />
                  <Button onClick={handleAddThreatHuntIOC} className="add-ioc-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add IOC
                  </Button>
                </div>
              </Card>

              <div className="iocs-list">
                {threatHuntIOCs.length === 0 ? (
                  <div className="empty-state">
                    <Target className="w-16 h-16 opacity-20" />
                    <p>No IOCs added yet</p>
                    <span className="text-sm">Add IOCs to enable threat hunting queries for users</span>
                  </div>
                ) : (
                  <div className="iocs-grid">
                    {threatHuntIOCs.map((ioc) => (
                      <Card key={ioc.id} className="ioc-card">
                        <div className="ioc-card-header">
                          <span className={`ioc-type-badge ${ioc.type}`}>{ioc.type.toUpperCase()}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteThreatHuntIOC(ioc.id)}
                            className="delete-ioc-btn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="ioc-value">{ioc.value}</div>
                        {ioc.description && (
                          <div className="ioc-description">{ioc.description}</div>
                        )}
                        {ioc.source && (
                          <div className="ioc-source">Source: {ioc.source}</div>
                        )}
                        <div className="ioc-meta">
                          Added: {new Date(ioc.created_at).toLocaleString()}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources">
            <div className="resources-section">
              <div className="resources-add">
                <Input
                  placeholder="Enter resource URL (RSS feed)"
                  value={newResource}
                  onChange={(e) => setNewResource(e.target.value)}
                  data-testid="resource-input"
                />
                <Button onClick={handleAddResource} data-testid="add-resource-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Resource
                </Button>
              </div>
              <div className="resources-list">
                {resources.map((url, index) => (
                  <div key={index} className="resource-item" data-testid={`resource-${index}`}>
                    <span className="resource-url">{url}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteResource(url)}
                      data-testid={`delete-resource-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules">
            <div className="rules-section">
              <div className="attacks-list">
                {attacks.map((attack) => (
                  <div
                    key={attack.id}
                    className="attack-item"
                    onClick={() => {
                      setSelectedAttack(attack);
                      setYaraIOCs(attack.iocs?.map(ioc => ({ type: 'string', value: ioc })) || [{ type: 'hash', value: '' }]);
                      setSigmaTTPs(attack.ttps || ['']);
                    }}
                    data-testid={`attack-item-${attack.id}`}
                  >
                    <h4>{attack.name}</h4>
                    <span className={`severity-badge ${attack.severity?.toLowerCase()}`}>
                      {attack.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rules Edit Dialog */}
      <Dialog open={!!selectedAttack} onOpenChange={() => setSelectedAttack(null)}>
        <DialogContent className="rules-edit-dialog" data-testid="rules-edit-dialog">
          <DialogHeader>
            <DialogTitle>Edit Rules for {selectedAttack?.name}</DialogTitle>
          </DialogHeader>
          <div className="rules-edit-content">
            <div className="rules-section-block">
              <h4>Yara Rule IOCs</h4>
              <p className="section-description">Add indicators of compromise for Yara rule generation</p>
              {yaraIOCs.map((ioc, index) => (
                <div key={index} className="ioc-row">
                  <select
                    value={ioc.type}
                    onChange={(e) => updateIOC(index, 'type', e.target.value)}
                    className="ioc-type-select"
                  >
                    <option value="hash">Hash</option>
                    <option value="ip">IP Address</option>
                    <option value="domain">Domain</option>
                    <option value="string">String</option>
                    <option value="filename">Filename</option>
                  </select>
                  <Input
                    placeholder={`Enter ${ioc.type}...`}
                    value={ioc.value}
                    onChange={(e) => updateIOC(index, 'value', e.target.value)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeIOC(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addIOC}>
                <Plus className="w-4 h-4 mr-2" />
                Add IOC
              </Button>
            </div>

            <div className="rules-section-block">
              <h4>Sigma Rule TTPs</h4>
              <p className="section-description">Add tactics, techniques, and procedures for Sigma rule</p>
              {sigmaTTPs.map((ttp, index) => (
                <div key={index} className="ttp-row">
                  <Input
                    placeholder="Enter TTP or command line pattern..."
                    value={ttp}
                    onChange={(e) => updateTTP(index, e.target.value)}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeTTP(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTTP}>
                <Plus className="w-4 h-4 mr-2" />
                Add TTP
              </Button>
            </div>

            <Button onClick={handleUpdateRules} className="update-rules-btn" data-testid="update-rules-btn">
              Update Rules
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;