import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const DATA_SUBMISSIONS: any[] = [];
const DATA_CATEGORIES: any[] = [];

const KPI_STYLE = "bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden relative group";

export const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 🏛️ Executive Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={KPI_STYLE}>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Asset Value</p>
            <h3 className="text-4xl font-black text-[#003366] tracking-tighter">$0.00</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-1 bg-slate-50 text-slate-400 rounded-lg">0%</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Growth vs Q4</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
          </div>
        </div>

        <div className={KPI_STYLE}>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Circulation Time</p>
            <h3 className="text-4xl font-black text-slate-800 tracking-tighter">0.0<span className="text-xl text-slate-300 ml-1">Days</span></h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-1 bg-slate-50 text-slate-400 rounded-lg">N/A</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Efficiency index</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
          </div>
        </div>

        <div className={KPI_STYLE}>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Approval Yield</p>
            <h3 className="text-4xl font-black text-slate-800 tracking-tighter">0.0%</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-1 bg-slate-50 text-slate-400 rounded-lg">0%</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Correction rate</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
          </div>
        </div>

        <div className={KPI_STYLE}>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Submissions</p>
            <h3 className="text-4xl font-black text-slate-800 tracking-tighter">0</h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-1 bg-slate-50 text-slate-400 rounded-lg">0</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Active Fiscal</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📊 High-Intensity Submission Trend */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <h3 className="text-xl font-black text-[#003366] tracking-tight">Submission Dynamics</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Real-time analysis of building plan volume.</p>
            </div>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1 border border-slate-100">
              <button className="px-5 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm text-blue-600 transition-all">Monthly</button>
              <button className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Weekly</button>
            </div>
          </div>

          <div className="h-[250px] relative z-10 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Submission Data Available</p>
          </div>
        </div>

        {/* 🗺️ Geographic Distribution (GIS Overlay Placeholder) */}
        <div className="bg-[#003366] p-8 rounded-[2rem] text-white overflow-hidden relative group">
          <div className="relative z-10">
            <h3 className="text-lg font-black mb-1">Geo-Spatial Hotspots</h3>
            <p className="text-xs text-blue-200/60 font-medium leading-relaxed mb-10">Areas with the highest concentration of new development applications.</p>

            <div className="space-y-4 flex flex-col items-center justify-center py-10 opacity-30">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">No Hotspot Data Available</p>
            </div>

            <button className="w-full mt-12 bg-white/10 hover:bg-white/20 border border-white/20 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Launch Advanced GIS Map</button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        </div>
      </div>

      {/* 🥧 Category Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center lg:flex-row lg:justify-between h-full">
          <div className="lg:w-1/2">
            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight uppercase mb-1">Category Saturation</h3>
            <p className="text-[10px] font-medium text-slate-400 mb-6 max-w-[200px]">Market segmentation by classification.</p>
            <div className="grid grid-cols-1 gap-4">
              {DATA_CATEGORIES.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }}></div>
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{c.name}</span>
                  <span className="text-xs font-black text-slate-300 ml-auto">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[280px] min-h-[280px] w-full lg:w-1/2 relative bg-slate-50/30 rounded-full flex items-center justify-center">
            <ResponsiveContainer width="99%" height="99%">
              <PieChart>
                <Pie
                  data={DATA_CATEGORIES.length > 0 ? DATA_CATEGORIES : [{ name: 'No Data', value: 1, color: '#f1f5f9' }]}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {DATA_CATEGORIES.length > 0 ? DATA_CATEGORIES.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  )) : <Cell fill="#f1f5f9" />}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '15px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {DATA_CATEGORIES.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Metadata</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden relative">
          <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight uppercase mb-2">Audit Performance</h3>
          <p className="text-xs font-medium text-slate-400 mb-8">Departmental throughput vs. SLA benchmarks.</p>

          <div className="space-y-4 flex flex-col items-center justify-center py-10 opacity-30">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Audit Records Available</p>
          </div>

          <div className="mt-10 p-4 bg-[#0F172A] rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest leading-none mb-1">System Health</p>
              <p className="text-xs font-bold text-white">99.8% Online Architecture</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
