
import React, { useState, useEffect } from 'react';
import { Plan, UserProfile } from '../types';
import * as api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface ReviewPoolProps {
    user: UserProfile;
    onViewPlan: (plan: Plan) => void;
}

export const ReviewPool: React.FC<ReviewPoolProps> = ({ user, onViewPlan }) => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            // Filter plans that are in the review pipeline
            const pool = sorted.filter(p =>
                p.status === 'REVIEW_POOL' ||
                p.status === 'IN_REVIEW' ||
                p.status === 'UNDER_REVIEW'
            );
            setPlans(pool);
        } catch (error) {
            console.error("Failed to load review pool:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPlans = plans.filter(p =>
        p.plan_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.stand_addr.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-[#003366] tracking-tight uppercase">Technical Review Pool</h1>
                    <p className="text-sm font-medium text-slate-400 mt-1">Select a submission to begin your department's technical evaluation.</p>
                </div>
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Search queue..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm w-80 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <svg className="w-5 h-5 absolute left-3 top-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan ID</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Address</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">Loading queue...</td>
                            </tr>
                        ) : filteredPlans.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">No plans pending review</td>
                            </tr>
                        ) : (
                            filteredPlans.map((plan) => (
                                <tr key={plan.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-black text-blue-600 tracking-wider uppercase">{plan.plan_id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-slate-700">{plan.stand_addr}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">{plan.category}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={plan.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => onViewPlan(plan)}
                                            className="px-4 py-2 bg-[#003366] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all shadow-sm active:scale-95"
                                        >
                                            Start Review
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
