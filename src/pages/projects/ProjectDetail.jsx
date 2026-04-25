import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, Building2, Calendar, Layers, ClipboardList, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import BOQManager from '../../components/boq/BOQManager';
import DailyLogForm from '../../components/dailylog/DailyLogForm';
import InvoiceGenerator from '../../components/invoices/InvoiceGenerator';
import InspectionManager from '../../components/inspections/InspectionManager';
import LogsDashboard from '../../components/diary/LogsDashboard';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [boqItems, setBoqItems] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchProject();
    fetchBOQItems();
  }, [id]);

  const fetchProject = async () => {
    const token = getToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401) { 
        setAuthError(true);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setProject(data);
    } catch (err) { 
      console.error('Failed to load project:', err);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchBOQItems = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/boq/?project_id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      const flatten = (items) => {
        let result = [];
        for (const item of items) {
          if (item.level === 3 || item.level === 4 || item.level === 5) {
            result.push(item);
          }
          if (item.children) result.push(...flatten(item.children));
        }
        return result;
      };
      setBoqItems(flatten(data));
    } catch (err) {
      console.error('Failed to fetch BOQ:', err);
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
          <p className="mt-3 text-white/70">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center">
          <Building2 className="h-12 w-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/70">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => navigate('/projects')} 
          variant="outline" 
          className="backdrop-blur-md bg-white/20 border-white/20 text-white hover:bg-white/30 hover:scale-105 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="h-5 w-5 text-orange-400" />
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">{project.name}</h1>
            <Badge className={`border ${getStatusColor(project.status)} backdrop-blur-sm`}>
              {project.status?.replace('_', ' ') || 'draft'}
            </Badge>
          </div>
          {project.description && <p className="text-white/70 text-sm drop-shadow">{project.description}</p>}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/70 drop-shadow">Budget</span>
            <DollarSign className="h-4 w-4 text-orange-300 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 drop-shadow-lg">
            R{project.budget ? Number(project.budget).toLocaleString() : '0'}
          </div>
        </div>

        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/70 drop-shadow">Progress</span>
            <TrendingUp className="h-4 w-4 text-orange-300 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 drop-shadow-lg">{project.progress || 0}%</div>
          <div className="h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${project.progress || 0}%` }} />
          </div>
        </div>

        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/70 drop-shadow">Location</span>
            <Building2 className="h-4 w-4 text-orange-300 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="text-lg font-medium text-white mt-2 drop-shadow">{project.location || 'N/A'}</div>
        </div>

        <div className="group backdrop-blur-md bg-white/20 rounded-xl p-4 border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-2xl">
          <div className="flex justify-between items-start">
            <span className="text-sm text-white/70 drop-shadow">Timeline</span>
            <Calendar className="h-4 w-4 text-orange-300 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div className="text-sm font-medium text-white mt-2 drop-shadow">{formatDate(project.start_date)}</div>
          <p className="text-xs text-white/50">to {formatDate(project.end_date)}</p>
        </div>
      </div>

      {/* Tabs - Glass Design */}
      <Tabs defaultValue="boq" className="space-y-4">
        <TabsList className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-1 flex flex-wrap gap-1">
          <TabsTrigger value="boq" className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-lg transition-all duration-300">
            <Layers className="h-4 w-4" />
            <span>BOQ</span>
          </TabsTrigger>
          <TabsTrigger value="daily-logs" className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-lg transition-all duration-300">
            <ClipboardList className="h-4 w-4" />
            <span>Daily Logs</span>
          </TabsTrigger>
          <TabsTrigger value="inspections" className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-lg transition-all duration-300">
            <FileText className="h-4 w-4" />
            <span>Inspections</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1 data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 rounded-lg transition-all duration-300">
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boq" className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
          <BOQManager projectId={id} />
        </TabsContent>
        
        <TabsContent value="daily-logs" className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
          {showLogForm ? (
            <div>
              <Button 
                onClick={() => setShowLogForm(false)} 
                variant="outline" 
                className="mb-4 backdrop-blur-md bg-white/20 border-white/20 text-white hover:bg-white/30"
              >
                ← Back to Logs
              </Button>
              <DailyLogForm projectId={id} onSuccess={() => setShowLogForm(false)} />
            </div>
          ) : (
            <LogsDashboard projectId={id} onNewEntry={() => setShowLogForm(true)} />
          )}
        </TabsContent>
        
        <TabsContent value="inspections" className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-400" />
            Quality Inspections
          </h3>
          <p className="text-white/60 text-sm mb-4">Inspection points for BOQ items</p>
          <div className="space-y-6">
            {boqItems.length === 0 ? (
              <p className="text-white/50 text-center py-8">No BOQ items found. Create BOQ items first.</p>
            ) : (
              boqItems.map(item => (
                <div key={item.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
                  <h4 className="font-semibold text-white mb-3">{item.item_code} - {item.description}</h4>
                  <InspectionManager projectId={id} boqItemId={item.id} />
                </div>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="invoices" className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
          <InvoiceGenerator projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjectDetail;