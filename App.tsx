
import React, { useState } from 'react';
import { UserRole, Plan, PlanStatusValues, UserProfile } from './types';
import { Header } from './components/Header';
import { ClientDashboard } from './views/ClientDashboard';
import { ReviewInterface } from './views/ReviewInterface';
import { AnalyticsDashboard } from './views/AnalyticsDashboard';
import { LoginView } from './views/LoginView';
import { UserManagement } from './views/UserManagement';
import { MOCK_PLANS } from './constants';
import { logout } from './services/api';

const NavItem: React.FC<{ icon: string; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition text-sm font-medium ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
    </svg>
    {label}
  </button>
);

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'REVIEWS' | 'PLAN_DETAILS' | 'ANALYTICS' | 'USER_MANAGEMENT'>('DASHBOARD');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const role = user?.role;

  const handleViewPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setCurrentView('PLAN_DETAILS');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return role === 'CLIENT' ? <ClientDashboard onViewPlan={handleViewPlan} /> : (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Review Pool Ready</h2>
            <p className="text-slate-500 max-w-sm mt-2">Select "Review Pool" from the sidebar to start processing architectural submissions.</p>
          </div>
        );
      case 'PLAN_DETAILS':
        return selectedPlan ? (
          <ReviewInterface plan={selectedPlan} onBack={() => setCurrentView('DASHBOARD')} />
        ) : null;
      case 'ANALYTICS':
        return <AnalyticsDashboard />;
      case 'USER_MANAGEMENT':
        return <UserManagement />;
      case 'REVIEWS':
        // ... (existing REVIEWS case)
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Internal Review Pool</h1>
              <div className="flex gap-2">
                <input type="text" placeholder="Search by Plan ID..." className="px-4 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button className="bg-white border px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Filters</button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plan ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MOCK_PLANS.map(plan => (
                    <tr key={plan.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-bold text-slate-800">{plan.id}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{plan.propertyAddress}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${plan.status === 'IN_REVIEW' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 bg-slate-100'}`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewPlan(plan)}
                          className="text-blue-800 font-bold text-sm hover:underline"
                        >
                          Open Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return <div>View not implemented</div>;
    }
  };

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <aside className="w-64 bg-[#003366] text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden shrink-0 border border-white/20">
            <img src="/logo.png" alt="BCC Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold tracking-tight text-xl leading-tight">BCC Portal</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem active={currentView === 'DASHBOARD'} onClick={() => setCurrentView('DASHBOARD')} label="Dashboard" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          {role !== 'CLIENT' && <NavItem active={currentView === 'REVIEWS'} onClick={() => setCurrentView('REVIEWS')} label="Review Pool" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />}
          {(role === 'STAFF' || role === 'ADMIN' || role === 'EXECUTIVE') && <NavItem active={currentView === 'ANALYTICS'} onClick={() => setCurrentView('ANALYTICS')} label="Analytics" icon="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />}
          {role === 'ADMIN' && <NavItem active={currentView === 'USER_MANAGEMENT'} onClick={() => setCurrentView('USER_MANAGEMENT')} label="User Management" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
          <NavItem label="Search Plans" icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          <NavItem label="My Submissions" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <Header user={user} onLogout={() => { logout(); setUser(null); }} />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};
