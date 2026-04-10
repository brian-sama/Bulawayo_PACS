
import React, { useState, useEffect } from 'react';
import { UserRole, Plan, PlanStatusValues, UserProfile } from './types';
import { Header } from './components/Header';
import { ClientDashboard } from './views/ClientDashboard';
import { AnalyticsDashboard } from './views/AnalyticsDashboard';
import { ReviewWorkspace } from './views/ReviewWorkspace';
import { LoginView } from './views/LoginView';
import { UserManagement } from './views/UserManagement';
import { MOCK_PLANS } from './constants';
import { logout as apiLogout } from './services/api';
import { ReceptionGateway } from './views/ReceptionGateway';
import { FinalApproval } from './views/FinalApproval';
import { ITDashboard } from './views/ITDashboard';
import { AuditLogs } from './views/AuditLogs';
import SearchArchive from './views/SearchArchive';
import { InternalDashboard } from './views/InternalDashboard';
import { PlanDetails } from './views/PlanDetails';
import { ReviewPool } from './views/ReviewPool';
import { LandingPage } from './views/LandingPage';
import { ReviewInterface } from './views/ReviewInterface';

type ViewType = 'DASHBOARD' | 'REVIEWS' | 'PLAN_DETAILS' | 'ANALYTICS' | 'USER_MANAGEMENT' | 'RECEPTION' | 'FINAL_APPROVAL' | 'SEARCH_ARCHIVE' | 'IT_DASHBOARD' | 'AUDIT_LOGS' | 'WORKFLOW_CONFIG';

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl transition-all duration-300 text-sm font-bold group ${active ? 'bg-white/10 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
  >
    <div className={`transition-colors duration-300 ${active ? 'text-white' : 'text-white/30 group-hover:text-white'}`}>
      {icon}
    </div>
    <span className="tracking-wide text-left">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>}
  </button>
);

