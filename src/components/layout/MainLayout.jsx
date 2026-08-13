import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  LogOut,
  Menu,
  X,
  ClipboardList,
  Sparkles,
  Bell,
  ChevronRight,
  TrendingUp,
  Calendar,
  Activity,
  Zap,
  Shield,
  Cloud,
  Sun,
  Moon,
  Gauge,
  Target,
  Flame,
  DollarSign,
  Settings  // <-- ADD THIS
} from 'lucide-react';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [time, setTime] = useState(new Date());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [pendingCount, setPendingCount] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [performanceScore, setPerformanceScore] = useState(98);
  const mainContentRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const getToken = () => localStorage.getItem('access_token');

  // Fetch real-time stats
  useEffect(() => {
    const fetchStats = async () => {
      const token = getToken();
      if (!token) return;

      try {
        // Fetch all daily logs to get pending count (status = 'submitted')
        const logsRes = await fetch(`${API_URL}/api/daily-logs/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const logsData = await logsRes.json();
        const entriesArray = Array.isArray(logsData) ? logsData : [];
        
        // Count pending submissions (status 'submitted')
        const pending = entriesArray.filter(log => log.status === 'submitted').length;
        setPendingCount(pending);

        // Fetch projects to get active count
        const projectsRes = await fetch(`${API_URL}/api/projects/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const projectsData = await projectsRes.json();
        const activeCount = Array.isArray(projectsData) ? projectsData.filter(p => p.status === 'active').length : 0;
        setActiveProjectsCount(activeCount);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || 'contractor');
      } catch (e) {}
    }
    const timer = setInterval(() => setTime(new Date()), 60000);
    
    const handleScroll = () => {
      if (mainContentRef.current) {
        setScrolled(mainContentRef.current.scrollTop > 20);
      }
    };
    
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    const contentEl = mainContentRef.current;
    if (contentEl) contentEl.addEventListener('scroll', handleScroll);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('mousemove', handleMouseMove);
      if (contentEl) contentEl.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/');
  };

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', badge: null, glow: 'from-cyan-500 to-blue-500' },
    { title: 'Projects', icon: Building2, path: '/projects', badge: activeProjectsCount > 0 ? activeProjectsCount : null, glow: 'from-emerald-500 to-teal-500' },
    { title: 'Submissions', icon: ClipboardList, path: '/submissions', badge: pendingCount > 0 ? pendingCount : null, glow: 'from-orange-500 to-amber-500' },
    { title: 'Daily Logs', icon: ClipboardList, path: '/daily-logs', badge: null, glow: 'from-blue-500 to-cyan-500' },
    { title: 'Invoices', icon: DollarSign, path: '/invoices', badge: null, glow: 'from-purple-500 to-pink-500' },
  { title: 'Reports', icon: Settings, path: '/reports', badge: null, glow: 'from-violet-500 to-purple-500' },
  ];

  const isActive = (path) => location.pathname === path;

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const formatTime = () => {
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = () => {
    return time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Video/Canvas Background Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{
          backgroundImage: 'url(https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100011502/1889.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
          scale: '1.05'
        }}
      />
      
      {/* Dynamic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/50 pointer-events-none" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`
            }}
          />
        ))}
      </div>

      {/* Animated Ambient Light That Follows Mouse */}
      <div 
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-500"
        style={{
          background: 'radial-gradient(circle, rgba(251,146,60,0.3) 0%, rgba(251,146,60,0) 70%)',
          left: mousePosition.x - 200,
          top: mousePosition.y - 200,
        }}
      />

      {/* 3D Tilt Sidebar */}
      <div 
        className={`relative z-20 ${sidebarOpen ? 'w-80' : 'w-24'} transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col h-full`}
        style={{
          transform: `perspective(1000px) rotateY(${sidebarOpen ? 0 : -5}deg)`,
          transformOrigin: 'left center'
        }}
      >
        {/* Glass Sidebar with Border Glow */}
        <div className="flex-1 m-3 rounded-2xl backdrop-blur-2xl bg-white/5 border border-white/20 shadow-2xl flex flex-col overflow-hidden relative">
          {/* Sidebar Ambient Glow */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />

          {/* Brand Section - 3D Floating Logo */}
          <div className={`h-28 flex ${sidebarOpen ? 'justify-between' : 'justify-center'} items-center px-6 border-b border-white/10 relative`}>
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur-xl animate-pulse group-hover:blur-2xl transition-all duration-500" />
                  <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="relative">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent tracking-tight">ITesho</h1>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Project Control</p>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur-xl animate-pulse" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
            )}
            {sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group"
              >
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            )}
          </div>

          {/* Navigation Menu - Morphing Items */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item, idx) => (
              <Link
                key={item.path}
                to={item.path}
                onMouseEnter={() => setHoveredItem(idx)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-500 group overflow-hidden ${
                  isActive(item.path) 
                    ? 'bg-gradient-to-r from-white/15 to-transparent shadow-xl' 
                    : 'hover:bg-white/5'
                }`}
              >
                {/* Animated Active Border */}
                {isActive(item.path) && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 via-amber-500 to-orange-400 rounded-r-full animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-transparent animate-pulse" />
                  </>
                )}
                
                {/* Icon with 3D Hover */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.glow} rounded-xl blur-md transition-all duration-500 ${hoveredItem === idx ? 'opacity-100 scale-150' : 'opacity-0'}`} />
                  <item.icon className={`relative h-5 w-5 transition-all duration-500 ${
                    isActive(item.path) ? 'text-orange-300' : 'text-white/60 group-hover:text-white group-hover:scale-125'
                  }`} />
                </div>
                
                {/* Menu Text with Slide Effect */}
                {sidebarOpen && (
                  <span className={`flex-1 font-medium tracking-wide transition-all duration-300 ${
                    isActive(item.path) ? 'text-white' : 'text-white/70 group-hover:text-white group-hover:translate-x-1'
                  }`}>
                    {item.title}
                  </span>
                )}
                
                {/* Animated Badge - Shows actual pending count */}
                {sidebarOpen && item.badge !== null && item.badge > 0 && (
                  <span className="relative px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full shadow-lg animate-pulse">
                    {item.badge}
                  </span>
                )}
                
                {/* Hover Trail Effect */}
                {sidebarOpen && hoveredItem === idx && (
                  <div className="absolute right-4">
                    <ChevronRight className="h-4 w-4 text-orange-400 animate-bounce-x" />
                  </div>
                )}
              </Link>
            ))}
          </nav>

          {/* User Section - Holographic Card */}
          <div className="p-4 border-t border-white/10 relative">
            <div className={`backdrop-blur-xl bg-gradient-to-br from-white/5 to-white/0 rounded-xl p-3 transition-all duration-500 hover:bg-white/10 ${sidebarOpen ? '' : 'text-center'}`}>
              <div className={`flex ${sidebarOpen ? 'gap-3' : 'flex-col items-center'} items-center`}>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur-md animate-pulse" />
                  <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-500 group-hover:scale-110">
                    <span className="text-white font-bold text-lg tracking-wider">
                      {userRole ? userRole.charAt(0).toUpperCase() : 'C'}
                    </span>
                  </div>
                </div>
                {sidebarOpen && (
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold capitalize tracking-wide">{userRole || 'Contractor'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="h-3 w-3 text-emerald-400" />
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">Project Control</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Logout Button - Morphing */}
            <button
              onClick={handleLogout}
              className="group relative flex items-center gap-3 px-4 py-3 mt-2 w-full rounded-xl text-white/60 hover:text-white hover:bg-red-500/20 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover:from-red-500/10 group-hover:to-transparent transition-all duration-700" />
              <LogOut className="h-5 w-5 relative z-10 transition-all duration-500 group-hover:scale-110 group-hover:-translate-x-1 group-hover:text-red-400" />
              {sidebarOpen && (
                <span className="relative z-10 text-sm font-medium tracking-wide transition-all duration-300 group-hover:translate-x-1">
                  Sign Out
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="absolute inset-0 left-auto flex flex-col overflow-hidden z-10" style={{ left: sidebarOpen ? '20rem' : '6rem' }}>
        {/* Premium Header - Glass with Micro Interactions */}
        <header className={`backdrop-blur-xl bg-white/5 border-b border-white/10 transition-all duration-500 ${scrolled ? 'shadow-2xl bg-white/10' : ''}`}>
          <div className="h-16 flex items-center justify-between px-8">
            {/* Animated Toggle Button */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-500 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-500" />
                <Menu className="h-5 w-5 relative z-10 transition-transform duration-500 group-hover:scale-110" />
              </button>
            )}
            
            {/* Dynamic Greeting Area */}
            <div className="flex items-center gap-8 ml-auto">
              {/* Animated Greeting Card */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-default">
                <div className="relative">
                  <Zap className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
                  <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-md animate-pulse" />
                </div>
                <span className="text-xs text-white/70">Good {getGreeting()},</span>
                <span className="text-xs text-white font-semibold capitalize">{userRole || 'User'}</span>
              </div>
              
              {/* Live Date/Time - Digital Display */}
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 font-mono">
                <Calendar className="h-3.5 w-3.5 text-white/50" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/70">{formatDate().split(',')[0]}</span>
                  <div className="w-px h-3 bg-white/20" />
                  <span className="text-xs text-white/80 font-semibold">{formatTime()}</span>
                </div>
              </div>
              
              {/* Premium Notification Center */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-500 group"
                >
                  <Bell className="h-5 w-5 transition-transform duration-500 group-hover:scale-110" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-ping" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>
                
                {/* Notification Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 backdrop-blur-2xl bg-black/60 border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-slideDown z-50">
                    <div className="p-4 border-b border-white/10">
                      <p className="text-white text-sm font-semibold">Notifications</p>
                      <p className="text-[10px] text-white/40">You have 3 unread messages</p>
                    </div>
                    <div className="divide-y divide-white/10 max-h-96 overflow-auto">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-3 hover:bg-white/5 transition-all duration-300 cursor-pointer group">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 mt-2 bg-orange-500 rounded-full animate-pulse" />
                            <div className="flex-1">
                              <p className="text-white text-xs font-medium">New submission from contractor</p>
                              <p className="text-[10px] text-white/40 mt-1">requires your review</p>
                              <p className="text-[9px] text-white/30 mt-1">5 minutes ago</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle - 3D Switch */}
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-500"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          {/* Advanced Stats Bar - Animated Metrics */}
          <div className="px-8 py-2 border-t border-white/5 hidden lg:flex items-center gap-6 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-white/60 uppercase tracking-wider">System Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-white/60">Performance: {performanceScore}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 text-orange-400" />
              <span className="text-[10px] text-white/60">Active Projects: {activeProjectsCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-3 w-3 text-red-400 animate-pulse" />
              <span className="text-[10px] text-white/60">Pending: {pendingCount}</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Cloud className="h-3 w-3 text-white/40" />
                <span className="text-[10px] text-white/40">Cloud Sync</span>
                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main 
          ref={mainContentRef}
          className="flex-1 overflow-auto scroll-smooth"
        >
          <div className="p-6">
            <Outlet />
          </div>
        </main>

        {/* Elegant Footer */}
        <footer className="px-8 py-3 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/30 tracking-wider">
            ITesho | Project Control | Enterprise Grade Security
          </p>
        </footer>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { transform: translateY(-100px) translateX(50px); opacity: 1; }
        }
        
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .animate-bounce-x {
          animation: bounce-x 0.5s ease-in-out infinite;
        }
        
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default MainLayout;
