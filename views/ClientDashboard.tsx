
import React from 'react';
import { MOCK_PLANS, COLORS } from '../constants';
import { StatusBadge } from '../components/StatusBadge';
import { Plan } from '../types';

interface ClientDashboardProps {
  onViewPlan: (plan: Plan) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onViewPlan }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back, Architect</h1>
          <p className="text-slate-500">Track your current submissions for Bulawayo City Council.</p>
        </div>
        <button className="bg-[#003366] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#002244] transition shadow-md">
          + Submit New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_PLANS.map((plan) => (
          <div 
            key={plan.id} 
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition cursor-pointer"
            onClick={() => onViewPlan(plan)}
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{plan.id}</span>
                <StatusBadge status={plan.status} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 truncate">{plan.propertyAddress}</h3>
              <p className="text-sm text-slate-500 mb-4">{plan.category} • Stand {plan.standNumber}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Department Progress</span>
                  <span>{plan.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${plan.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-400">Updated: {plan.lastUpdate}</span>
              <button className="text-sm font-bold text-blue-800 hover:underline">View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