const SidebarIcons = {
  Dashboard: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>,
  Reception: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
  Reviews: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7z" /><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
  Seal: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
  Analytics: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>,
  Users: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3z" /></svg>,
  Search: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>,
  AuditLogs: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 1h10v2H5V6zm0 4h10v2H5v-2zm0 4h5v2H5v-2z" clipRule="evenodd" /></svg>,
  Settings: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
};

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showLogin, setShowLogin] = useState(sessionStorage.getItem('pacs_show_login') === 'true');
  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  /**
   * appKey is incremented on logout to force a full React tree remount,
   * clearing all component state and preventing session bleed between users.
   */
  const [appKey, setAppKey] = useState(0);

  const [justLoggedOut, setJustLoggedOut] = useState(false);

  useEffect(() => {
    // If we just loaded and pacs_show_login is set, it means we logged out or were forced here
    if (sessionStorage.getItem('pacs_show_login') === 'true' && !user) {
      setShowLogin(true);
      setJustLoggedOut(true);
      // After 8 seconds, automatically return to landing page
      const timer = setTimeout(() => {
        sessionStorage.removeItem('pacs_show_login');
        setShowLogin(false);
        setJustLoggedOut(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleLogout = () => {
    setAppKey(k => k + 1);
    setUser(null);
    setShowLogin(true);
    setJustLoggedOut(true);
    apiLogout(); // clears local/session storage, redirects to '/' with pacs_show_login=true
  };

  const role = user?.role;

  const handleViewPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setCurrentView('PLAN_DETAILS');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        if (role === 'ADMIN') return <ITDashboard />;
        return role === 'CLIENT' ? (
          <ClientDashboard onViewPlan={handleViewPlan} />
        ) : (
          <InternalDashboard
            user={user}
            onViewPlan={handleViewPlan}
            onNavigate={(view) => setCurrentView(view)}
          />
        );
      case 'PLAN_DETAILS':
        if (!selectedPlan) return null;
        if (role === 'CLIENT') {
          return <PlanDetails plan={selectedPlan} user={user} onBack={() => setCurrentView('DASHBOARD')} />
        } else if (role === 'DEPT_OFFICER' || role === 'DEPT_HEAD') {
          return <ReviewWorkspace planId={String(selectedPlan.id)} onClose={() => setCurrentView('REVIEWS')} userRole={role} />
        } else {
          return <ReviewInterface plan={selectedPlan} user={user} onBack={() => setCurrentView('REVIEWS')} />
        }
      case 'ANALYTICS':
        return <AnalyticsDashboard />;
      case 'USER_MANAGEMENT':
        return <UserManagement />;
      case 'AUDIT_LOGS':
        return <AuditLogs />;
      case 'WORKFLOW_CONFIG':
        return (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Workflow Configuration</h1>
                <p className="text-slate-500">Manage dynamic routing rules and department visibility.</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚙️</div>
              <p className="font-medium">Workflow Engine Configuration Interface</p>
              <p className="text-sm">This module allows IT to define which plan categories route to which departments.</p>
            </div>
          </div>
        );
      case 'RECEPTION':
        return <ReceptionGateway user={user} />;
      case 'FINAL_APPROVAL':
        return <FinalApproval user={user} />;
      case 'REVIEWS':
        return <ReviewPool user={user!} onViewPlan={handleViewPlan} />;
      case 'SEARCH_ARCHIVE':
        return <SearchArchive user={user!} onViewPlan={handleViewPlan} />;
      default:
        return <div>View not implemented</div>;
    }
  };

  if (!user && !showLogin) {
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  if (!user) {
    return (
      <div className="relative">
        <LoginView onLogin={setUser} onBack={() => {
          sessionStorage.removeItem('pacs_show_login');
          setShowLogin(false);
          setJustLoggedOut(false);
        }} />
        {justLoggedOut && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-6 py-3 rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 z-50">
            <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Securely Logged Out. Returning to landing page shortly...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div key={appKey} className="flex h-screen bg-[#F9FAFB] overflow-hidden font-interface selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar with BCC Branding */}
      <aside className="w-72 bg-[#003366] text-white flex flex-col shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.1)] relative z-20">
        <div className="p-8 border-b border-white/5 flex flex-col items-center gap-4 bg-white/5">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl p-1">
            <img src="/logo.png" alt="BCC" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="font-black tracking-tighter text-2xl">Bulawayo PACS</h1>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest leading-none mt-1 opacity-70">Bulawayo City Council</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <NavItem
            active={currentView === 'DASHBOARD'}
            onClick={() => setCurrentView('DASHBOARD')}
            label={role === 'ADMIN' ? 'System Governance' : 'Dashboard'}
            icon={SidebarIcons.Dashboard}
          />

          {role === 'RECEPTION' && (
            <NavItem active={currentView === 'RECEPTION'} onClick={() => setCurrentView('RECEPTION')} label="Reception Gateway" icon={SidebarIcons.Reception} />
          )}

          {(role === 'DEPT_OFFICER' || role === 'DEPT_HEAD') && (
            <NavItem active={currentView === 'REVIEWS'} onClick={() => setCurrentView('REVIEWS')} label="Technical Reviews" icon={SidebarIcons.Reviews} />
          )}

          {(role === 'FINAL_APPROVER') && (
            <NavItem active={currentView === 'FINAL_APPROVAL'} onClick={() => setCurrentView('FINAL_APPROVAL')} label="Final Signature" icon={SidebarIcons.Seal} />
          )}

          {(role === 'DEPT_HEAD' || role === 'FINAL_APPROVER') && (
            <NavItem active={currentView === 'ANALYTICS'} onClick={() => setCurrentView('ANALYTICS')} label="Executive Analytics" icon={SidebarIcons.Analytics} />
          )}

          {(role === 'ADMIN') && (
            <>
              <NavItem active={currentView === 'USER_MANAGEMENT'} onClick={() => setCurrentView('USER_MANAGEMENT')} label="User Administration" icon={SidebarIcons.Users} />
              <NavItem active={currentView === 'WORKFLOW_CONFIG'} onClick={() => setCurrentView('WORKFLOW_CONFIG')} label="Workflow Config" icon={SidebarIcons.Settings} />
              <NavItem active={currentView === 'AUDIT_LOGS'} onClick={() => setCurrentView('AUDIT_LOGS')} label="System Audit Logs" icon={SidebarIcons.AuditLogs} />
            </>
          )}

          <div className="pt-6 mt-6 border-t border-white/5">
            <NavItem active={currentView === 'SEARCH_ARCHIVE'} onClick={() => setCurrentView('SEARCH_ARCHIVE')} label="Search Archive" icon={SidebarIcons.Search} />
          </div>
        </nav>

        {/* User Info Snippet in Sidebar */}
        <div className="p-6 bg-black/20 m-4 rounded-3xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-black text-sm">
              {user.full_name?.charAt(0) || user.username?.charAt(0) || '?'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate">{user.full_name || user.username}</p>
              <p className="text-[9px] font-bold text-blue-300 uppercase tracking-tighter opacity-70">{role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <Header user={user} onLogout={handleLogout} />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div >
  );
};
