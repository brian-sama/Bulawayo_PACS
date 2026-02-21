
import React from 'react';

const MOCK_LOGS = [
    { id: 1, user: 'admin', action: 'Login', detail: 'IP: 192.168.1.100', time: '2026-02-20 08:24' },
    { id: 2, user: 'j.reception', action: 'Upload Plan', detail: 'BCC-2026-0034', time: '2026-02-20 08:21' },
    { id: 3, user: 'b.inspector', action: 'Approve Plan', detail: 'BCC-2026-0012', time: '2026-02-20 08:15' },
    { id: 4, user: 'guest_arch', action: 'Check Status', detail: 'BCC-2025-0811', time: '2026-02-20 08:05' },
    { id: 5, user: 'admin', action: 'Reset Password', detail: 'User ID: #78', time: '2026-02-20 07:50' },
];

export const AuditLogs: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Audit Logs</h1>
                    <p className="text-slate-500">Immutable security trace of all user activities.</p>
                </div>
                <button className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
                    Export CSV
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-mono text-[11px]">
                <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-100 px-6 py-3 font-black text-slate-400 uppercase tracking-widest">
                    <span>Time</span>
                    <span>User</span>
                    <span>Action</span>
                    <span>Details</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {MOCK_LOGS.map(log => (
                        <div key={log.id} className="grid grid-cols-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                            <span className="text-slate-500">{log.time}</span>
                            <span className="font-bold text-blue-600">@{log.user}</span>
                            <span className="font-bold text-slate-700">{log.action}</span>
                            <span className="text-slate-500">{log.detail}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
