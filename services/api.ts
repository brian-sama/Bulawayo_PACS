const API_BASE = '/api';

export interface LoginResponse {
  access: string;
  refresh: string;
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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.non_field_errors?.[0] || 'Request failed');
  }
  return res.json();
};

// Auth
export const login = async (username: string, password: string): Promise<ApiUser> => {
  const data: LoginResponse = await apiFetch('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setTokens(data.access, data.refresh);

  // Fetch the logged-in user's profile
  const user: ApiUser = await apiFetch('/auth/me/');
  return user;
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
