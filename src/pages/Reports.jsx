import { useState, useEffect } from 'react';
import {
  Sparkles, RefreshCw, Download, Printer, Loader2,
  Building2, ClipboardList, FileText, Shield, DollarSign,
  Users, Mail, CalendarDays, Clock, ThumbsUp, ThumbsDown,
  AlertTriangle, AlertCircle, CheckCircle, X
} from 'lucide-react';

// ─── API Helper ──────────────────────────────────────────────────────────────
const API_URL = 'http://127.0.0.1:8000';

const apiFetch = async (endpoint) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/api/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
};

// ─── Helper Functions ──────────────────────────────────────────────────────
const getStatusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (['approved', 'active', 'pass', 'paid'].includes(s)) return 'bg-emerald-100 text-emerald-700';
  if (['pending', 'submitted', 'processing', 'in_progress'].includes(s)) return 'bg-yellow-100 text-yellow-700';
  if (['rejected', 'failed', 'overdue'].includes(s)) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const getBadgeClass = (status) => {
  const s = (status || '').toLowerCase();
  if (['approved', 'active', 'pass', 'paid'].includes(s)) return 'badge badge-green';
  if (['pending', 'submitted', 'processing', 'in_progress'].includes(s)) return 'badge badge-yellow';
  if (['rejected', 'failed', 'overdue'].includes(s)) return 'badge badge-red';
  return 'badge badge-gray';
};

