
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const DATA_SUBMISSIONS = [
  { name: 'Jan', count: 45 },
  { name: 'Feb', count: 52 },
  { name: 'Mar', count: 38 },
  { name: 'Apr', count: 65 },
  { name: 'May', count: 48 },
];

const DATA_DEPARTMENTS = [
  { name: 'Engineering', time: 4.2 },
  { name: 'Planning', time: 7.5 },
  { name: 'Fire Safety', time: 2.1 },
  { name: 'Public Health', time: 3.8 },
];

const DATA_STATUS_PIE = [
  { name: 'Approved', value: 400, color: '#10B981' },
  { name: 'In Review', value: 300, color: '#3B82F6' },
  { name: 'Corrections', value: 200, color: '#F59E0B' },
  { name: 'Rejected', value: 100, color: '#EF4444' },
];

export const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Submissions</p>
          <p className="text-3xl font-bold text-slate-800">1,248</p>
          <p className="text-xs text-green-600 font-bold mt-2">↑ 12% vs last month</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Approval Time</p>
          <p className="text-3xl font-bold text-slate-800">14.5 Days</p>
          <p className="text-xs text-amber-600 font-bold mt-2">Target: 10 Days</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Reviews</p>
          <p className="text-3xl font-bold text-slate-800">342</p>
          <p className="text-xs text-blue-600 font-bold mt-2">24 pending payment</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Revenue Generated</p>
          <p className="text-3xl font-bold text-slate-800">$42.8k</p>
          <p className="text-xs text-slate-400 mt-2">Current Fiscal Year</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Submission Trends</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DATA_SUBMISSIONS}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#003366" strokeWidth={3} dot={{ r: 6, fill: '#003366' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Department Bottleneck Index (Days)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA_DEPARTMENTS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                <Tooltip />
                <Bar dataKey="time" fill="#800000" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
         <h3 className="text-lg font-bold text-slate-800 mb-6">Overall Portfolio Distribution</h3>
         <div className="flex flex-col md:flex-row items-center justify-around">
            <div className="h-[300px] w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DATA_STATUS_PIE}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {DATA_STATUS_PIE.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-8">
                {DATA_STATUS_PIE.map((d) => (
                   <div key={d.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">{d.name}</p>
                        <p className="text-xl font-bold text-slate-800">{d.value}</p>
                      </div>
                   </div>
                ))}
            </div>
         </div>
      </div>
    </div>
  );
};
