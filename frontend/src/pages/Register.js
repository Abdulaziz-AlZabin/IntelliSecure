import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_name: '',
    company_size: '',
    num_employees: 0,
    industry: '',
    region: '',
    applied_policies: [],
    restrictions: [],
    security_solutions: []
  });

  const securitySolutions = ['SIEM', 'EDR', 'IDS/IPS', 'Firewall', 'Antivirus', 'DLP'];
  const industries = ['Finance', 'Healthcare', 'Technology', 'Government', 'Energy', 'Retail', 'Manufacturing', 'Education'];
  const regions = ['North America', 'Europe', 'Asia', 'Middle East', 'Latin America', 'Africa', 'Oceania'];
  const policies = ['GDPR', 'HIPAA', 'PCI-DSS', 'SOC2', 'ISO 27001', 'NIST'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await register(formData);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>
      
      <div className="auth-content">
        <div className="auth-card register-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Shield className="w-10 h-10" />
            </div>
            <h1>Create Your Profile</h1>
            <p>Build your custom threat intelligence dashboard</p>
          </div>
          
          <div className="register-steps">
            <div className={`step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>1</div>
            <div className="step-line"></div>
            <div className={`step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>2</div>
          </div>
          
          <form onSubmit={handleSubmit} className="auth-form">
            {step === 1 && (
              <div className="form-step">
                <div className="form-group">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    data-testid="register-email-input"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    data-testid="register-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    data-testid="register-company-input"
                    type="text"
                    placeholder="Acme Corporation"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <Label htmlFor="company_size">Company Size</Label>
                    <Select value={formData.company_size} onValueChange={(value) => setFormData({ ...formData, company_size: value })}>
                      <SelectTrigger data-testid="register-company-size-select">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Small">Small</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Large">Large</SelectItem>
                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="num_employees">Employees</Label>
                    <Input
                      id="num_employees"
                      data-testid="register-employees-input"
                      type="number"
                      placeholder="100"
                      value={formData.num_employees || ''}
                      onChange={(e) => setFormData({ ...formData, num_employees: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  data-testid="register-next-btn"
                  type="button" 
                  className="w-full auth-submit-btn"
                  onClick={() => setStep(2)}
                >
                  Next Step
                </Button>
              </div>
            )}
            
            {step === 2 && (
              <div className="form-step">
                <div className="form-group">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                    <SelectTrigger data-testid="register-industry-select">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="form-group">
                  <Label htmlFor="region">Region</Label>
                  <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                    <SelectTrigger data-testid="register-region-select">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map(reg => (
                        <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="form-group">
                  <Label>Security Solutions</Label>
                  <div className="checkbox-grid">
                    {securitySolutions.map(sol => (
                      <div key={sol} className="checkbox-item">
                        <Checkbox 
                          id={`sol-${sol}`}
                          data-testid={`register-solution-${sol.toLowerCase()}`}
                          checked={formData.security_solutions.includes(sol)}
                          onCheckedChange={() => setFormData({ 
                            ...formData, 
                            security_solutions: toggleArrayItem(formData.security_solutions, sol)
                          })}
                        />
                        <Label htmlFor={`sol-${sol}`} className="checkbox-label">{sol}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <Label>Applied Policies</Label>
                  <div className="checkbox-grid">
                    {policies.map(pol => (
                      <div key={pol} className="checkbox-item">
                        <Checkbox 
                          id={`pol-${pol}`}
                          data-testid={`register-policy-${pol.toLowerCase()}`}
                          checked={formData.applied_policies.includes(pol)}
                          onCheckedChange={() => setFormData({ 
                            ...formData, 
                            applied_policies: toggleArrayItem(formData.applied_policies, pol)
                          })}
                        />
                        <Label htmlFor={`pol-${pol}`} className="checkbox-label">{pol}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="form-buttons">
                  <Button 
                    data-testid="register-back-btn"
                    type="button" 
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button 
                    data-testid="register-submit-btn"
                    type="submit" 
                    className="auth-submit-btn" 
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Complete Registration'}
                  </Button>
                </div>
              </div>
            )}
          </form>
          
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" data-testid="login-link">Sign in here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;