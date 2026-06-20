import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  Clock,
  CheckCircle,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Calendar,
  Sparkles,
  FileText,
  Shield,
  ArrowLeft
} from 'lucide-react';
import DailyLogShortcut from '../components/DailyLogShortcut';
import ComplianceGatekeeper from '../components/compliance/ComplianceGatekeeper';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalBudget: 0,
    totalActual: 0,
    overallProgress: 0,
    pendingInvoicesTotal: 0
  });
  const [showCompliance, setShowCompliance] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('access_token');

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'R0';
    const num = Number(amount);
    if (num >= 1000000) {
      const millions = (num / 1000000).toFixed(1);
      return `R${millions}M`.replace('.0M', 'M');
    }
    return `R${num.toLocaleString('en-ZA').replace(/,/g, ' ')}`;
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthError(true);
    }
  }, []);

  const fetchAllData = async () => {
    const token = getToken();
    if (!token) {
      console.error('No access token found');
      setLoading(false);
      setAuthError(true);
      return;
    }

    try {
      const [projectsRes, logsRes, invoicesRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/projects/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://127.0.0.1:8000/api/daily-logs/', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://127.0.0.1:8000/api/invoices/', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (projectsRes.status === 401 || logsRes.status === 401 || invoicesRes.status === 401) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      const projectsData = await projectsRes.json();
      const logsData = await logsRes.json();
      const invoicesData = await invoicesRes.json();

      setProjects(projectsData);

      const pending = Array.isArray(logsData) ? logsData.filter(log => log.status === 'submitted') : [];
      const approved = Array.isArray(logsData) ? logsData.filter(log => log.status === 'approved') : [];

      setPendingSubmissions(pending);
      setApprovedSubmissions(approved);

      const pendingInvoices = Array.isArray(invoicesData)
        ? invoicesData.filter(inv => inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue')
        : [];
      setInvoices(pendingInvoices);

      const totalBudget = projectsData.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
      const totalActual = projectsData.reduce((sum, p) => sum + (Number(p.actual_cost) || 0), 0);
      const activeProjects = projectsData.filter(p => p.status === 'active').length;
      const overallProgress = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

      const pendingInvoicesTotal = pendingInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

      setStats({
        totalProjects: projectsData.length,
        activeProjects,
        totalBudget,
        totalActual,
        overallProgress,
        pendingInvoicesTotal
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleProjectSelect = (projectId, projectName) => {
    console.log('🖱️ Dashboard - Project clicked:', projectName, '(ID:', projectId, ')');
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
    setShowCompliance(true);
    setPendingNavigation(`/projects/${projectId}`);
  };

  const handleAccessGranted = () => {
    console.log('✅ Dashboard - Access granted for project:', selectedProjectId);
    setShowCompliance(false);
    setAccessGranted(true);
    if (pendingNavigation) {
      setTimeout(() => {
        navigate(pendingNavigation);
      }, 100);
    }
  };

  const handleCancelCompliance = () => {
    console.log('❌ Dashboard - Compliance check cancelled');
    setShowCompliance(false);
    setSelectedProjectId(null);
    setSelectedProjectName('');
    setPendingNavigation(null);
  };

  const pendingCount = pendingSubmissions.length;
  const approvedCount = approvedSubmissions.length;

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
          <p className="mt-3 text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (showCompliance && selectedProjectId) {
    return (
      <div className="relative min-h-[500px]">
        <button
          onClick={handleCancelCompliance}
          className="mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <ComplianceGatekeeper
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          onAccessGranted={handleAccessGranted}
          onCancel={handleCancelCompliance}
          returnPath="dashboard"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-orange-400" />
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">Dashboard</h1>
        </div>
        <p className="text-white/70 drop-shadow text-sm">Post-Award Project Control</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Projects Card */}
        <div
          onClick={() => navigate('/projects')}
          className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Total Projects</span>
            <Building2 className="h-5 w-5 text-orange-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 drop-shadow-lg">
            {stats.totalProjects}
          </div>
          <div className="text-xs text-white/60 mt-1 drop-shadow">
            {stats.activeProjects} active
          </div>
        </div>

        {/* Overall Progress Card */}
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Overall Progress</span>
            <TrendingUp className="h-5 w-5 text-orange-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 drop-shadow-lg">
            {stats.overallProgress?.toFixed(1) || 0}%
          </div>
          <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-400 to-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.overallProgress || 0}%` }}
            />
          </div>
        </div>

        {/* Total Budget Card */}
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Total Budget</span>
            <DollarSign className="h-5 w-5 text-orange-300 transition-transform duration-300 group-hover:scale-110 group-hover:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 drop-shadow-lg">
            {formatCurrency(stats.totalBudget)}
          </div>
          <div className="text-xs text-white/60 mt-1 drop-shadow">
            Actual: {formatCurrency(stats.totalActual)}
          </div>
        </div>

        {/* Pending Approvals Card */}
        <div
          onClick={() => navigate('/submissions')}
          className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Pending Approvals</span>
            <AlertCircle
              className={`h-5 w-5 transition-all duration-300 ${
                pendingCount > 0
                  ? 'text-yellow-300 group-hover:text-yellow-400'
                  : 'text-white/50'
              } group-hover:scale-110`}
            />
          </div>
          <div
            className={`text-2xl font-bold mt-2 drop-shadow-lg ${
              pendingCount > 0 ? 'text-yellow-200' : 'text-white'
            }`}
          >
            {pendingCount}
          </div>
          <div className="text-xs text-white/60 mt-1 drop-shadow">Awaiting review</div>
        </div>

        {/* Pending Invoices Card */}
        <div
          onClick={() => navigate('/invoices')}
          className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/80 drop-shadow">Pending Invoices</span>
            <FileText
              className={`h-5 w-5 transition-all duration-300 ${
                stats.pendingInvoicesTotal > 0
                  ? 'text-blue-300 group-hover:text-blue-400'
                  : 'text-white/50'
              } group-hover:scale-110`}
            />
          </div>
          <div
            className={`text-2xl font-bold mt-2 drop-shadow-lg ${
              stats.pendingInvoicesTotal > 0 ? 'text-blue-200' : 'text-white'
            }`}
          >
            {formatCurrency(stats.pendingInvoicesTotal)}
          </div>
          <div className="text-xs text-white/60 mt-1 drop-shadow">Awaiting approval</div>
        </div>
      </div>

      {/* Two Cards Side by Side */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Projects Card */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/25 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-300" />
              <h3 className="font-semibold text-white drop-shadow">Recent Projects</h3>
            </div>
            <p className="text-xs text-white/60 drop-shadow">Your latest post-award projects</p>
          </div>
          <div className="p-4 space-y-3">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-white/50">No projects yet</div>
            ) : (
              projects.slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02] cursor-pointer relative"
                  onClick={() => handleProjectSelect(project.id, project.name)}
                >
                  {/* Compliance Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/30 backdrop-blur-sm rounded-full text-[8px] text-white/80 border border-orange-400/30">
                      <Shield className="h-2 w-2" />
                      <span>Compliance</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-start pr-16">
                    <p className="font-medium text-white drop-shadow">{project.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                        project.status
                      )} transition-all duration-200`}
                    >
                      {project.status || 'draft'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.start_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {project.progress || 0}%
                    </span>
                  </div>
                  <DailyLogShortcut projectId={project.id} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Daily Log Shortcut Info */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/25 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-300" />
              <h3 className="font-semibold text-white drop-shadow">Daily Logs Summary</h3>
            </div>
            <p className="text-xs text-white/60 drop-shadow">Quick access to site logs</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-400/20 transition-all duration-300 hover:scale-105 hover:bg-yellow-500/30">
                <div className="text-2xl font-bold text-yellow-200">{pendingCount}</div>
                <div className="text-xs text-white/70">Pending Review</div>
              </div>
              <div className="text-center p-3 bg-green-500/20 backdrop-blur-sm rounded-lg border border-green-400/20 transition-all duration-300 hover:scale-105 hover:bg-green-500/30">
                <div className="text-2xl font-bold text-green-200">{approvedCount}</div>
                <div className="text-xs text-white/70">Approved</div>
              </div>
            </div>
            <button
              onClick={() => navigate('/submissions')}
              className="mt-4 w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              View All Submissions →
            </button>
          </div>
        </div>
      </div>

      {/* Two Submission Widgets */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Submissions Widget */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/25 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-300" />
                <h3 className="font-semibold text-white drop-shadow">Pending Submissions</h3>
              </div>
              <span className="text-xs bg-yellow-500/30 backdrop-blur-sm text-yellow-100 px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            </div>
            <p className="text-xs text-white/60 drop-shadow mt-1">Awaiting your review</p>
          </div>
          <div className="divide-y divide-white/10">
            {pendingSubmissions.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-300/50" />
                <p>No pending submissions</p>
              </div>
            ) : (
              pendingSubmissions.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  onClick={() => navigate(`/projects/${log.project}`)}
                  className="p-3 hover:bg-white/10 cursor-pointer transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-white truncate drop-shadow">
                      {log.project_name || 'Project'}
                    </p>
                    <span className="text-xs bg-yellow-500/30 text-yellow-100 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-white/70 mt-1 line-clamp-1">
                    {log.work_description?.substring(0, 60)}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                    <span>by {log.contractor_name || 'Unknown'}</span>
                    <span>{formatDate(log.log_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {pendingSubmissions.length > 0 && (
            <div className="p-3 border-t border-white/10 bg-white/5">
              <button
                onClick={() => navigate('/submissions')}
                className="w-full text-center text-sm text-orange-300 hover:text-orange-200 font-medium transition-colors"
              >
                Review all pending →
              </button>
            </div>
          )}
        </div>

        {/* Approved Submissions Widget */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-white/25 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-300" />
                <h3 className="font-semibold text-white drop-shadow">Approved Submissions</h3>
              </div>
              <span className="text-xs bg-green-500/30 backdrop-blur-sm text-green-100 px-2 py-0.5 rounded-full">
                {approvedCount} approved
              </span>
            </div>
            <p className="text-xs text-white/60 drop-shadow mt-1">Completed and verified</p>
          </div>
          <div className="divide-y divide-white/10">
            {approvedSubmissions.length === 0 ? (
              <div className="p-8 text-center text-white/50">
                <Clock className="h-8 w-8 mx-auto mb-2 text-white/30" />
                <p>No approved submissions yet</p>
              </div>
            ) : (
              approvedSubmissions.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  onClick={() => navigate(`/projects/${log.project}`)}
                  className="p-3 hover:bg-white/10 cursor-pointer transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-white truncate drop-shadow">
                      {log.project_name || 'Project'}
                    </p>
                    <span className="text-xs bg-green-500/30 text-green-100 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                      Approved
                    </span>
                  </div>
                  <p className="text-sm text-white/70 mt-1 line-clamp-1">
                    {log.work_description?.substring(0, 60)}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                    <span>by {log.contractor_name || 'Unknown'}</span>
                    <span>{formatDate(log.log_date)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-3 flex items-center gap-3 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="bg-orange-500/30 backdrop-blur-sm p-2 rounded-lg transition-all duration-300 group-hover:bg-orange-500/40">
            <ClipboardList className="h-5 w-5 text-orange-200" />
          </div>
          <div>
            <div className="text-sm text-white/70 drop-shadow">Total Submissions</div>
            <div className="font-semibold text-white drop-shadow-lg">
              {pendingCount + approvedCount}
            </div>
          </div>
        </div>

        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-3 flex items-center gap-3 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="bg-green-500/30 backdrop-blur-sm p-2 rounded-lg transition-all duration-300 group-hover:bg-green-500/40">
            <CheckCircle className="h-5 w-5 text-green-200" />
          </div>
          <div>
            <div className="text-sm text-white/70 drop-shadow">Approved</div>
            <div className="font-semibold text-green-200 drop-shadow-lg">
              {approvedCount}
            </div>
          </div>
        </div>

        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-3 flex items-center gap-3 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="bg-yellow-500/30 backdrop-blur-sm p-2 rounded-lg transition-all duration-300 group-hover:bg-yellow-500/40">
            <Clock className="h-5 w-5 text-yellow-200" />
          </div>
          <div>
            <div className="text-sm text-white/70 drop-shadow">Pending Review</div>
            <div className="font-semibold text-yellow-200 drop-shadow-lg">
              {pendingCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;