const API_URL = 'https://bongankala.pythonanywhere.com';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, ArrowRight } from 'lucide-react';

function DailyLogShortcut({ projectId }) {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [recentDate, setRecentDate] = useState(null);
  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    if (projectId) {
      fetchStats();
    }
  }, [projectId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/daily-logs/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
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
    navigate(`/projects/${projectId}?tab=daily-logs`);
  };

  return (
    <div 
      onClick={handleClick}
      className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-2 cursor-pointer hover:bg-orange-100 transition flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-orange-500" />
        <span className="text-xs font-medium text-orange-700">Daily Log</span>
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
        <ArrowRight className="h-3 w-3 text-orange-400" />
      </div>
    </div>
  );
}

export default DailyLogShortcut;
