
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import * as api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useState } from 'react';

const SYSTEM_HEALTH = [
    { time: '08:00', load: 12, users: 45 },
    { time: '09:00', load: 45, users: 120 },
    { time: '10:00', load: 78, users: 210 },
    { time: '11:00', load: 65, users: 198 },
    { time: '12:00', load: 34, users: 154 },
    { time: '13:00', load: 42, users: 167 },
    { time: '14:00', load: 56, users: 189 },
];

const STORAGE_METRIC = [
    { name: 'Docs', size: 450 },
    { name: 'Temp', size: 120 },
    { name: 'Logs', size: 85 },
    { name: 'Database', size: 210 },
];

const MetricCard: React.FC<{ label: string; value: string; subValue: string; color: 'blue' | 'green' | 'red' | 'amber' }> = ({ label, value, subValue, color }) => {
    const colors = {
        blue: 'from-blue-500 to-indigo-600 shadow-blue-100',
        green: 'from-emerald-500 to-teal-600 shadow-emerald-100',
        red: 'from-rose-500 to-red-600 shadow-rose-100',
        amber: 'from-amber-500 to-orange-600 shadow-amber-100'
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${colors[color]} flex items-center justify-center text-white shadow-lg`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
            </div>
            <h3 className="text-3xl font-black text-slate-800 leading-none">{value}</h3>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-tighter">{subValue}</p>
        </div>
    );
};

export const ITDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        activeUsers: 0,
        plansCount: 0,
        loading: true
    });

    const fetchSystemStats = async () => {
        try {
            const [users, plans] = await Promise.all([
                api.getUsers(),
                api.getPlans()
            ]);
            setStats({
                activeUsers: users.length,
                plansCount: plans.length,
                loading: false
            });
        } catch (e) {
            console.error('Failed to fetch system stats', e);
        }
    };

    usePolling(fetchSystemStats, 10000);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">System Governance</h1>
                    <p className="text-slate-500 font-medium">BCC PACS Infrastructure & Monitoring</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:shadow-lg transition-all flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        System Operational
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard label="System Users" value={String(stats.activeUsers)} subValue="REGISTERED ACCOUNTS" color="blue" />
                <MetricCard label="Total Plans" value={String(stats.plansCount)} subValue="IN DATABASE" color="amber" />
                <MetricCard label="System Speed" value="Fast" subValue="99.9% Uptime" color="green" />
                <MetricCard label="Security" value="Secure" subValue="No issues detected" color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">System Usage</h3>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase">Live Feed</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={SYSTEM_HEALTH}>
                                <defs>
                                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '15px' }}
                                />
                                <Area type="monotone" dataKey="load" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorLoad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight mb-8 text-center text-sm">Data Breakdown</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={STORAGE_METRIC} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="size" fill="#0f172a" radius={[0, 10, 10, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observation</p>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">BCC PDF files are growing at 14GB/month. Consider moving plans older than 5 years to deep storage to save space.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
