
import { Plan, PlanStatusValues } from './types';

export const COLORS = {
  primary: '#003366',
  accent: '#800000',
  bg: '#F3F4F6',
  status: {
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
    SUBMITTED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    PRE_SCREENING: 'bg-purple-100 text-purple-700 border-purple-200',
    PRELIMINARY_SUBMITTED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    PROFORMA_ISSUED: 'bg-amber-100 text-amber-700 border-amber-200',
    PAYMENT_PENDING: 'bg-orange-100 text-orange-700 border-orange-200',
    PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    DOCUMENTS_PENDING_VERIFICATION: 'bg-violet-100 text-violet-700 border-violet-200',
    VERIFIED_BY_RECEPTION: 'bg-teal-100 text-teal-700 border-teal-200',
    FINAL_SUBMITTED: 'bg-sky-100 text-sky-700 border-sky-200',
    REVIEW_POOL: 'bg-blue-100 text-blue-700 border-blue-200',
    IN_REVIEW: 'bg-sky-100 text-sky-700 border-sky-200',
    UNDER_REVIEW: 'bg-sky-100 text-sky-700 border-sky-200',
    CORRECTIONS_REQUIRED: 'bg-amber-100 text-amber-700 border-amber-200',
    AWAITING_FINAL_DECISION: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    APPROVED: 'bg-green-100 text-green-700 border-green-200',
    REJECTED_PRE_SCREEN: 'bg-rose-100 text-rose-700 border-rose-200'
  }
};

export const MOCK_PLANS: Plan[] = [];
