
export type UserRole = 'CLIENT' | 'RECEPTION' | 'DEPT_OFFICER' | 'DEPT_HEAD' | 'FINAL_APPROVER' | 'ADMIN';
export type UserType = 'OWNER' | 'PROFESSIONAL';

export const PlanStatusValues = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PRE_SCREENING: 'PRE_SCREENING',
  PRELIMINARY_SUBMITTED: 'PRELIMINARY_SUBMITTED',
  PROFORMA_ISSUED: 'PROFORMA_ISSUED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAID: 'PAID',
  DOCUMENTS_PENDING_VERIFICATION: 'DOCUMENTS_PENDING_VERIFICATION',
  VERIFIED_BY_RECEPTION: 'VERIFIED_BY_RECEPTION',
  FINAL_SUBMITTED: 'FINAL_SUBMITTED',
  REVIEW_POOL: 'REVIEW_POOL',
  IN_REVIEW: 'IN_REVIEW',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CORRECTIONS_REQUIRED: 'CORRECTIONS_REQUIRED',
  AWAITING_FINAL_DECISION: 'AWAITING_FINAL_DECISION',
  REJECTED: 'REJECTED',
  APPROVED: 'APPROVED',
  REJECTED_PRE_SCREEN: 'REJECTED_PRE_SCREEN'
};

export type PlanStatus = keyof typeof PlanStatusValues | string;

export interface DepartmentReview {
  id: number;
  plan?: number;
  plan_pk?: number;
  plan_version?: number;
  department: number;
  department_name: string;
  review_stage?: 'PRELIMINARY' | 'TECHNICAL';
  amount_payable?: number | null;
  officer?: number | null;
  officer_name?: string;
  officer_status?: string;
  officer_comment?: string;
  officer_acted_at?: string | null;
  head?: number | null;
  head_name?: string;
  head_status?: string;
  head_comment?: string;
  head_acted_at?: string | null;
  assigned_at?: string;
  deadline?: string | null;
  escalated?: boolean;
}

export interface DepartmentComment {
  id: string;
  plan_version: number;
  department: string;
  department_id: number;
  author: string;
  author_name: string;
  text: string;
  status_vote: 'APPROVED' | 'CORRECTIONS_REQUIRED' | 'REJECTED';
  pdf_pin_x?: number;
  pdf_pin_y?: number;
  is_internal: boolean;
  created_at: string;
}

export type GeometryShapeType = 'RECTANGLE' | 'TRIANGLE' | 'CIRCLE' | 'TRAPEZIUM' | 'L_SHAPE' | 'MANUAL';
export type GeometryExceptionReason = 'GEOMETRY_UNAVAILABLE' | 'INFORMATION_INCOMPLETE' | 'DRAWING_UNCLEAR' | 'MANUAL_VERIFICATION_DONE' | 'NOT_APPLICABLE' | 'OTHER';
export type GeometryRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface GeometryAssessment {
  id?: number;
  plan?: number;
  version?: number | null;
  shape_type: GeometryShapeType;
  dimensions: Record<string, number | string>;
  declared_area?: number | string | null;
  calculated_area: number | string;
  difference: number | string;
  tolerance_exceeded: boolean;
  notes?: string;
  file_page_reference?: string;
  assessed_by?: number | null;
  assessed_by_name?: string;
  created_at?: string;
}

export interface GeometryException {
  id?: number;
  plan?: number;
  reason: GeometryExceptionReason;
  justification: string;
  risk_level: GeometryRiskLevel;
  requires_follow_up: boolean;
  approved_by?: number | null;
  approved_by_name?: string;
  created_at?: string;
}

export interface Plan {
  id: number;
  plan_id: string;
  plan_number?: string | null;
  client: number;
  client_name: string;
  stand: number;
  stand_addr: string;
  architect: number;
  architect_name: string;
  category: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED';
  stand_type?: string;
  status: PlanStatus;
  suburb?: string;
  title_deed?: string | null;
  power_of_attorney?: string | null;
  structural_cert?: string | null;
  receipt_scan?: string | null;
  sealed_document?: string | null;
  declared_area?: number;
  calculated_area?: number;
  development_description?: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  flag_count: number;
  progress?: number;
  lastUpdate?: string;
  date_submitted?: string;
  versions?: any[];
  department_reviews?: DepartmentReview[];
  submitted_documents?: any[];
  geometry_assessments?: GeometryAssessment[];
  geometry_exceptions?: GeometryException[];
}

export interface Flag {
  id: number;
  plan: number;
  flag_type: 'WARNING' | 'ERROR' | 'INFO';
  category: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  user_type?: UserType;
  professional_reg_no?: string;
  id_number?: string;
  phone?: string;
  department?: number;
  department_name?: string;
}

export interface Notification {
  id: number;
  type: string;
  subject: string;
  message: string;
  is_read: boolean;
  sent_at: string;
}
