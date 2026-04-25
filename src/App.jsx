import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/projects/ProjectDetail';
import SubmissionsPage from './pages/SubmissionsPage';
import PendingApprovals from './pages/PendingApprovals';
import EngineerApprovals from './pages/EngineerApprovals';
import ConsultantApprovals from './pages/ConsultantApprovals';
import MunicipalApprovals from './pages/MunicipalApprovals';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
        </Route>
        
        <Route path="/projects" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Projects />} />
        </Route>
        
        <Route path="/projects/:id" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<ProjectDetail />} />
        </Route>
        
        <Route path="/submissions" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<SubmissionsPage />} />
        </Route>
        
        <Route path="/approvals" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<PendingApprovals />} />
        </Route>

        // Add these routes
        <Route path="/approvals/engineer" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<EngineerApprovals />} />
        </Route>
        <Route path="/approvals/consultant" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<ConsultantApprovals />} />
        </Route>
        <Route path="/approvals/municipal" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<MunicipalApprovals />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;