import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { ApiAuditLog } from '../services/api';

export const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<ApiAuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await api.getAuditLogs();
            setLogs(data);
        } catch (error) {
            console.error("Failed to load audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (logs.length === 0) return;
        const headers = ["Time", "User", "Action", "Details"];
        const rows = logs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.user_name,
            log.action,
            `${log.target_model} ${log.target_id}`
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `audit_log_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Audit Logs</h1>
                    <p className="text-slate-500">Immutable security trace of all user activities.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
                >
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
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">Loading logs...</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="grid grid-cols-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                                <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                                <span className="font-bold text-blue-600">@{log.user_name}</span>
                                <span className="font-bold text-slate-700">{log.action}</span>
                                <span className="text-slate-500">{log.target_model} {log.target_id}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

