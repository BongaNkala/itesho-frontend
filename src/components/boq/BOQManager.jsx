const API_URL = 'https://bongankala.pythonanywhere.com';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

function BOQManager({ projectId }) {
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [summary, setSummary] = useState({ totalPlanned: 0, totalApproved: 0, overallProgress: 0 });

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    if (projectId) fetchBOQ();
  }, [projectId]);

  const fetchBOQ = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/boq/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();
      console.log('BOQ Data:', data);
      setBoqItems(data);
      const initialExpanded = {};
      data.forEach(item => {
        if (item.children && item.children.length > 0) {
          initialExpanded[item.id] = true;
        }
      });
      setExpandedItems(initialExpanded);
      calculateSummary(data);
    } catch (err) {
      console.error('Failed to fetch BOQ:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (items) => {
    let totalPlanned = 0, totalApproved = 0;
    const flatten = (itemList) => {
      for (const item of itemList) {
        if (item.level === 3) {
          totalPlanned += (Number(item.planned_quantity) || 0) * (Number(item.rate) || 0);
          totalApproved += (Number(item.approved_quantity) || 0) * (Number(item.rate) || 0);
        }
        if (item.children) flatten(item.children);
      }
    };
    flatten(items);
    setSummary({
      totalPlanned, totalApproved,
      overallProgress: totalPlanned > 0 ? (totalApproved / totalPlanned) * 100 : 0,
    });
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const ProgressBar = ({ percentage }) => {
    const percent = Number(percentage) || 0;
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}></div>
        </div>
        <span className="text-[10px] font-medium text-gray-600 w-10">{percent.toFixed(1)}%</span>
      </div>
    );
  };

  const renderBOQItem = (item, level = 0) => {
    const isExpanded = expandedItems[item.id];
    const hasChildren = item.children && item.children.length > 0;
    const paddingLeft = level * 20;
    const progress = Number(item.progress_percentage) || 0;
    const approvedQty = Number(item.approved_quantity) || 0;
    const plannedQty = Number(item.planned_quantity) || 0;
    const rate = Number(item.rate) || 0;
    const bgColor = item.level === 1 ? 'bg-gray-50' : item.level === 2 ? 'bg-white' : '';

    return (
      <div key={item.id}>
        <div className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${bgColor}`}>
          <div className="flex items-center py-2 px-3" style={{ paddingLeft: `${paddingLeft + 12}px` }}>
            <div className="w-6 flex justify-center">
              {hasChildren ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(item.id);
                  }} 
                  className="p-0.5 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-500" /> : <ChevronRight className="h-3 w-3 text-gray-500" />}
                </button>
              ) : (
                <span className="w-4"></span>
              )}
            </div>
            <div className="flex-1 grid grid-cols-12 gap-2 text-xs">
              <div className="col-span-2 font-medium text-gray-700">{item.item_code}</div>
              <div className="col-span-3 text-gray-600">{item.description}</div>
              <div className="col-span-1 text-gray-500">{item.unit}</div>
              <div className="col-span-1 text-right text-gray-600">{plannedQty.toLocaleString()}</div>
              <div className="col-span-1 text-right text-gray-600">R{rate.toLocaleString()}</div>
              <div className="col-span-1 text-right text-gray-600">R{(plannedQty * rate).toLocaleString()}</div>
              <div className="col-span-1 text-right font-medium text-emerald-600">{approvedQty.toLocaleString()}</div>
              <div className="col-span-2"><ProgressBar percentage={progress} /></div>
            </div>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="border-t border-gray-50">
            {item.children.map(child => renderBOQItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3 text-sm text-gray-500">Loading BOQ...</span>
      </div>
    );
  }

  if (boqItems.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-100 p-8 text-center">
        <p className="text-sm text-gray-400">No BOQ items found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards - Compact Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Planned Cost</div>
          <div className="text-base font-bold text-gray-800 mt-0.5">R{summary.totalPlanned.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Approved Cost</div>
          <div className="text-base font-bold text-emerald-600 mt-0.5">R{summary.totalApproved.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Overall Progress</div>
          <div className="text-base font-bold text-gray-800 mt-0.5">{summary.overallProgress.toFixed(1)}%</div>
          <ProgressBar percentage={summary.overallProgress} />
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Remaining Cost</div>
          <div className="text-base font-bold text-gray-800 mt-0.5">R{(summary.totalPlanned - summary.totalApproved).toLocaleString()}</div>
        </div>
      </div>

      {/* BOQ Table - Compact Design */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-700">Bill of Quantities (BOQ)</h2>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">Click the arrow buttons to expand sections</p>
        </div>
        
        {/* Table Header */}
        <div className="bg-gray-50 py-1.5 px-3 border-b border-gray-100 min-w-[900px]">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider ml-6">
            <div className="col-span-2">Item ID</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-1 text-right">Planned Qty</div>
            <div className="col-span-1 text-right">Rate (R)</div>
            <div className="col-span-1 text-right">Planned (R)</div>
            <div className="col-span-1 text-right">Approved Qty</div>
            <div className="col-span-2">Progress</div>
          </div>
        </div>
        
        {/* Table Body */}
        <div className="divide-y divide-gray-50">
          {boqItems.map(item => renderBOQItem(item, 0))}
        </div>
      </div>
    </div>
  );
}

export default BOQManager;