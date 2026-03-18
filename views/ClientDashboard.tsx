
import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants';
import { StatusBadge } from '../components/StatusBadge';
import { Plan } from '../types';
import { SubmissionWizard } from './SubmissionWizard';
import { ClientResponseView } from './ClientResponseView';
import * as api from '../services/api';

interface ClientDashboardProps {
  onViewPlan: (plan: Plan) => void;
}

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${progress}%`;
    }
  }, [progress]);
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div
        ref={ref}
        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
      />
    </div>
  );
};

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onViewPlan }) => {
  const [showWizard, setShowWizard] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingPlan, setRespondingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getPlans();
      // Sort by latest first (created_at descending)
      const sorted = [...data].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPlans(sorted);
    } catch (error) {
      console.error("Failed to load plans:", error);
    } finally {
      setLoading(false);
    }
  };

  // Status Summary Logic
  const drafts = plans.filter(p => p.status === 'DRAFT').length;
  const actionRequired = plans.filter(p => p.status === 'CORRECTIONS_REQUIRED').length;
  const approved = plans.filter(p => p.status === 'APPROVED').length;

  const filteredPlans = filter
    ? plans.filter(p => {
      if (filter === 'DRAFT') return p.status === 'DRAFT';
      if (filter === 'ACTION') return p.status === 'CORRECTIONS_REQUIRED';
      if (filter === 'APPROVED') return p.status === 'APPROVED';
      return true;
    })
    : plans;
  if (showWizard) {
    return (
      <SubmissionWizard
        onCancel={() => setShowWizard(false)}
        onSuccess={() => {
          setShowWizard(false);
          loadPlans();
        }}
      />
    );
  }

  if (respondingPlan) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ClientResponseView
          plan={respondingPlan}
          onCancel={() => setRespondingPlan(null)}
          onSuccess={() => {
            setRespondingPlan(null);
            loadPlans();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Universal Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-[#003366] tracking-tight">My Building Plans</h1>
          <p className="text-sm font-medium mt-1 text-slate-500">Easily manage your applications.</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="relative z-10 bg-[#003366] text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-black transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 group text-sm"
        >
          <span className="text-lg group-hover:rotate-90 transition-transform duration-300">+</span>
          Start New Application
        </button>
      </div>

      {/* 2. Interactive KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter(filter === 'DRAFT' ? null : 'DRAFT')}
          className={`text-left transition-all duration-300 p-6 rounded-3xl border flex flex-col group ${filter === 'DRAFT' ? 'bg-[#003366] border-[#003366] shadow-lg text-white scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md text-slate-800'}`}        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl transition-colors ${filter === 'DRAFT' ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <span className={`font-black text-[9px] uppercase tracking-[0.2em] mb-1 ${filter === 'DRAFT' ? 'text-blue-200' : 'text-slate-400'}`}>Not Submitted</span>
          <span className="text-3xl font-black tabular-nums tracking-tighter">{drafts}</span>
        </button>

        <button
          onClick={() => setFilter(filter === 'ACTION' ? null : 'ACTION')}
          className={`text-left transition-all duration-300 p-6 rounded-3xl border flex flex-col group ${filter === 'ACTION' ? 'bg-amber-600 border-amber-600 shadow-lg text-white scale-[1.02]' : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-md text-slate-800'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl transition-colors ${filter === 'ACTION' ? 'bg-white/10 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className={`font-black text-[9px] uppercase tracking-[0.2em] mb-1 ${filter === 'ACTION' ? 'text-amber-200' : 'text-slate-400'}`}>Needs Attention</span>
          <span className="text-3xl font-black tabular-nums tracking-tighter">{actionRequired}</span>
        </button>

        <button
          onClick={() => setFilter(filter === 'APPROVED' ? null : 'APPROVED')}
          className={`text-left transition-all duration-300 p-6 rounded-3xl border flex flex-col group ${filter === 'APPROVED' ? 'bg-green-600 border-green-600 shadow-lg text-white scale-[1.02]' : 'bg-white border-slate-100 hover:border-green-200 hover:shadow-md text-slate-800'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl transition-colors ${filter === 'APPROVED' ? 'bg-white/10 text-white' : 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className={`font-black text-[9px] uppercase tracking-[0.2em] mb-1 ${filter === 'APPROVED' ? 'text-green-200' : 'text-slate-400'}`}>Approved Plans</span>
          <span className="text-3xl font-black tabular-nums tracking-tighter">{approved}</span>
        </button>
      </div>

      {/* 3. The Interactive Data Grid / List */}
      <div>
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-xl font-black text-[#003366] flex items-center gap-3">
            {filter ? `Filtered Applications (${filter})` : 'My Recent Applications'}
            <span className="font-medium text-slate-300 text-sm">/ {filteredPlans.length} Total</span>
          </h2>
          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest border-b-2 border-blue-600/20 pb-0.5"
            >
              Clear Filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="group bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-500 cursor-pointer hover:translate-y-[-4px] flex flex-col"
                onClick={() => {
                  if (plan.status === 'PROFORMA_ISSUED') {
                    setRespondingPlan(plan);
                  } else {
                    onViewPlan(plan);
                  }
                }}
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-slate-50 px-3 py-1 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      #{plan.plan_id.split('-').pop()}
                    </div>
                    <StatusBadge status={plan.status} />
                  </div>

                  <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors uppercase leading-tight">
                    {plan.stand_addr.split(',')[0]}
                    <span className="block text-xs font-medium text-slate-400 capitalize mt-1 italic">{plan.stand_addr.split(',')[1] || 'Main District'}</span>
                  </h3>

                  <div className="flex items-center gap-2 mb-8 mt-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">{plan.category}</span>
                    <div className="h-1 w-1 rounded-full bg-slate-200"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Submission v1</span>
                  </div>

                  {/* Micro-Stepper Visual */}
                  <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-2">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Process flow</span>
                      <span className="text-[11px] font-black text-slate-800 tracking-tighter">{plan.progress}%</span>
                    </div>
                    <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-[#003366] rounded-full transition-all duration-1000" style={{ width: `${plan.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.05em]">
                      <span className={plan.progress >= 20 ? 'text-blue-600' : ''}>Reception</span>
                      <span className={plan.progress >= 60 ? 'text-blue-600' : ''}>Review</span>
                      <span className={plan.progress >= 90 ? 'text-blue-600' : ''}>Seal</span>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center group-hover:bg-slate-50/80 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Last Update</span>
                    <span className="text-xs font-black text-slate-600 leading-none">{plan.lastUpdate}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-[#003366] group-hover:text-white group-hover:border-[#003366] transition-all shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}

            {filteredPlans.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="text-4xl mb-3 opacity-20 flex justify-center text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-black text-slate-300 uppercase tracking-widest">No plans found in this category</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium italic">Try clearing your filters or starting a new application.</p>
                <button
                  onClick={() => setFilter(null)}
                  className="mt-6 text-blue-600 font-black text-xs uppercase tracking-widest"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
