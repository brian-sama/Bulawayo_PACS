
export type UserRole = 'CLIENT' | 'RECEPTION' | 'DEPT_OFFICER' | 'DEPT_HEAD' | 'FINAL_APPROVER' | 'ADMIN';
export type UserType = 'OWNER' | 'PROFESSIONAL';

export const PlanStatusValues = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PRE_SCREENING: 'PRE_SCREENING',
  PRELIMINARY_SUBMITTED: 'PRELIMINARY_SUBMITTED',
  PROFORMA_ISSUED: 'PROFORMA_ISSUED',
  PAID: 'PAID',
  REVIEW_POOL: 'REVIEW_POOL',
  IN_REVIEW: 'IN_REVIEW',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CORRECTIONS_REQUIRED: 'CORRECTIONS_REQUIRED',
  REJECTED: 'REJECTED',
  APPROVED: 'APPROVED',
  REJECTED_PRE_SCREEN: 'REJECTED_PRE_SCREEN'
};

export type PlanStatus = keyof typeof PlanStatusValues | string;

export interface DepartmentReview {
  id: number;
  plan: number;
  department: number;
  department_name: string;
  reviewer?: number;
  reviewer_name?: string;
  status: 'PENDING' | 'APPROVED' | 'CORRECTIONS_REQUIRED' | 'REJECTED';
  comments: string;
  created_at: string;
  updated_at: string;
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

export interface Plan {
  id: number;
  plan_id: string;
  client: number;
  client_name: string;
  stand: number;
  stand_addr: string;
  architect: number;
  architect_name: string;
  category: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED';
  status: PlanStatus;
  declared_area?: number;
  calculated_area?: number;
  development_description?: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  flag_count: number;
  progress: number;
  lastUpdate: string;
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

