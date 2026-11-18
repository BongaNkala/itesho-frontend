import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DailyLogForm from '../components/dailylog/DailyLogForm';
import { ArrowLeft } from 'lucide-react';

function DailySiteLogs() {
  const navigate = useNavigate();
  // Hardcoding Project 4 to test the form
  const [selectedProjectId, setSelectedProjectId] = useState(4); 

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 text-white font-sans">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-all"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* 
        This imports the EXACT form from the Projects page. 
        It will look identical to image 2.
      */}
      <div className="bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-800">
        <DailyLogForm projectId={selectedProjectId} />
      </div>

    </div>
  );
}

export default DailySiteLogs;
