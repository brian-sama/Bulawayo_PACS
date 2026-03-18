
import React from 'react';

interface LandingPageProps {
    onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    return (
        <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-md border border-slate-100 overflow-hidden">
                        <img src="/logo.png" alt="BCC" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-[#003366] tracking-tighter leading-none">Bulawayo PACS</h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Plan Approval System</p>
                    </div>
                </div>
                <div className="hidden md:flex gap-8 text-sm font-bold text-[#003366] uppercase tracking-[0.2em]">
                    <a href="#workflow" className="hover:opacity-70 transition">Workflow</a>
                    <a href="#about" className="hover:opacity-70 transition">Council Info</a>
                </div>
                <button 
                    onClick={onGetStarted}
                    className="bg-[#003366] text-white px-6 py-2.5 rounded-full font-bold text-sm tracking-wide shadow-xl hover:bg-black transition transform active:scale-95"
                >
                    Login to Portal
                </button>
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen flex items-center overflow-hidden">
                <div className="absolute inset-0 z-0 scale-105 animate-slow-zoom">
                    <img 
                        src="/hero.png" 
                        alt="Hero" 
                        className="w-full h-full object-cover transition-opacity duration-1000"
                        onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                        style={{ opacity: 0 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#003366] via-[#003366]/60 to-transparent"></div>
                </div>

                <div className="container mx-auto px-12 relative z-10">
                    <div className="max-w-3xl space-y-8 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full border border-white/20">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Digital Municipal Transformation</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter">
                            Building a <br/> Modern <span className="text-blue-400">Bulawayo</span>.
                        </h1>
                        <p className="text-xl text-blue-100/80 font-medium max-w-xl leading-relaxed">
                            Bulawayo City Council's digital Plan Approval & Compliance System. 
                            Streamlining architectural reviews, automating workflows, and empowering developers 
                            to shape the future of our great city.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <button 
                                onClick={onGetStarted}
                                className="bg-white text-[#003366] px-10 py-4 rounded-2xl font-black text-lg tracking-tight shadow-2xl hover:bg-blue-50 transition transform hover:scale-105 active:scale-95"
                            >
                                Enter Portal
                            </button>
                            <button className="px-10 py-4 rounded-2xl font-black text-lg tracking-tight text-white border border-white/30 hover:bg-white/10 backdrop-blur transition">
                                Workflow Guide
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vertical Scroll Indicator */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-bounce-slow opacity-50">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Scroll</span>
                    <div className="w-0.5 h-12 bg-gradient-to-b from-white to-transparent"></div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="bg-slate-50 py-16 border-b border-slate-100 relative z-10">
                <div className="container mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
                    <div className="space-y-1">
                        <p className="text-4xl font-black text-[#003366]">100%</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Digital Submission</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-4xl font-black text-[#003366]">Live</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Status Tracking</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-4xl font-black text-[#003366]">Fast</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Validation Cycle</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-4xl font-black text-[#003366]">Secure</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Municipal Data</p>
                    </div>
                </div>
            </section>

            {/* Workflow Section */}
            <section id="workflow" className="py-24 bg-white relative z-10">
                <div className="container mx-auto px-12">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-6">
                            <h2 className="text-4xl font-black text-slate-800 tracking-tighter">A Simplified <span className="text-blue-600">5-Stage</span> Approval Process</h2>
                            <p className="text-lg text-slate-500 font-medium leading-relaxed">
                                Our refined workflow ensures maximum transparency and speed. From the moment you upload your preliminary plan to the final seal of approval.
                            </p>
                            
                            <div className="space-y-4 pt-6">
                                {[
                                    { step: '01', title: 'Preliminary Submission', desc: 'Upload your architectural floor plans and basic stand details.' },
                                    { step: '02', title: 'Reception Feedback', desc: 'BCC Reception reviews for financial compliance and issues a proforma.' },
                                    { step: '03', title: 'Full Documentation', desc: 'Applicant uploads all statutory documents (Deeds, Certificates, etc).' },
                                    { step: '04', title: 'Technical Review', desc: 'Concurrent review by Town Planning, Health, Fire, and Engineering.' },
                                    { step: '05', title: 'Final Approval', desc: 'Secure digital sign-off and issuance of approved plan documents.' },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-6 group hover:translate-x-2 transition-all duration-300">
                                        <span className="text-2xl font-black text-slate-200 group-hover:text-blue-400 transition-colors">{item.step}</span>
                                        <div className="pb-4 border-b border-slate-100 w-full">
                                            <h4 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.title}</h4>
                                            <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="aspect-square rounded-[3rem] bg-[#003366] overflow-hidden shadow-2xl relative">
                                <img src="/logo.png" alt="Process" className="w-full h-full object-contain opacity-20 p-24" />
                                <div className="absolute inset-0 flex items-center justify-center p-12">
                                    <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl border border-white/20 text-white space-y-4 shadow-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Live Integration</span>
                                        </div>
                                        <h3 className="text-3xl font-black leading-tight tracking-tight">Real-time status tracking for every applicant.</h3>
                                        <p className="text-sm text-blue-100/70 font-medium">Get instant notifications on department comments and validation status changes directly on your dashboard.</p>
                                    </div>
                                </div>
                            </div>
                            {/* Decorative element */}
                            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-blue-100 rounded-full -z-10 mix-blend-multiply filter blur-3xl opacity-50"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="about" className="bg-[#003366] text-white py-24 relative z-10">
                <div className="container mx-auto px-12 grid grid-cols-1 md:grid-cols-4 gap-16">
                    <div className="col-span-1 md:col-span-2 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-2xl">
                                <img src="/logo.png" alt="BCC" className="w-full h-full object-contain shrink-0" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tighter leading-none">City of Bulawayo</h1>
                                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">Plan Approval & Compliance System</p>
                            </div>
                        </div>
                        <p className="text-lg text-blue-100/60 max-w-sm font-medium">
                            Ensuring orderly spatial development and technical compliance for a safer, sustainable Bulawayo City.
                        </p>
                    </div>
                    
                    <div className="space-y-6">
                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-blue-400">Governance</h4>
                        <ul className="space-y-4 text-sm font-bold text-blue-100/70">
                            <li><a href="#" className="hover:text-white transition">Town Planning Docs</a></li>
                            <li><a href="#" className="hover:text-white transition">City By-Laws</a></li>
                            <li><a href="#" className="hover:text-white transition">Fee Schedules</a></li>
                            <li><a href="#" className="hover:text-white transition">Municipal Reports</a></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-blue-400">Headquarters</h4>
                        <p className="text-sm font-bold text-blue-100/70 leading-relaxed">
                            Tower Block, Robert Mugabe Way <br/>
                            City Hall Premises <br/>
                            Bulawayo, Zimbabwe
                        </p>
                        <p className="text-sm font-bold text-blue-100/70 mt-4">
                            Tel: +263 (9) 75011 <br/>
                            pacs.support@cityofbulawayo.co.zw
                        </p>
                    </div>
                </div>
                
                <div className="container mx-auto px-12 mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                    <p>© 2026 Bulawayo City Council. SI YE PAMBILI.</p>
                    <div className="flex gap-8">
                        <a href="#">Security</a>
                        <a href="#">Terms</a>
                        <a href="#">Manual</a>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes slow-zoom {
                    from { transform: scale(1); }
                    to { transform: scale(1.1); }
                }
                .animate-slow-zoom {
                    animation: slow-zoom 30s linear infinite alternate;
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0) translateX(-50%); }
                    50% { transform: translateY(-10px) translateX(-50%); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};
