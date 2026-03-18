import React, { useState, useEffect } from 'react';
import { Plan, UserProfile } from '../types';
import * as api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface SearchArchiveProps {
    user: UserProfile;
    onViewPlan: (plan: Plan) => void;
}

const SearchArchive: React.FC<SearchArchiveProps> = ({ user, onViewPlan }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [plans, setPlans] = useState<Plan[]>([]);
    const [results, setResults] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = user.role === 'ADMIN';

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await api.getPlans();
            setPlans(data);
            setResults(data);
        } catch (error) {
            console.error("Failed to load plans:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        const filtered = plans.filter(plan =>
            plan.plan_id.toLowerCase().includes(term) ||
            plan.stand_addr.toLowerCase().includes(term) ||
            (plan.client_name && plan.client_name.toLowerCase().includes(term)) ||
            (plan.architect && plan.architect.name && plan.architect.name.toLowerCase().includes(term))
        );
        setResults(filtered);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Plan Archives</h1>
                        <p className="text-slate-500 mb-6">Search history of all submitted plans and properties.</p>
                    </div>
                    {isAdmin && (
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase border border-amber-100">
                            View Only Mode
                        </span>
                    )}
                </div>

                <div className="relative max-w-2xl">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input
                        type="text"
                        placeholder="Search by Plan ID, Stand Number, or Architect name..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-slate-700">Search Results</h2>
                    <span className="text-sm text-slate-400 font-medium">{results.length} records found</span>
                </div>

                <div className="divide-y divide-slate-100">
                    {results.length > 0 ? (
                        results.map(plan => (
                            <div key={plan.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                        {plan.category.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 group-hover:text-[#003366] transition-colors">{plan.plan_id}</h3>
                                        <p className="text-sm text-slate-500">{plan.stand_addr}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Submitted By</p>
                                        <p className="text-sm font-medium text-slate-700">{plan.client_name}</p>
                                    </div>
                                    <StatusBadge status={plan.status} />
                                    {isAdmin ? (
                                        <button className="text-slate-300 cursor-not-allowed" title="Details view restricted to staff" disabled>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onViewPlan(plan)}
                                            className="text-slate-400 hover:text-[#003366]"
                                            title="View Plan Details"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-slate-400">
                            No plans found matching your search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchArchive;
