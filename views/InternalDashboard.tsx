
import React, { useState, useEffect } from 'react';
import { Plan, UserProfile } from '../types';
import * as api from '../services/api';
import { usePolling } from '../hooks/usePolling';

interface InternalDashboardProps {
    user: UserProfile;
    onViewPlan: (plan: Plan) => void;
    onNavigate: (view: any) => void;
}

const KPICard: React.FC<{ title: string; value: string | number; subValue: string; icon: string; color: string }> = ({ title, value, subValue, icon, color }) => (
    <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-500 group">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl group-hover:scale-110 transition-transform ${color}`}>
            {icon}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{value}</h3>
            <span className="text-[9px] font-bold text-slate-300">TOTAL</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">{subValue}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">This Week</span>
        </div>
    </div>
);

export const InternalDashboard: React.FC<InternalDashboardProps> = ({ user, onViewPlan, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'PRIORITY' | 'RECENT'>('PRIORITY');
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPlans = async () => {
        try {
            const data = await api.getPlans();
            const sorted = [...data].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setPlans(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    usePolling(fetchPlans, 10000);

    // Logic to filter plans relevant to the staff member's department
    const isReceptionist = user.role === 'RECEPTION';

    const urgentPlans = plans.filter(p => {
        if (isReceptionist) {
            return ['SUBMITTED', 'PRE_SCREENING', 'PRELIMINARY_SUBMITTED', 'PROFORMA_ISSUED', 'PAID', 'DOCUMENTS_PENDING_VERIFICATION'].includes(p.status);
        }
        return p.status === 'IN_REVIEW' || p.status === 'UNDER_REVIEW' || p.status === 'REVIEW_POOL';
    });

    const today = new Date().toISOString().split('T')[0];
    const reviewsToday = plans.filter(p => p.lastUpdate && p.lastUpdate.startsWith(today)).length;
    const approvals = plans.filter(p => p.status === 'APPROVED').length;
    const complianceRate = plans.length > 0 ? Math.round((approvals / plans.length) * 100) : 0;

    // Specific stats for receptionist
    const pendingPreScreen = plans.filter(p => ['SUBMITTED', 'PRE_SCREENING', 'PRELIMINARY_SUBMITTED'].includes(p.status)).length;
    const awaitingPayment = plans.filter(p => p.status === 'PROFORMA_ISSUED').length;
    const readyToReview = plans.filter(p => p.status === 'PAID').length;

    const recentPlans = [...plans].slice(0, 5); // Already sorted
    const displayPlans = activeTab === 'PRIORITY' ? urgentPlans : recentPlans;

    if (loading) {
        return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">Loading Dashboard...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 🚀 Strategic KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title={isReceptionist ? "Pending Pre-Screen" : "Personal Queue"}
                    value={isReceptionist ? pendingPreScreen : urgentPlans.length}
                    subValue={isReceptionist ? "NEW SUBMISSIONS" : `${urgentPlans.filter(p => p.lastUpdate && p.lastUpdate.startsWith(today)).length} NEW`}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    }
                    color="bg-blue-50 text-blue-600"
                />
                <KPICard
                    title={isReceptionist ? "Awaiting Payment" : "Today's Active"}
                    value={isReceptionist ? awaitingPayment : reviewsToday}
                    subValue={isReceptionist ? "ISSUED INVOICES" : "REVIEWS"}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isReceptionist ? "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                        </svg>
                    }
                    color="bg-amber-50 text-amber-600"
                />
                <KPICard
                    title={isReceptionist ? "Verified Ready" : "Compliance Rate"}
                    value={isReceptionist ? readyToReview : `${complianceRate}%`}
                    subValue={isReceptionist ? "TO REVIEW" : "PASSED"}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isReceptionist ? "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" : "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"} />
                        </svg>
                    }
                    color="bg-emerald-50 text-emerald-600"
                />
                <KPICard
                    title="Approvals"
                    value={approvals}
                    subValue="V1/V2"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    }
                    color="bg-indigo-50 text-indigo-600"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* 📑 Plan Management Workspace */}
                <div className="xl:col-span-3 space-y-4">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-2xl font-black text-[#003366] tracking-tight">Active Workspace</h2>
                            <p className="text-sm font-medium text-slate-400 mt-1">Manage architectural submissions in your department's queue.</p>
                        </div>
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                            <button
                                onClick={() => setActiveTab('PRIORITY')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'PRIORITY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {isReceptionist ? 'Action Queue' : user.role === 'DEPT_HEAD' ? 'Approval Queue' : 'Review Queue'}
                            </button>
                            <button
                                onClick={() => setActiveTab('RECENT')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'RECENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                History
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {displayPlans.map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => onViewPlan(plan)}
                                className="group bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all duration-300 cursor-pointer flex items-center gap-4"
                            >
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{plan.plan_id}</span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${plan.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {plan.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors uppercase">{plan.stand_addr}</h4>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9m4.243-4.243a8 8 0 11-11.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {plan.category}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">👤 Architect Ref: {plan.architect || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <button className="bg-[#003366] text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">Open Review</button>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Due in 2 Days</span>
                                </div>
                            </div>
                        ))}
                        {displayPlans.length === 0 && (
                            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No active plans in queue</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 📢 Quick Actions & Departmental Status */}
                <div className="space-y-8">
                    <div className="bg-[#003366] p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-lg font-black mb-1">Technical Summary</h3>
                            <p className="text-[11px] text-blue-200/60 font-medium leading-relaxed mb-4">Starting fresh for the new period.</p>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Target Met</span>
                                    <span className="text-2xl font-black tabular-nums">0%</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Reviews Today</span>
                                    <span className="text-2xl font-black tabular-nums">0</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onNavigate(isReceptionist ? 'RECEPTION' : 'REVIEWS')}
                                className="w-full mt-8 bg-white/10 hover:bg-white/20 border border-white/20 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                {isReceptionist ? 'Go to Reception Gateway' : 'Go to Review Pool'}
                            </button>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4">Upcoming Deadlines</h3>
                        <div className="space-y-4">
                            {plans.filter(p => {
                                if (!p.date_submitted) return false;
                                const deadline = new Date(p.date_submitted);
                                deadline.setDate(deadline.getDate() + 21);
                                const today = new Date();
                                const diff = (deadline.getTime() - today.getTime()) / (1000 * 3600 * 24);
                                return diff > 0 && diff < 5 && p.status !== 'APPROVED';
                            }).slice(0, 3).map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                    <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-xs font-black">!</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-800 truncate uppercase">{p.plan_id}</p>
                                        <p className="text-[8px] font-bold text-red-600 uppercase tracking-tighter">SLA Breach in {Math.ceil((new Date(p.date_submitted!).getTime() + 21 * 24 * 60 * 60 * 1000 - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days</p>
                                    </div>
                                    <button onClick={() => onViewPlan(p)} className="text-[9px] font-black text-slate-400 hover:text-red-600">VIEW</button>
                                </div>
                            ))}
                            {plans.filter(p => {
                                if (!p.date_submitted) return false;
                                const deadline = new Date(p.date_submitted);
                                deadline.setDate(deadline.getDate() + 21);
                                const today = new Date();
                                const diff = (deadline.getTime() - today.getTime()) / (1000 * 3600 * 24);
                                return diff > 0 && diff < 5 && p.status !== 'APPROVED';
                            }).length === 0 && (
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">No upcoming deadlines</p>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
