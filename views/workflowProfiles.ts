import { DepartmentReview } from '../types';

export type WorkflowKind =
    | 'OWNERSHIP'
    | 'LEASE'
    | 'EVALUATION'
    | 'FINANCIAL'
    | 'BUILDING_CONTROL'
    | 'WATER_SANITATION'
    | 'FIRE'
    | 'EXTERNAL'
    | 'TECHNICAL';

export type ReviewVote = 'APPROVED' | 'CORRECTIONS_REQUIRED' | 'REJECTED';

export interface VerdictOption {
    value: ReviewVote;
    label: string;
    description: string;
}

export interface WorkflowProfile {
    kind: WorkflowKind;
    title: string;
    queueTitle: string;
    dashboardTitle: string;
    stageLabel: string;
    focus: string;
    accent: string;
    softAccent: string;
    actionTitle: string;
    remarksLabel: string;
    checklists: string[];
    verdicts: VerdictOption[];
    requiresAmount?: boolean;
}

const normalize = (value?: string | null) =>
    (value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

export const getWorkflowKind = (departmentName?: string | null): WorkflowKind => {
    const name = normalize(departmentName);

    if (name.includes('housing') || name.includes('community')) return 'OWNERSHIP';
    if (name.includes('estate') || name.includes('lease')) return 'LEASE';
    if (name.includes('evaluation') || name.includes('valuation')) return 'EVALUATION';
    if (name.includes('financial') || name.includes('finance') || name.includes('treasury')) return 'FINANCIAL';
    if (name.includes('building') || name.includes('inspection') || name.includes('structural')) return 'BUILDING_CONTROL';
    if (name.includes('water') || name.includes('sanitation') || name.includes('sewer')) return 'WATER_SANITATION';
    if (name.includes('fire')) return 'FIRE';
    if (name.includes('trade') || name.includes('works') || name.includes('nssa') || name.includes('zesa')) return 'EXTERNAL';

    return 'TECHNICAL';
};

export const WORKFLOW_PROFILES: Record<WorkflowKind, WorkflowProfile> = {
    OWNERSHIP: {
        kind: 'OWNERSHIP',
        title: 'Ownership Verification Workspace',
        queueTitle: 'Ownership Verification Queue',
        dashboardTitle: 'Ownership Gatekeeper Dashboard',
        stageLabel: 'Ownership Check',
        focus: 'Confirm owner legitimacy, applicant authority, and any ownership dispute risk before the plan advances.',
        accent: 'bg-indigo-700 text-white',
        softAccent: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        actionTitle: 'Ownership Decision',
        remarksLabel: 'Ownership Findings',
        checklists: [
            'Applicant matches council ownership record',
            'Power of attorney supports representative applications',
            'No unresolved occupancy or ownership dispute is visible',
            'Owner names are consistent across uploaded documents',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Verified', description: 'Ownership or authority is accepted.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Further Documentation Required', description: 'Applicant must clarify authority or ownership.' },
            { value: 'REJECTED', label: 'Rejected Ownership', description: 'Application cannot proceed on ownership grounds.' },
        ],
    },
    LEASE: {
        kind: 'LEASE',
        title: 'Lease Verification Workspace',
        queueTitle: 'Lease Verification Queue',
        dashboardTitle: 'Lease Gatekeeper Dashboard',
        stageLabel: 'Lease Check',
        focus: 'Verify lease validity, expiry, land-use conditions, and council land record alignment.',
        accent: 'bg-rose-700 text-white',
        softAccent: 'bg-rose-50 text-rose-700 border-rose-100',
        actionTitle: 'Lease Decision',
        remarksLabel: 'Lease Findings',
        checklists: [
            'Lease exists for the stand or tenure type',
            'Lease is current and not expired',
            'Proposed development does not breach lease conditions',
            'Council land records do not show a legal hold',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Lease Valid', description: 'Lease position is accepted.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Further Review Required', description: 'Lease information requires clarification.' },
            { value: 'REJECTED', label: 'Lease Expired', description: 'Lease status blocks the application.' },
        ],
    },
    EVALUATION: {
        kind: 'EVALUATION',
        title: 'Fee Assessment Workspace',
        queueTitle: 'Evaluation Queue',
        dashboardTitle: 'Evaluation Dashboard',
        stageLabel: 'Fee Assessment',
        focus: 'Calculate payable plan fees from stand type, plan category, development scope, and declared area.',
        accent: 'bg-amber-600 text-white',
        softAccent: 'bg-amber-50 text-amber-700 border-amber-100',
        actionTitle: 'Assessment Decision',
        remarksLabel: 'Assessment Notes',
        requiresAmount: true,
        checklists: [
            'Declared area is aligned with drawing dimensions',
            'Correct tariff class is applied',
            'Development scope is reflected in the fee breakdown',
            'Under-declaration risk has been assessed',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Generate Invoice', description: 'Assessment is complete and amount payable is set.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Adjust Assessment', description: 'Applicant or internal data must be corrected.' },
            { value: 'REJECTED', label: 'Flag Under-Declaration', description: 'Declared scope materially conflicts with the plan.' },
        ],
    },
    FINANCIAL: {
        kind: 'FINANCIAL',
        title: 'Financial Clearance Workspace',
        queueTitle: 'Financial Clearance Queue',
        dashboardTitle: 'Financial Gatekeeper Dashboard',
        stageLabel: 'Financial Clearance',
        focus: 'Validate rates clearance, outstanding debt, payment evidence, and receipt authenticity before progression.',
        accent: 'bg-emerald-700 text-white',
        softAccent: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        actionTitle: 'Financial Decision',
        remarksLabel: 'Financial Findings',
        checklists: [
            'Rates account position reviewed',
            'Outstanding debt position is clear or formally addressed',
            'Receipt or payment evidence is authentic',
            'Payment history supports continued processing',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Cleared', description: 'Financial clearance is granted.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Outstanding Debt', description: 'Debt or rates position must be resolved.' },
            { value: 'REJECTED', label: 'Invalid Receipt', description: 'Payment evidence is not accepted.' },
        ],
    },
    BUILDING_CONTROL: {
        kind: 'BUILDING_CONTROL',
        title: 'Full Review Workspace',
        queueTitle: 'Technical Review Queue',
        dashboardTitle: 'Building Control Dashboard',
        stageLabel: 'Technical Review',
        focus: 'Review structural compliance, building regulations, setbacks, drawings, comments, and conditions.',
        accent: 'bg-sky-700 text-white',
        softAccent: 'bg-sky-50 text-sky-700 border-sky-100',
        actionTitle: 'Technical Decision',
        remarksLabel: 'Technical Remarks',
        checklists: [
            'Setbacks and coverage are compliant',
            'Structural notes and certificates are adequate',
            'Building regulation conflicts are recorded',
            'Conditions are clear enough for applicant action',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Approve Compliance', description: 'Technical compliance is accepted.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Request Corrections', description: 'Corrections are required before approval.' },
            { value: 'REJECTED', label: 'Reject Technical Review', description: 'Technical non-compliance blocks the plan.' },
        ],
    },
    WATER_SANITATION: {
        kind: 'WATER_SANITATION',
        title: 'Infrastructure Clearance Workspace',
        queueTitle: 'Water & Sanitation Queue',
        dashboardTitle: 'Infrastructure Clearance Dashboard',
        stageLabel: 'Infrastructure Review',
        focus: 'Assess sewer connections, drainage, water supply access, and sanitation compliance.',
        accent: 'bg-cyan-700 text-white',
        softAccent: 'bg-cyan-50 text-cyan-700 border-cyan-100',
        actionTitle: 'Infrastructure Decision',
        remarksLabel: 'Infrastructure Remarks',
        checklists: [
            'Water supply access is feasible',
            'Sewer connection is acceptable',
            'Drainage route is compliant',
            'Sanitation risks or conditions are recorded',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Infrastructure Cleared', description: 'Utility clearance is granted.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Utility Corrections', description: 'Infrastructure information must be corrected.' },
            { value: 'REJECTED', label: 'Infrastructure Blocked', description: 'Utility constraints block the plan.' },
        ],
    },
    FIRE: {
        kind: 'FIRE',
        title: 'Fire Compliance Workspace',
        queueTitle: 'Fire Compliance Queue',
        dashboardTitle: 'Fire Compliance Dashboard',
        stageLabel: 'Fire Review',
        focus: 'Review fire exits, access routes, emergency compliance, suppression systems, and high-risk occupancy.',
        accent: 'bg-red-700 text-white',
        softAccent: 'bg-red-50 text-red-700 border-red-100',
        actionTitle: 'Fire Decision',
        remarksLabel: 'Fire Safety Remarks',
        checklists: [
            'Fire exits and escape routes are adequate',
            'Emergency vehicle access is acceptable',
            'Suppression requirements are addressed',
            'High-risk occupancy conditions are documented',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Fire Compliant', description: 'Fire compliance is accepted.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Fire Corrections', description: 'Applicant must address fire safety findings.' },
            { value: 'REJECTED', label: 'Fire Non-Compliance', description: 'Fire safety concerns block the plan.' },
        ],
    },
    EXTERNAL: {
        kind: 'EXTERNAL',
        title: 'External Clearance Workspace',
        queueTitle: 'External Clearance Queue',
        dashboardTitle: 'External Clearance Dashboard',
        stageLabel: 'External Clearance',
        focus: 'Capture assigned clearance findings, conditions, and authority-specific supporting documents.',
        accent: 'bg-violet-700 text-white',
        softAccent: 'bg-violet-50 text-violet-700 border-violet-100',
        actionTitle: 'Clearance Decision',
        remarksLabel: 'Clearance Conditions',
        checklists: [
            'Authority-specific clearance document reviewed',
            'Operational or safety conditions captured',
            'Infrastructure impact is recorded',
            'External decision is ready for consolidation',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Clearance Uploaded', description: 'External clearance is accepted.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Conditions Required', description: 'Applicant must address external conditions.' },
            { value: 'REJECTED', label: 'Clearance Refused', description: 'External authority blocks the plan.' },
        ],
    },
    TECHNICAL: {
        kind: 'TECHNICAL',
        title: 'Full Review Workspace',
        queueTitle: 'Technical Review Queue',
        dashboardTitle: 'Department Dashboard',
        stageLabel: 'Department Review',
        focus: 'Review assigned plan documents, record comments, and submit a department decision.',
        accent: 'bg-slate-800 text-white',
        softAccent: 'bg-slate-50 text-slate-700 border-slate-200',
        actionTitle: 'Department Decision',
        remarksLabel: 'Review Remarks',
        checklists: [
            'Assigned documents reviewed',
            'Compliance findings recorded',
            'Conditions are clear',
            'Decision is ready for consolidation',
        ],
        verdicts: [
            { value: 'APPROVED', label: 'Approve', description: 'Department review is accepted.' },
            { value: 'CORRECTIONS_REQUIRED', label: 'Request Corrections', description: 'Corrections are required.' },
            { value: 'REJECTED', label: 'Reject', description: 'Department blocks the plan.' },
        ],
    },
};

export const getWorkflowProfile = (departmentName?: string | null): WorkflowProfile =>
    WORKFLOW_PROFILES[getWorkflowKind(departmentName)];

export const isPreliminaryGatekeeper = (departmentName?: string | null, role?: string | null) => {
    if (role && role !== 'DEPT_OFFICER' && role !== 'DEPT_HEAD') return false;
    return ['OWNERSHIP', 'LEASE', 'EVALUATION', 'FINANCIAL'].includes(getWorkflowKind(departmentName));
};

export const isEvaluationDepartment = (departmentName?: string | null) =>
    getWorkflowKind(departmentName) === 'EVALUATION';

export const countReadyPreliminaryReviews = (reviews: DepartmentReview[] = []) =>
    reviews.filter(review => review.review_stage === 'PRELIMINARY' && review.officer_status === 'OFFICER_APPROVED').length;

