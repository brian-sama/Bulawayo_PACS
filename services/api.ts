import { Plan, PlanStatus, UserRole, ApiAuditLog } from '../types';

const API_BASE = '/api';

export interface LoginResponse {
  status: string;
  message: string;
  tokens: {
    access: string;
    refresh: string;
  };
  user: {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: UserRole;
    department_name: string;
    department_id: number | null;
  };
  permissions: string[];
}

export interface ApiUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  department: number | null;
  department_name: string | null;
  is_active: boolean;
  created_at: string;
}

// Store tokens in localStorage
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const getAccessToken = () => localStorage.getItem('access_token');

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Authenticated fetch helper
export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const errorMessage = err.detail || err.non_field_errors?.[0] || JSON.stringify(err);
    const errorObj = new Error(errorMessage);
    (errorObj as any).response = { data: err }; // Attach full data for sophisticated callers
    throw errorObj;
  }
  return res.json();
};

// Auth
export const login = async (username: string, password: string): Promise<UserProfile> => {
  const data: LoginResponse = await apiFetch('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setTokens(data.tokens.access, data.tokens.refresh);

  // Map backend response to frontend UserProfile
  return {
    id: data.user.user_id,
    username: username, // or data.user.email if username isn't in response
    email: data.user.email,
    full_name: `${data.user.first_name} ${data.user.last_name}`.trim(),
    role: data.user.role,
    department: data.user.department_id || undefined,
    department_name: data.user.department_name
  };
};

export const logout = () => {
  clearTokens();
};

// User Management
export const getUsers = async (): Promise<ApiUser[]> => {
  const data = await apiFetch('/users/');
  return Array.isArray(data) ? data : data.results;
};

export const createUser = async (userData: any): Promise<ApiUser> => {
  return apiFetch('/users/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const updateUser = async (id: number, userData: any): Promise<ApiUser> => {
  return apiFetch(`/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
};

export const deleteUser = async (id: number): Promise<any> => {
  return apiFetch(`/users/${id}/`, {
    method: 'DELETE',
  });
};

export const permanentlyDeleteUser = async (id: number): Promise<any> => {
  return apiFetch(`/users/${id}/permanently_delete/`, {
    method: 'POST',
  });
};

export const reactivateUser = async (id: number): Promise<any> => {
  return apiFetch(`/users/${id}/reactivate/`, {
    method: 'POST',
  });
};

// Departments
export interface ApiDepartment {
  id: number;
  name: string;
  code: string;
  is_required: boolean;
}

export const getDepartments = async (): Promise<ApiDepartment[]> => {
  const data = await apiFetch('/departments/');
  return Array.isArray(data) ? data : data.results;
};

// Audit Logs
export interface ApiAuditLog {
  id: number;
  user_name: string;
  action: string;
  target_model: string;
  target_id: string;
  old_value: any;
  new_value: any;
  ip_address: string;
  timestamp: string;
}

export const getAuditLogs = async (): Promise<{ results: ApiAuditLog[] }> => {
  return apiFetch('/audit-logs/');
};

// Plans
export const getPlans = async (): Promise<Plan[]> => {
  const data = await apiFetch('/plans/');
  return Array.isArray(data) ? data : data.results;
};

export const getPlanDetail = async (id: number): Promise<Plan> => {
  return apiFetch(`/plans/${id}/`);
};

export const submitPlan = async (propData: any): Promise<Plan> => {
  return apiFetch('/plans/', {
    method: 'POST',
    body: JSON.stringify(propData),
  });
};

export const runAutoChecks = async (id: number) => {
  return apiFetch(`/plans/${id}/run_auto_checks/`, { method: 'POST' });
};

export const verifyArea = async (id: number, declaredArea: number, shapes: any[]) => {
  return apiFetch(`/plans/${id}/verify_area/`, {
    method: 'POST',
    body: JSON.stringify({ declared_area: declaredArea, shapes }),
  });
};

export const approveFinal = async (id: number, signingPassword: string, notes: string) => {
  return apiFetch(`/plans/${id}/approve_final/`, {
    method: 'POST',
    body: JSON.stringify({ signing_password: signingPassword, notes }),
  });
};

export const addComment = async (planVersionId: number, deptId: number, text: string, vote: string, pinX?: number, pinY?: number) => {
  return apiFetch('/comments/', {
    method: 'POST',
    body: JSON.stringify({
      plan_version: planVersionId,
      department: deptId,
      text,
      status_vote: vote,
      pdf_pin_x: pinX,
      pdf_pin_y: pinY
    }),
  });
};
