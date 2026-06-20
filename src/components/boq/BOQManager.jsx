const API_URL = 'http://127.0.0.1:8000';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';

function BOQManager({ projectId, refreshTrigger }) {
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [summary, setSummary] = useState({ 
    totalPlanned: 0, 
    totalApproved: 0, 
    totalCost: 0,  // ✅ Changed from totalClaimed to totalCost
    overallProgress: 0 
  });

  const getToken = () => localStorage.getItem('access_token');

  const fetchBOQ = useCallback(async (showLoading = true) => {
    if (!projectId) return;
    
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const token = getToken();
      
      let response = await fetch(`${API_URL}/api/boq/tree/?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        response = await fetch(`${API_URL}/api/boq/?project_id=${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
      
      const data = await response.json();
      console.log('BOQ Data fetched:', data);
      
      const tree = buildTree(data);
      console.log('Built Tree:', tree);
      
      setBoqItems(tree);
      
      const initialExpanded = {};
      const expandAll = (items) => {
        items.forEach(item => {
          if (item.children && item.children.length > 0) {
            initialExpanded[item.id] = true;
            expandAll(item.children);
          }
        });
      };
      expandAll(tree);
      setExpandedItems(initialExpanded);
      calculateSummary(tree);
    } catch (err) {
      console.error('Failed to fetch BOQ:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  const buildTree = (items) => {
    if (!items || !Array.isArray(items)) return [];
    
    if (items.some(item => item.children && item.children.length > 0)) {
      return items;
    }
    
    console.log('Building tree from flat data...');
    
    const itemMap = {};
    const roots = [];

    items.forEach(item => {
      itemMap[item.id] = { 
        ...item, 
        children: [] 
      };
    });

    items.forEach(item => {
      const parentId = item.parent_id || (item.parent && item.parent.id);
      
      if (parentId && itemMap[parentId]) {
        itemMap[parentId].children.push(itemMap[item.id]);
      } else if (!parentId) {
        roots.push(itemMap[item.id]);
      }
    });

    const sortItems = (itemsArray) => {
      itemsArray.sort((a, b) => a.item_code.localeCompare(b.item_code));
      itemsArray.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortItems(item.children);
        }
      });
    };
    sortItems(roots);

    return roots;
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBOQ(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchBOQ]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden && !loading) {
        fetchBOQ(false);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchBOQ, loading]);

  useEffect(() => {
    fetchBOQ(true);
  }, [fetchBOQ, refreshTrigger]);

  const calculateSummary = (items) => {
    let totalPlanned = 0, totalApproved = 0, totalCost = 0;  // ✅ Changed from totalClaimed
    
    const flatten = (itemList) => {
      for (const item of itemList) {
        if (item.level === 1) {
          const plannedQty = Number(item.planned_quantity) || 0;
          const approvedQty = Number(item.approved_quantity) || 0;
          const rate = Number(item.rate) || 0;
          
          totalPlanned += plannedQty * rate;
          totalApproved += approvedQty * rate;
          totalCost += approvedQty * rate;  // ✅ Changed from totalClaimed
        }
        
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      }
    };
    
    flatten(items);
    
    setSummary({
      totalPlanned,
      totalApproved,
      totalCost,  // ✅ Changed from totalClaimed
      overallProgress: totalPlanned > 0 ? (totalCost / totalPlanned) * 100 : 0,
    });
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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

  const getDisplayPlannedQty = (item) => {
    if (item.children && item.children.length > 0) {
      return item.children.reduce((sum, child) => sum + (Number(child.planned_quantity) || 0), 0);
    }
    return Number(item.planned_quantity) || 0;
  };

  const getDisplayApprovedQty = (item) => {
    if (item.children && item.children.length > 0) {
      return item.children.reduce((sum, child) => sum + (Number(child.approved_quantity) || 0), 0);
    }
    return Number(item.approved_quantity) || 0;
  };

  const getDisplayCost = (item) => {  // ✅ Renamed from getDisplayClaimed
    if (item.children && item.children.length > 0) {
      return item.children.reduce((sum, child) => {
        return sum + ((Number(child.approved_quantity) || 0) * (Number(child.rate) || 0));
      }, 0);
    }
    return (Number(item.approved_quantity) || 0) * (Number(item.rate) || 0);
  };

  const renderBOQItem = (item, level = 0) => {
    const isExpanded = expandedItems[item.id];
    const hasChildren = item.children && item.children.length > 0;
    const paddingLeft = level * 24;
    const rate = Number(item.rate) || 0;
    
    const displayPlannedQty = getDisplayPlannedQty(item);
    const displayApprovedQty = getDisplayApprovedQty(item);
    const displayPlannedAmount = displayPlannedQty * rate;
    const displayCost = getDisplayCost(item);  // ✅ Renamed from displayClaimed
    const progress = Number(item.progress_percentage) || 0;

    const getLevelColor = (level) => {
      switch(level) {
        case 0: return 'bg-orange-50/80 border-l-4 border-l-orange-500';
        case 1: return 'bg-blue-50/60 border-l-4 border-l-blue-500';
        case 2: return 'bg-emerald-50/40 border-l-4 border-l-emerald-500';
        default: return 'bg-gray-50/20 border-l-4 border-l-gray-400';
      }
    };

    const getTextStyle = (level) => {
      switch(level) {
        case 0: return 'font-semibold text-gray-900';
        case 1: return 'font-medium text-gray-800';
        default: return 'text-gray-700';
      }
    };

    return (
      <div key={item.id} className="w-full">
        <div 
          className={`w-full border-b border-gray-100 hover:bg-white/80 transition-colors ${getLevelColor(level)}`}
        >
          <div 
            className={`flex items-center py-2.5 px-3 cursor-pointer select-none`}
            style={{ paddingLeft: `${paddingLeft + 16}px` }}
            onClick={() => hasChildren && toggleExpand(item.id)}
          >
            <div className="w-8 flex justify-center flex-shrink-0">
              {hasChildren ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} 
                  className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer focus:outline-none"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              ) : (
                <span className="w-4"></span>
              )}
            </div>
            
            <div className="flex-1 grid grid-cols-12 gap-2 text-xs min-w-[900px]">
              <div className={`col-span-2 ${getTextStyle(level)}`}>
                {item.item_code}
                {item.level === 1 && (
                  <span className="text-[9px] text-orange-500 ml-1">★</span>
                )}
              </div>
              <div className={`col-span-3 ${getTextStyle(level)}`}>
                {item.description}
                {hasChildren && (
                  <span className="text-[9px] text-gray-400 ml-1">
                    ({item.children.length} items)
                  </span>
                )}
              </div>
              <div className="col-span-1 text-gray-500">{item.unit}</div>
              <div className="col-span-1 text-right text-gray-600">{displayPlannedQty.toLocaleString()}</div>
              <div className="col-span-1 text-right text-gray-600">R{rate.toLocaleString()}</div>
              <div className="col-span-1 text-right text-gray-600">R{displayPlannedAmount.toLocaleString()}</div>
              <div className="col-span-1 text-right font-medium text-emerald-600">{displayApprovedQty.toLocaleString()}</div>
              <div className="col-span-1 text-right font-bold text-blue-600">R{displayCost.toLocaleString()}</div>  {/* ✅ Changed to Total Cost */}
              <div className="col-span-1">
                <ProgressBar percentage={progress} />
              </div>
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="w-full">
            {item.children.map(child => renderBOQItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleRefresh = () => {
    fetchBOQ(false);
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Planned Cost</div>
          <div className="text-base font-bold text-gray-800 mt-0.5">R{summary.totalPlanned.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Cost</div>  {/* ✅ Changed from Amount Claimed */}
          <div className="text-base font-bold text-emerald-600 mt-0.5">R{summary.totalCost.toLocaleString()}</div>  {/* ✅ Changed from totalClaimed */}
          <div className="text-xs text-gray-400 mt-1">{summary.overallProgress.toFixed(1)}% of planned</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Overall Progress</div>
          <div className="text-base font-bold text-gray-800 mt-0.5">{summary.overallProgress.toFixed(1)}%</div>
          <ProgressBar percentage={summary.overallProgress} />
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Remaining Cost</div>
          <div className="text-base font-bold text-gray-800 mt-0.5">R{(summary.totalPlanned - summary.totalCost).toLocaleString()}</div>  {/* ✅ Changed from totalClaimed */}
        </div>
      </div>

      {/* BOQ Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              <h2 className="text-sm font-semibold text-gray-700">Bill of Quantities (BOQ)</h2>
              {refreshing && (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-orange-500 border-t-transparent"></div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">Click the arrow buttons to expand/collapse sections</p>
        </div>
        
        <div className="bg-gray-100 py-1.5 px-3 border-b border-gray-200 min-w-[900px]">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wider ml-6">
            <div className="col-span-2">Item ID</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-1 text-right">Planned Qty</div>
            <div className="col-span-1 text-right">Rate (R)</div>
            <div className="col-span-1 text-right">Planned (R)</div>
            <div className="col-span-1 text-right">Approved Qty</div>
            <div className="col-span-1 text-right">Total Cost (R)</div>  {/* ✅ Changed from Claimed (R) */}
            <div className="col-span-1">Progress</div>
          </div>
        </div>
        
        <div>
          {boqItems.map(item => renderBOQItem(item, 0))}
        </div>
      </div>
    </div>
  );
}

export default BOQManager;