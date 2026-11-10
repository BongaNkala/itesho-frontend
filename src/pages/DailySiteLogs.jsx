import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Users, Truck, FileText, Shield, CheckCircle, Clock, Camera, ArrowLeft } from 'lucide-react';
// Import your existing form logic or component here
import DailyLogForm from '../components/dailylog/DailyLogForm';

function DailySiteLogs() {
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState(4); 
  const [selectedProjectName, setSelectedProjectName] = useState('Interface Test Project');

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      
      {/* Header matching the dark UI */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="bg-orange-500 p-1.5 rounded-lg"><Sun className="h-5 w-5 text-white" /></span>
              Daily Log Entry
            </h1>
            <p className="text-sm text-gray-400">Record site activities, manpower, and progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full text-green-400 text-sm">
          <CheckCircle className="h-4 w-4" /> Compliance OK
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800 pb-2">
        {[
          { icon: Sun, label: 'Weather' },
          { icon: Users, label: 'Manpower' },
          { icon: Truck, label: 'Equipment' },
          { icon: FileText, label: 'BOQ Progress' },
          { icon: FileText, label: 'Work' },
          { icon: Shield, label: 'Safety' },
          { icon: CheckCircle, label: 'Quality' },
          { icon: Clock, label: 'Delays' },
          { icon: Camera, label: 'Photos' },
        ].map((tab, i) => (
          <button key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-800 transition">
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* The Dark Wrapper for the Form */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-xl">
        <DailyLogForm projectId={selectedProjectId} />
      </div>
    </div>
  );
}

export default DailySiteLogs;
