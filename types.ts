
export type UserRole = 'CLIENT' | 'STAFF' | 'ADMIN' | 'EXECUTIVE';

export const PlanStatusValues = {
  REJECTED: 'REJECTED',
  CORRECTIONS_REQUIRED: 'CORRECTIONS_REQUIRED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PENDING_PAYMENT: 'PENDING_PAYMENT'
};

export type PlanStatus = 'REJECTED' | 'CORRECTIONS_REQUIRED' | 'IN_REVIEW' | 'APPROVED' | 'PENDING_PAYMENT';

export interface DepartmentComment {
  id: string;
  department: string;
  author: string;
  text: string;
  status: PlanStatus;
  timestamp: string;
}

export interface Plan {
  id: string;
  propertyAddress: string;
  standNumber: string;
  category: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL';
  status: PlanStatus;
  progress: number;
  lastUpdate: string;
  architect: string;
  owner: string;
  comments: DepartmentComment[];
}

export interface Flag {
  type: 'WARNING' | 'ERROR';
  message: string;
  department: string;
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  role: UserRole;
  idNumber?: string;
}

