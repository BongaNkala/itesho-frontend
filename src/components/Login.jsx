import { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  Shield, 
  Users, 
  Clock, 
  Award, 
  Target, 
  Globe, 
  Zap, 
  Rocket, 
  Star, 
  Compass 
} from 'lucide-react';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('Logging in...');

    try {
      const res = await fetch(`${API_URL}/api/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        setMessage('Success! Redirecting...');
        setTimeout(() => { 
          window.location.href = '/dashboard'; 
        }, 1000);
      } else {
        setMessage('Login failed: ' + (data.detail || 'Wrong credentials'));
        setIsLoading(false);
      }
    } catch (err) {
      setMessage('Cannot connect to server');
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Zap, text: 'Real-time Project Tracking', desc: 'Live updates on progress' },
    { icon: Shield, text: 'Safety Compliance', desc: 'Automated scoring & alerts' },
    { icon: Users, text: 'Team Collaboration', desc: 'Seamless contractor workflow' },
    { icon: TrendingUp, text: 'Cost Management', desc: 'BOQ & budget tracking' },
    { icon: Clock, text: 'Daily Submissions', desc: 'Streamlined approvals' },
    { icon: Award, text: 'Quality Assurance', desc: 'Inspection checklists' },
  ];

  const stats = [
    { value: '500+', label: 'Projects Managed' },
    { value: '98%', label: 'Client Satisfaction' },
    { value: '24/7', label: 'Support Available' },
  ];

  return (
    <div 
      className="min-h-screen flex overflow-hidden relative"
      style={{
        backgroundImage: 'url(https://grazia-prod.oss-ap-southeast-1.aliyuncs.com/resources/uid_100011502/9035.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/20 pointer-events-none" />
      
      {/* Ultra-Compact Portable Login Form - Left Side */}
      <div className="relative z-10 w-[340px] flex items-center justify-center p-4">
        <div className="w-full">
          {/* Tiny Brand Icon */}
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Compact Glass Card */}
          <div className="backdrop-blur-2xl bg-white/10 rounded-xl border border-white/20 shadow-2xl p-4">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-white">Welcome back</h2>
              <p className="text-[10px] text-white/50">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <input
                type="text"
                placeholder="Username"
                className="w-full p-2 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full p-2 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-1.5 rounded-lg text-xs font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 disabled:opacity-50 shadow-md mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    Signing...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              {message && (
                <div className={`text-center text-[9px] mt-2 p-1.5 rounded-lg ${
                  message.includes('Success') 
                    ? 'bg-emerald-500/20 text-emerald-200' 
                    : 'bg-red-500/20 text-red-200'
                }`}>
                  {message}
                </div>
              )}
            </form>

            <div className="mt-3 pt-2 border-t border-white/10 text-center">
              <p className="text-[8px] text-white/30 flex items-center justify-center gap-1">
                <Shield className="h-2.5 w-2.5" /> Secure enterprise login
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to expose centre image */}
      <div className="flex-1" />

      {/* Rich Creative Content - Far Right */}
      <div className="hidden lg:flex w-[380px] items-center justify-end pr-8 xl:pr-12 relative z-10">
        <div className="w-full max-w-sm">
          {/* Main Headline */}
          <div className="text-right mb-6">
            <div className="flex items-center justify-end gap-2 mb-2">
              <span className="text-[10px] font-semibold text-orange-300 tracking-wider uppercase">v4.0 Enterprise</span>
              <Sparkles className="h-3 w-3 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight drop-shadow-lg">
              Project
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Control</span>
              <br />
              Simplified
            </h1>
            <div className="h-px w-16 bg-gradient-to-r from-orange-400 to-transparent ml-auto my-4" />
            <p className="text-xs text-white/60 leading-relaxed">
              Complete platform for project management, compliance tracking, and stakeholder collaboration.
            </p>
          </div>

          {/* Feature Grid - 2 columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
            {features.map((feature, idx) => (
              <div key={idx} className="group text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[10px] text-white/70 group-hover:text-white/90 transition-colors">
                    {feature.text}
                  </span>
                  <div className="p-1 rounded-md bg-orange-500/15 group-hover:bg-orange-500/25 transition-all group-hover:scale-105">
                    <feature.icon className="h-2.5 w-2.5 text-orange-300" />
                  </div>
                </div>
                <p className="text-[8px] text-white/40 mt-0.5">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats Row */}
          <div className="flex justify-end gap-6 mb-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-right">
                <div className="text-lg font-bold text-white">{stat.value}</div>
                <div className="text-[8px] text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-end gap-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[8px] text-white/40">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-2.5 w-2.5 text-white/30" />
              <span className="text-[8px] text-white/40">Global Platform</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-2.5 w-2.5 text-white/30" />
              <span className="text-[8px] text-white/40">4.9 Rated</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 pt-3 border-t border-white/10 text-right">
            <p className="text-[8px] text-white/30">
              ITesho | Project Control
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;