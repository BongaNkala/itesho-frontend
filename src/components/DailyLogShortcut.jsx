// src/components/DailyLogShortcut.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, ArrowRight, Shield } from 'lucide-react';
import ComplianceGatekeeper from '../components/compliance/ComplianceGatekeeper';

const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';

function DailyLogShortcut({ projectId }) {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [recentDate, setRecentDate] = useState(null);
  const [showCompliance, setShowCompliance] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    if (projectId) {
      fetchProjectName();
      fetchStats();
    }
  }, [projectId]);

  const fetchProjectName = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProjectName(data.name);
      }
    } catch (err) {
      console.error('Failed to fetch project name:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/daily-logs/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      const logs = Array.isArray(data) ? data : [];
      const pending = logs.filter(l => l.status === 'submitted').length;
      const recent = logs.sort((a, b) => new Date(b.log_date) - new Date(a.log_date))[0];
      
      setPendingCount(pending);
      setRecentDate(recent?.log_date || null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    // Always show compliance gatekeeper first
    setShowCompliance(true);
  };

  const handleAccessGranted = () => {
    setShowCompliance(false);
    navigate(`/projects/${projectId}?tab=daily-logs`);
  };

  const handleCancel = () => {
    setShowCompliance(false);
  };

  // Show Compliance Gatekeeper
  if (showCompliance) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto p-4">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <ComplianceGatekeeper
              projectId={projectId}
              projectName={projectName || 'Project'}
              onAccessGranted={handleAccessGranted}
              onCancel={handleCancel}
              returnPath="daily-log"
            />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-2 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleClick}
      className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-2 cursor-pointer hover:bg-orange-100 transition flex items-center justify-between group"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <ClipboardList className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-medium text-orange-700">Daily Log</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-200/50 rounded-full">
          <Shield className="h-2.5 w-2.5 text-orange-600" />
          <span className="text-[8px] text-orange-700 font-medium">Compliance</span>
        </div>
        {pendingCount > 0 && (
          <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {recentDate && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(recentDate).toLocaleDateString()}
          </span>
        )}
        <ArrowRight className="h-3 w-3 text-orange-400 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

export default DailyLogShortcut;