const formatCurrency = (amount) => {
  const n = Number(amount || 0);
  if (n >= 1000000) return `R${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `R${(n / 1000).toFixed(1)}K`;
  return `R${n.toLocaleString()}`;
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Print Styles ──────────────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #print-report, #print-report * { visibility: visible !important; }
  #print-report {
    display: block !important;
    position: fixed; inset: 0; background: white; color: #111;
    font-family: 'Segoe UI', sans-serif; padding: 24px; overflow: auto;
    font-size: 11px; z-index: 9999;
  }
  .no-print { display: none !important; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin: 16px 0 6px; border-bottom: 2px solid #f97316; padding-bottom: 4px; color: #ea580c; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .stat-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
  .stat-val { font-size: 22px; font-weight: 700; color: #111; }
  .stat-lbl { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f3f4f6; color: #374151; }
  @page { margin: 16mm; }
}
`;

// ─── Main Component ────────────────────────────────────────────────────────
function Reports() {
  const [activeTab, setActiveTab] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Data state
  const [projects, setProjects] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);

  // Static data
  const [roles] = useState([
    { id: 1, name: 'Project Manager', users: 5, permissions: 'Full project management', status: 'Active' },
    { id: 2, name: 'Contractor', users: 12, permissions: 'Submit daily logs & BOQ entries', status: 'Active' },
    { id: 3, name: 'Inspector/Engineer', users: 3, permissions: 'Inspection records & reports', status: 'Active' },
    { id: 4, name: 'Consultant/QS', users: 2, permissions: 'BOQ review & costing', status: 'Inactive' },
    { id: 5, name: 'Client Representative', users: 1, permissions: 'Read-only access', status: 'Active' },
  ]);

  const [notifications] = useState([
    { id: 1, type: 'Daily Submission Reminder', recipient: 'All Contractors', status: 'Active', lastSent: '2026-06-24 08:00' },
    { id: 2, type: 'Approval Required', recipient: 'Project Managers', status: 'Active', lastSent: '2026-06-24 09:30' },
    { id: 3, type: 'Safety Alert', recipient: 'All Users', status: 'Inactive', lastSent: '2026-06-22 14:00' },
    { id: 4, type: 'Invoice Overdue', recipient: 'Finance Team', status: 'Active', lastSent: '2026-06-23 07:00' },
  ]);

  // ── Fetch Data ──────────────────────────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [projectsData, logsData] = await Promise.all([
        apiFetch('projects/'),
        apiFetch('daily-logs/'),
      ]);

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setDailyLogs(Array.isArray(logsData) ? logsData : []);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ── Derived Stats ──────────────────────────────────────────────────────
  const [year, monthNum] = selectedMonth.split('-').map(Number);

  const logsInMonth = dailyLogs.filter((l) => {
    const d = new Date(l.log_date || l.created_at);
    return d.getFullYear() === year && d.getMonth() + 1 === monthNum;
  });

  const approved = logsInMonth.filter((l) => l.status === 'approved');
  const pending = logsInMonth.filter((l) => l.status === 'submitted');
  const rejected = logsInMonth.filter((l) => l.status === 'rejected');

  const totalBudget = projects.reduce((s, p) => s + Number(p.budget || 0), 0);
  const totalActual = projects.reduce((s, p) => s + Number(p.actual_cost || 0), 0);
  const activeProjects = projects.filter((p) => p.status === 'active');

  const safetyIncidents = logsInMonth.reduce(
    (s, l) => s + Number(l.first_aid_cases || 0) + Number(l.safety_violations || 0),
    0
  );
  const nearMisses = logsInMonth.reduce((s, l) => s + Number(l.near_miss_count || 0), 0);
  const nonConformances = logsInMonth.reduce((s, l) => s + Number(l.non_conformance_count || 0), 0);
  const complianceScore = logsInMonth.length
    ? Math.round(((logsInMonth.length - nonConformances) / logsInMonth.length) * 100)
    : 100;

  const labourCost = logsInMonth.reduce((s, l) => s + Number(l.labour_cost_today || 0), 0);
  const materialCost = logsInMonth.reduce((s, l) => s + Number(l.material_cost_today || 0), 0);
  const equipmentCost = logsInMonth.reduce((s, l) => s + Number(l.equipment_cost_today || 0), 0);
  const subconCost = logsInMonth.reduce((s, l) => s + Number(l.subcontractor_cost_today || 0), 0);
  const totalCostMonth = labourCost + materialCost + equipmentCost + subconCost;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  const handleDownloadCSV = () => {
    const rows = [
      ['ITesho — Monthly Report', selectedMonth],
      [],
      ['PROJECTS'],
      ['Name', 'Status', 'Budget', 'Actual Cost', 'Progress', 'Start', 'End'],
      ...projects.map((p) => [
        p.name,
        p.status,
        p.budget,
        p.actual_cost,
        `${p.progress}%`,
        p.start_date,
        p.end_date,
      ]),
      [],
      ['DAILY LOGS'],
      ['Project', 'Log Date', 'Status', 'Labour Cost', 'Material Cost', 'Near Misses', 'Safety Violations'],
      ...dailyLogs.map((l) => [
        l.project_name || l.project,
        l.log_date,
        l.status,
        l.labour_cost_today,
        l.material_cost_today,
        l.near_miss_count,
        l.safety_violations,
      ]),
      [],
      ['SUMMARY'],
      ['Metric', 'Value'],
      ['Total Projects', projects.length],
      ['Active Projects', activeProjects.length],
      ['Total Budget', totalBudget],
      ['Total Actual Cost', totalActual],
      ['Logs This Month', logsInMonth.length],
      ['Approved', approved.length],
      ['Pending', pending.length],
      ['Rejected', rejected.length],
      ['Safety Incidents', safetyIncidents],
      ['Near Misses', nearMisses],
      ['Compliance Score', `${complianceScore}%`],
      ['Labour Cost (Month)', labourCost],
      ['Material Cost (Month)', materialCost],
      ['Equipment Cost (Month)', equipmentCost],
      ['Subcontractor Cost (Month)', subconCost],
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ITesho_Report_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Tabs ────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'monthly', label: 'Monthly Report', icon: CalendarDays },
    { id: 'dailylogs', label: 'Daily Logs', icon: ClipboardList },
    { id: 'submissions', label: 'Submissions', icon: FileText },
    { id: 'compliance', label: 'Safety & Compliance', icon: Shield },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'roles', label: 'User Roles', icon: Users },
    { id: 'notifications', label: 'Email Notifications', icon: Mail },
  ];

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{PRINT_STYLE}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-orange-400" />
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">Reports</h1>
            </div>
            <p className="text-white/70 text-sm">Live data from your projects, logs, submissions & compliance</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all text-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all text-sm"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all text-sm"
            >
              <Printer className="h-4 w-4" /> Print Report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="backdrop-blur-md bg-white/10 rounded-xl p-1 border border-white/20 no-print">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="backdrop-blur-md bg-white/20 rounded-xl border border-white/20 shadow-xl p-6 no-print">
          {/* ── MONTHLY REPORT ── */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Monthly Activities Report — {selectedMonth}</h2>

              {loading && (
                <div className="text-white/60 text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading live data…
                </div>
              )}

              {!loading && (
                <>
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Projects', val: projects.length, sub: `${activeProjects.length} active`, icon: Building2, color: 'text-blue-400' },
                      { label: 'Logs This Month', val: logsInMonth.length, sub: `${approved.length} approved`, icon: ClipboardList, color: 'text-emerald-400' },
                      { label: 'Total Budget', val: formatCurrency(totalBudget), sub: `Actual: ${formatCurrency(totalActual)}`, icon: DollarSign, color: 'text-orange-400' },
                      { label: 'Compliance', val: `${complianceScore}%`, sub: `${safetyIncidents} incidents`, icon: Shield, color: 'text-purple-400' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/10 rounded-xl p-4 border border-white/10">
                        <div className={`flex items-center gap-2 text-sm ${s.color}`}>
                          <s.icon className="h-4 w-4" />
                          {s.label}
                        </div>
                        <div className="text-2xl font-bold text-white mt-1">{s.val}</div>
                        <div className="text-xs text-white/40 mt-0.5">{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Projects Table */}
                  <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <div className="p-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-orange-400" />
                      <h3 className="text-sm font-semibold text-white">All Projects</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-white/50 text-xs border-b border-white/10">
                            <th className="text-left p-3">Project</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Budget</th>
                            <th className="text-left p-3">Actual</th>
                            <th className="text-left p-3">Progress</th>
                            <th className="text-left p-3">Start</th>
                            <th className="text-left p-3">End</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.length === 0 && (
                            <tr><td colSpan={7} className="text-center text-white/40 py-6">No projects found</td></tr>
                          )}
                          {projects.map((p) => (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-3 text-white font-medium">{p.name}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span>
                              </td>
                              <td className="p-3 text-white/70">{formatCurrency(p.budget)}</td>
                              <td className="p-3 text-white/70">{formatCurrency(p.actual_cost)}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                                  </div>
                                  <span className="text-xs text-white/60">{p.progress || 0}%</span>
                                </div>
                              </td>
                              <td className="p-3 text-white/60 text-xs">{formatDate(p.start_date)}</td>
                              <td className="p-3 text-white/60 text-xs">{formatDate(p.end_date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Submission Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Approved', count: approved.length, icon: ThumbsUp, color: 'text-emerald-400 bg-emerald-400/10' },
                      { label: 'Pending Review', count: pending.length, icon: Clock, color: 'text-yellow-400 bg-yellow-400/10' },
                      { label: 'Rejected', count: rejected.length, icon: ThumbsDown, color: 'text-red-400 bg-red-400/10' },
                    ].map((s, i) => (
                      <div key={i} className={`rounded-xl p-4 border border-white/10 ${s.color}`}>
                        <div className="flex items-center gap-2 text-sm">
                          <s.icon className="h-4 w-4" />
                          {s.label}
                        </div>
                        <div className="text-3xl font-bold text-white mt-1">{s.count}</div>
                        <div className="text-xs text-white/40">logs this month</div>
                      </div>
                    ))}
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-orange-400" />
                      Cost Breakdown — {selectedMonth}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Labour', val: labourCost },
                        { label: 'Materials', val: materialCost },
                        { label: 'Equipment', val: equipmentCost },
                        { label: 'Subcontractors', val: subconCost },
                      ].map((c, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-3">
                          <div className="text-xs text-white/50">{c.label}</div>
                          <div className="text-lg font-bold text-white mt-1">{formatCurrency(c.val)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
                      <span className="text-white/60 text-sm">Total cost this month</span>
                      <span className="text-white font-bold">{formatCurrency(totalCostMonth)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── DAILY LOGS ── */}
          {activeTab === 'dailylogs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-orange-400" />
                  Daily Logs
                </h2>
                <span className="text-white/50 text-sm">{dailyLogs.length} total logs</span>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 text-xs border-b border-white/10 bg-white/5">
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Project</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Labour</th>
                        <th className="text-left p-3">Materials</th>
                        <th className="text-left p-3">Near Misses</th>
                        <th className="text-left p-3">Non-Conf.</th>
                        <th className="text-left p-3">Workers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyLogs.length === 0 && (
                        <tr><td colSpan={8} className="text-center text-white/40 py-8">No daily logs found</td></tr>
                      )}
                      {dailyLogs.map((l) => (
                        <tr key={l.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white/70 text-xs">{formatDate(l.log_date)}</td>
                          <td className="p-3 text-white font-medium">{l.project_name || `Project #${l.project}`}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(l.status)}`}>{l.status}</span>
                          </td>
                          <td className="p-3 text-white/70">{formatCurrency(l.labour_cost_today)}</td>
                          <td className="p-3 text-white/70">{formatCurrency(l.material_cost_today)}</td>
                          <td className="p-3 text-center text-white/70">{l.near_miss_count || 0}</td>
                          <td className="p-3 text-center text-white/70">{l.non_conformance_count || 0}</td>
                          <td className="p-3 text-center text-white/70">{l.safety_talk_attendees || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SUBMISSIONS ── */}
          {activeTab === 'submissions' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-400" />
                All Submissions
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-2">
                {[
                  { label: 'Total', val: dailyLogs.length, color: 'bg-white/10' },
                  { label: 'Approved', val: dailyLogs.filter((s) => s.status === 'approved').length, color: 'bg-emerald-500/10' },
                  { label: 'Pending', val: dailyLogs.filter((s) => s.status === 'submitted').length, color: 'bg-yellow-500/10' },
                ].map((s, i) => (
                  <div key={i} className={`${s.color} rounded-xl p-4 border border-white/10`}>
                    <div className="text-xs text-white/50">{s.label}</div>
                    <div className="text-2xl font-bold text-white mt-1">{s.val}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 text-xs border-b border-white/10 bg-white/5">
                        <th className="text-left p-3">Log Date</th>
                        <th className="text-left p-3">Project</th>
                        <th className="text-left p-3">Submitted By</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Rejection Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyLogs.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-white/40 py-8">No submissions found</td></tr>
                      )}
                      {dailyLogs.map((s) => (
                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white/70 text-xs">{formatDate(s.log_date)}</td>
                          <td className="p-3 text-white font-medium">{s.project_name || `Project #${s.project}`}</td>
                          <td className="p-3 text-white/70">{s.contractor_name || `User #${s.contractor}`}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>{s.status}</span>
                          </td>
                          <td className="p-3 text-red-300 text-xs">{s.rejection_reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SAFETY & COMPLIANCE ── */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-400" />
                Safety & Compliance — {selectedMonth}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Safety Incidents', val: safetyIncidents, icon: AlertTriangle, color: 'text-red-400' },
                  { label: 'Near Misses', val: nearMisses, icon: AlertCircle, color: 'text-yellow-400' },
                  { label: 'Non-Conformances', val: nonConformances, icon: X, color: 'text-orange-400' },
                  { label: 'Compliance Score', val: `${complianceScore}%`, icon: CheckCircle, color: 'text-emerald-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-white/10 rounded-xl p-4 border border-white/10">
                    <div className={`flex items-center gap-2 text-sm ${s.color}`}>
                      <s.icon className="h-4 w-4" />
                      {s.label}
                    </div>
                    <div className="text-3xl font-bold text-white mt-2">{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-3 bg-white/5 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white">Safety Data per Daily Log — {selectedMonth}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 text-xs border-b border-white/10">
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Project</th>
                        <th className="text-center p-3">Attendees</th>
                        <th className="text-center p-3">Near Misses</th>
                        <th className="text-center p-3">First Aid</th>
                        <th className="text-center p-3">Violations</th>
                        <th className="text-center p-3">Non-Conf.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsInMonth.length === 0 && (
                        <tr><td colSpan={7} className="text-center text-white/40 py-6">No logs for {selectedMonth}</td></tr>
                      )}
                      {logsInMonth.map((l) => (
                        <tr key={l.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white/70 text-xs">{formatDate(l.log_date)}</td>
                          <td className="p-3 text-white">{l.project_name || `#${l.project}`}</td>
                          <td className="p-3 text-center text-white/70">{l.safety_talk_attendees || 0}</td>
                          <td className="p-3 text-center text-yellow-300">{l.near_miss_count || 0}</td>
                          <td className="p-3 text-center text-orange-300">{l.first_aid_cases || 0}</td>
                          <td className="p-3 text-center text-red-300">{l.safety_violations || 0}</td>
                          <td className="p-3 text-center text-red-300">{l.non_conformance_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── FINANCIALS ── */}
          {activeTab === 'financials' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-400" />
                Financial Summary
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Budget', val: formatCurrency(totalBudget), color: 'text-blue-400' },
                  { label: 'Total Actual Cost', val: formatCurrency(totalActual), color: 'text-orange-400' },
                  { label: `Labour (${selectedMonth})`, val: formatCurrency(labourCost), color: 'text-emerald-400' },
                  { label: `Materials (${selectedMonth})`, val: formatCurrency(materialCost), color: 'text-purple-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-white/10 rounded-xl p-4 border border-white/10">
                    <div className={`text-xs ${s.color}`}>{s.label}</div>
                    <div className="text-2xl font-bold text-white mt-1">{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-3 bg-white/5 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white">Project Budget vs Actual</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/50 text-xs border-b border-white/10">
                        <th className="text-left p-3">Project</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-right p-3">Budget</th>
                        <th className="text-right p-3">Actual Cost</th>
                        <th className="text-right p-3">Remaining</th>
                        <th className="text-left p-3">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-white/40 py-6">No projects</td></tr>
                      )}
                      {projects.map((p) => {
                        const budget = Number(p.budget || 0);
                        const actual = Number(p.actual_cost || 0);
                        const remaining = budget - actual;
                        const over = remaining < 0;
                        return (
                          <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-3 text-white font-medium">{p.name}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>{p.status}</span>
                            </td>
                            <td className="p-3 text-right text-white/70">{formatCurrency(budget)}</td>
                            <td className="p-3 text-right text-white/70">{formatCurrency(actual)}</td>
                            <td className={`p-3 text-right font-semibold ${over ? 'text-red-400' : 'text-emerald-400'}`}>
                              {over ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-orange-400'}`} style={{ width: `${Math.min(p.progress || 0, 100)}%` }} />
                                </div>
                                <span className="text-xs text-white/60">{p.progress || 0}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/20 bg-white/5">
                        <td colSpan={2} className="p-3 text-white font-semibold">TOTALS</td>
                        <td className="p-3 text-right text-white font-bold">{formatCurrency(totalBudget)}</td>
                        <td className="p-3 text-right text-white font-bold">{formatCurrency(totalActual)}</td>
                        <td className={`p-3 text-right font-bold ${totalBudget - totalActual < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatCurrency(totalBudget - totalActual)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── USER ROLES ── */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-400" />
                User Roles & Permissions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <div key={role.id} className="bg-white/10 rounded-xl p-4 border border-white/10 hover:border-orange-400/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-orange-400" />
                          <h3 className="text-white font-semibold">{role.name}</h3>
                        </div>
                        <p className="text-sm text-white/60 mt-1">{role.permissions}</p>
                        <p className="text-xs text-white/40 mt-2">{role.users} users assigned</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(role.status)}`}>{role.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── EMAIL NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-400" />
                Email Notifications
              </h2>
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 text-xs border-b border-white/10 bg-white/5">
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Recipient</th>
                      <th className="text-left p-3">Last Sent</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((n) => (
                      <tr key={n.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-white font-medium">{n.type}</td>
                        <td className="p-3 text-white/60">{n.recipient}</td>
                        <td className="p-3 text-white/60 text-xs">{n.lastSent}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(n.status)}`}>{n.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PRINT TEMPLATE ── */}
      <div id="print-report" style={{ display: 'none' }}>
        <h1>ITesho — Monthly Report</h1>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>
          Period: {selectedMonth} &nbsp;|&nbsp; Generated: {new Date().toLocaleString('en-ZA')}
        </p>

        <h2>1. Project Overview</h2>
        <div className="stat-grid">
          <div className="stat-box"><div className="stat-val">{projects.length}</div><div className="stat-lbl">Total Projects</div></div>
          <div className="stat-box"><div className="stat-val">{activeProjects.length}</div><div className="stat-lbl">Active Projects</div></div>
          <div className="stat-box"><div className="stat-val">{formatCurrency(totalBudget)}</div><div className="stat-lbl">Total Budget</div></div>
          <div className="stat-box"><div className="stat-val">{formatCurrency(totalActual)}</div><div className="stat-lbl">Total Actual Cost</div></div>
        </div>
        <table>
          <thead><tr><th>Project</th><th>Status</th><th>Budget</th><th>Actual</th><th>Progress</th><th>Start</th><th>End</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td><span className={getBadgeClass(p.status)}>{p.status}</span></td>
                <td>{formatCurrency(p.budget)}</td>
                <td>{formatCurrency(p.actual_cost)}</td>
                <td>{p.progress || 0}%</td>
                <td>{formatDate(p.start_date)}</td>
                <td>{formatDate(p.end_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>2. Submissions Summary — {selectedMonth}</h2>
        <div className="stat-grid">
          <div className="stat-box"><div className="stat-val">{logsInMonth.length}</div><div className="stat-lbl">Total Logs</div></div>
          <div className="stat-box"><div className="stat-val">{approved.length}</div><div className="stat-lbl">Approved</div></div>
          <div className="stat-box"><div className="stat-val">{pending.length}</div><div className="stat-lbl">Pending</div></div>
          <div className="stat-box"><div className="stat-val">{rejected.length}</div><div className="stat-lbl">Rejected</div></div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Project</th><th>Submitted By</th><th>Status</th></tr></thead>
          <tbody>
            {dailyLogs.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.log_date)}</td>
                <td>{s.project_name || `#${s.project}`}</td>
                <td>{s.contractor_name || `#${s.contractor}`}</td>
                <td><span className={getBadgeClass(s.status)}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>3. Safety & Compliance — {selectedMonth}</h2>
        <div className="stat-grid">
          <div className="stat-box"><div className="stat-val">{safetyIncidents}</div><div className="stat-lbl">Safety Incidents</div></div>
          <div className="stat-box"><div className="stat-val">{nearMisses}</div><div className="stat-lbl">Near Misses</div></div>
          <div className="stat-box"><div className="stat-val">{nonConformances}</div><div className="stat-lbl">Non-Conformances</div></div>
          <div className="stat-box"><div className="stat-val">{complianceScore}%</div><div className="stat-lbl">Compliance Score</div></div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Project</th><th>Attendees</th><th>Near Misses</th><th>First Aid</th><th>Violations</th><th>Non-Conf.</th></tr></thead>
          <tbody>
            {logsInMonth.map((l) => (
              <tr key={l.id}>
                <td>{formatDate(l.log_date)}</td>
                <td>{l.project_name || `#${l.project}`}</td>
                <td>{l.safety_talk_attendees || 0}</td>
                <td>{l.near_miss_count || 0}</td>
                <td>{l.first_aid_cases || 0}</td>
                <td>{l.safety_violations || 0}</td>
                <td>{l.non_conformance_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>4. Financial Summary</h2>
        <div className="stat-grid">
          <div className="stat-box"><div className="stat-val">{formatCurrency(labourCost)}</div><div className="stat-lbl">Labour ({selectedMonth})</div></div>
          <div className="stat-box"><div className="stat-val">{formatCurrency(materialCost)}</div><div className="stat-lbl">Materials</div></div>
          <div className="stat-box"><div className="stat-val">{formatCurrency(equipmentCost)}</div><div className="stat-lbl">Equipment</div></div>
          <div className="stat-box"><div className="stat-val">{formatCurrency(subconCost)}</div><div className="stat-lbl">Subcontractors</div></div>
        </div>
        <table>
          <thead><tr><th>Project</th><th>Budget</th><th>Actual Cost</th><th>Remaining</th><th>Progress</th></tr></thead>
          <tbody>
            {projects.map((p) => {
              const rem = Number(p.budget || 0) - Number(p.actual_cost || 0);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatCurrency(p.budget)}</td>
                  <td>{formatCurrency(p.actual_cost)}</td>
                  <td style={{ color: rem < 0 ? '#dc2626' : '#16a34a' }}>{rem < 0 ? `-${formatCurrency(Math.abs(rem))}` : formatCurrency(rem)}</td>
                  <td>{p.progress || 0}%</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 700 }}>
              <td>TOTAL</td>
              <td>{formatCurrency(totalBudget)}</td>
              <td>{formatCurrency(totalActual)}</td>
              <td style={{ color: totalBudget - totalActual < 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(totalBudget - totalActual)}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: 32, color: '#9ca3af', fontSize: 10 }}>
          ITesho v3.0 &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; Generated {new Date().toLocaleString('en-ZA')}
        </p>
      </div>
    </>
  );
}

export default Reports;