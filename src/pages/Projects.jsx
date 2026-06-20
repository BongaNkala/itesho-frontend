// src/pages/Projects.jsx

const API_URL = 'http://127.0.0.1:8000';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  Lock,
  Loader2
} from 'lucide-react';
import DailyLogShortcut from '../components/DailyLogShortcut';
import ComplianceGatekeeper from '../components/compliance/ComplianceGatekeeper';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [userRole, setUserRole] = useState('contractor');
  const [accessGranted, setAccessGranted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('access_token');

  // Get user role from token
  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('📋 Token payload:', payload);
        console.log('👤 User role from token:', payload.role);
        if (payload.role) {
          setUserRole(payload.role);
        } else {
          console.log('⚠️ No role in token, using default: contractor');
          setUserRole('contractor');
        }
      } catch (e) {
        console.error('Failed to parse token:', e);
        setUserRole('contractor');
      }
    } else {
      console.log('No token found');
    }
  }, []);

  // Check token on mount
  useEffect(() => {
    const token = getToken();
    console.log('🔑 Projects - Token exists:', !!token);
    if (!token) {
      setAuthError(true);
    }
  }, []);

  const fetchProjects = async () => {
    const token = getToken();
    
    if (!token) {
      console.error('No access token found');
      setLoading(false);
      setAuthError(true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        console.error('Authentication failed - token invalid or expired');
        setAuthError(true);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('📦 Projects loaded:', data.length);
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, []);

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProjects();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchProjects();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-emerald-500/30 text-emerald-100 border-emerald-400/30';
      case 'planning': return 'bg-yellow-500/30 text-yellow-100 border-yellow-400/30';
      case 'completed': return 'bg-blue-500/30 text-blue-100 border-blue-400/30';
      case 'on_hold': return 'bg-red-500/30 text-red-100 border-red-400/30';
      default: return 'bg-gray-500/30 text-gray-100 border-gray-400/30';
    }
  };

  // Handle project selection - ALWAYS show compliance gatekeeper
  const handleProjectSelect = (project) => {
    console.log('🖱️ Project clicked:', project.name, '(ID:', project.id, ')');
    console.log('👤 Current user role:', userRole);
    console.log('🔒 ALWAYS showing compliance gatekeeper first');
    
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);
    setShowCompliance(true);
  };

  // Handle access granted - navigate to project
  const handleAccessGranted = () => {
    console.log('✅ Access granted for project:', selectedProjectId);
    setShowCompliance(false);
    setAccessGranted(true);
    setTimeout(() => {
      navigate(`/projects/${selectedProjectId}`);
    }, 100);
  };

  // Handle cancel compliance check
  const handleCancelCompliance = () => {
    console.log('❌ Compliance check cancelled');
    setShowCompliance(false);
    setSelectedProjectId(null);
    setSelectedProjectName('');
  };

  // Manual test function for Compliance Gatekeeper
  const testComplianceGatekeeper = () => {
    console.log('🧪 Manual test: Opening Compliance Gatekeeper');
    const testProject = projects.find(p => p.id === 2) || projects[0];
    if (testProject) {
      setSelectedProjectId(testProject.id);
      setSelectedProjectName(testProject.name);
      setShowCompliance(true);
    } else {
      console.log('No project found for testing');
    }
  };

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-white text-lg font-semibold mb-2">Authentication Error</h3>
          <p className="text-white/60 text-sm mb-4">
            Your session has expired or you are not logged in.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-3 text-white/70">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Show Compliance Gatekeeper when a project is selected
  if (showCompliance && selectedProjectId) {
    console.log('🛡️ Rendering Compliance Gatekeeper for project:', selectedProjectId);
    return (
      <div className="relative min-h-[500px]">
        <button
          onClick={handleCancelCompliance}
          className="mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300"
        >
          ← Back to Projects
        </button>
        <ComplianceGatekeeper
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          onAccessGranted={handleAccessGranted}
          onCancel={handleCancelCompliance}
          returnPath="projects"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button and Test Button */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-orange-400" />
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">Projects</h1>
          </div>
          <p className="text-white/70 drop-shadow text-sm">
            Select a project to access (compliance verification required)
          </p>
        </div>
        <div className="flex gap-2">
          {/* Test Button - For manual testing */}
          <button
            onClick={testComplianceGatekeeper}
            className="p-2 rounded-lg bg-orange-500/20 text-white/70 hover:text-white hover:bg-orange-500/30 transition-all duration-300 text-xs"
            title="Test Compliance Gatekeeper"
          >
            🧪 Test
          </button>
          <button 
            onClick={fetchProjects}
            className="p-2 rounded-lg bg-white/10 backdrop-blur-sm text-white/70 hover:text-white hover:bg-white/20 transition-all duration-300"
            title="Refresh projects"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {projects.length === 0 ? (
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl p-12 text-center">
          <Building2 className="h-16 w-16 mx-auto text-white/30 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No projects yet
          </h3>
          <p className="text-white/50 mb-4">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        /* Projects Grid - Glass Cards */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const progress = project.progress || 0;
            const budget = project.budget || 0;
            const actualCost = project.actual_cost || 0;
            const costVariance = actualCost - budget;
            
            return (
              <div 
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className="group backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:bg-white/30 hover:shadow-2xl overflow-hidden relative"
              >
                {/* Animated Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                
                {/* Compliance Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/30 backdrop-blur-sm rounded-full text-[9px] text-white/80 border border-orange-400/30">
                    <Shield className="h-2.5 w-2.5" />
                    <span>Compliance</span>
                  </div>
                </div>
                
                <div className="p-5">
                  {/* Header with Status */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white drop-shadow">{project.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(project.status)} backdrop-blur-sm`}>
                      {project.status || 'draft'}
                    </span>
                  </div>
                  
                  {/* Description */}
                  {project.description && (
                    <p className="text-white/70 text-sm mb-3 line-clamp-2">{project.description}</p>
                  )}
                  
                  {/* Location */}
                  {project.location && (
                    <div className="flex items-center gap-1 text-white/60 text-sm mb-2">
                      <MapPin className="h-3 w-3" />
                      {project.location}
                    </div>
                  )}
                  
                  {/* Date Range */}
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                    <Calendar className="h-3 w-3" />
                    {formatDate(project.start_date)} → {formatDate(project.end_date)}
                  </div>
                  
                  {/* Budget vs Actual */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 text-white/60 text-sm">
                      <DollarSign className="h-3 w-3" />
                      R{budget.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-white/60 text-sm">
                      <TrendingUp className="h-3 w-3" />
                      R{actualCost.toLocaleString()} spent
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>Progress</span>
                      <span className="font-medium text-white/80">{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Cost Variance Indicator */}
                  {costVariance !== 0 && (
                    <div className={`mt-2 text-xs ${costVariance < 0 ? 'text-emerald-300' : 'text-red-300'} flex items-center gap-1`}>
                      {costVariance < 0 ? '↓' : '↑'} R{Math.abs(costVariance).toLocaleString()} 
                      {costVariance < 0 ? ' under budget' : ' over budget'}
                    </div>
                  )}

                  {/* Daily Log Shortcut Widget */}
                  <div className="mt-3">
                    <DailyLogShortcut projectId={project.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Projects;