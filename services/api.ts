const API_BASE = '/api';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string;
  department: number | null;
  department_name: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export type ApiUser = UserProfile;

export interface ApiDepartment {
  id: number;
  name: string;
}

export interface ApiAuditLog {
  id: number;
  user_name: string;
  action: string;
  timestamp: string;
  target_model: string;
  target_id: string | number;
}

// ─────────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────────

export const getAccessToken  = (): string | null => localStorage.getItem('access_token');
export const getRefreshToken = (): string | null => localStorage.getItem('refresh_token');
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

/**
 * Clears tokens, all storage, and forces a hard page reload so no React state
 * bleeds between different user sessions.
 */
export const logout = (redirectToLogin = true) => {
  localStorage.clear();
  sessionStorage.clear();
  if (redirectToLogin) {
    sessionStorage.setItem('pacs_show_login', 'true');
  }
  window.location.href = '/';
};

// ─────────────────────────────────────────────
// CORE FETCH HELPER
// ─────────────────────────────────────────────

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type to JSON if we're not sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired — clear and redirect to login
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      errorMessage = err.detail || err.error || JSON.stringify(err);
    } catch {
      // non-JSON error body
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (e.g. 204 No Content)
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

export const login = async (username: string, password: string): Promise<UserProfile> => {
  const tokenData = await apiFetch('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  // Backend nests tokens under 'tokens' object
  if (tokenData.tokens) {
    setTokens(tokenData.tokens.access, tokenData.tokens.refresh);
  } else {
    setTokens(tokenData.access, tokenData.refresh);
  }

  const me = await apiFetch('/auth/me/');
  const userProfile: UserProfile = {
    id:               me.id,
    username:         me.username,
    email:            me.email,
    full_name:        me.full_name,
    role:             me.role,
    user_type:        me.user_type,
    department:       me.department,
    department_name:  me.department_name,
    is_active:        me.is_active,
    is_email_verified: me.is_email_verified,
    created_at:       me.created_at,
  };

  // Persist for ReviewWorkspace dept matching and session recovery
  localStorage.setItem('user', JSON.stringify(userProfile));
  return userProfile;
};

export const register = async (data: Record<string, string>): Promise<any> =>
  apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(data) });

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export const getUsers = async (): Promise<any[]> => {
  const data = await apiFetch('/users/');
  return Array.isArray(data) ? data : data.results ?? [];
};

export const createUser = async (payload: Record<string, any>): Promise<any> =>
  apiFetch('/users/', { method: 'POST', body: JSON.stringify(payload) });

export const updateUser = async (id: number, payload: Record<string, any>): Promise<any> =>
  apiFetch(`/users/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteUser = async (id: number): Promise<any> =>
  apiFetch(`/users/${id}/`, { method: 'DELETE' });

export const reactivateUser = async (id: number): Promise<any> =>
  apiFetch(`/users/${id}/reactivate/`, { method: 'POST' });

export const permanentlyDeleteUser = async (id: number): Promise<any> =>
  apiFetch(`/users/${id}/permanently_delete/`, { method: 'POST' });

// ─────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────

export const getDepartments = async (): Promise<any[]> => {
  const data = await apiFetch('/departments/');
  return Array.isArray(data) ? data : data.results ?? [];
};

// ─────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────

export const getAuditLogs = async (): Promise<any[]> => {
  const data = await apiFetch('/audit-logs/');
  return Array.isArray(data) ? data : data.results ?? [];
};

// ─────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────

export const getPlans = async (): Promise<any[]> => {
  const data = await apiFetch('/plans/');
  return Array.isArray(data) ? data : data.results ?? [];
};

export const getPlanDetail = async (planId: string | number): Promise<any> =>
  apiFetch(`/plans/${planId}/`);

export const createPlan = async (formData: FormData): Promise<any> =>
  apiFetch('/plans/', { method: 'POST', body: formData });

export const updatePlan = async (planId: number | string, payload: Partial<any>): Promise<any> =>
  apiFetch(`/plans/${planId}/`, { method: 'PATCH', body: JSON.stringify(payload) });

export const submitPreliminary = async (planId: number, planFile: File): Promise<any> => {
  const fd = new FormData();
  fd.append('plan_file', planFile);
  return apiFetch(`/plans/${planId}/submit_preliminary/`, { method: 'POST', body: fd });
};

export const resubmitPlan = async (planId: number, planFile: File, notes?: string): Promise<any> => {
  const fd = new FormData();
  fd.append('plan_file', planFile);
  if (notes) fd.append('notes', notes);
  return apiFetch(`/plans/${planId}/resubmit/`, { method: 'POST', body: fd });
};

export const submitToReview = async (planId: number): Promise<any> =>
  apiFetch(`/plans/${planId}/submit_to_review/`, { method: 'POST' });

export const rejectPreScreen = async (planId: number, reason: string): Promise<any> =>
  apiFetch(`/plans/${planId}/reject_pre_screen/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const runAutoChecks = async (planId: number): Promise<any> =>
  apiFetch(`/plans/${planId}/run_auto_checks/`, { method: 'POST' });

export const submitDocuments = async (planId: number): Promise<any> =>
  apiFetch(`/plans/${planId}/submit_documents/`, { method: 'POST' });

/**
 * Returns the URL to securely stream the current plan PDF through the
 * authenticated Django download endpoint.
 */
export const getPlanFileUrl = (planId: number | string): string =>
  `${API_BASE}/plans/${planId}/download/`;

export const approveFinal = async (
  planId: number,
  signingPassword: string,
  notes?: string
): Promise<any> =>
  apiFetch(`/plans/${planId}/approve_final/`, {
    method: 'POST',
    body: JSON.stringify({ signing_password: signingPassword, notes: notes ?? '' }),
  });

// ─────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────

/**
 * Fetch comments for a specific plan version.
 * Fixed: was previously missing from api.ts causing runtime crash in ReviewWorkspace.
 */
export const getComments = async (versionId: number): Promise<any[]> => {
  const data = await apiFetch(`/comments/?plan_version=${versionId}`);
  return Array.isArray(data) ? data : data.results ?? [];
};

export const addComment = async (payload: {
  plan_version: number;
  department: number;
  text: string;
  status_vote: string;
  pdf_pin_x?: number;
  pdf_pin_y?: number;
  is_internal?: boolean;
}): Promise<any> =>
  apiFetch('/comments/', { method: 'POST', body: JSON.stringify(payload) });

// ─────────────────────────────────────────────
// DEPARTMENT REVIEWS
// ─────────────────────────────────────────────

export const getDepartmentReviews = async (): Promise<any[]> => {
  const data = await apiFetch('/department-reviews/');
  return Array.isArray(data) ? data : data.results ?? [];
};

export const evaluateReview = async (
  reviewId: number,
  role: 'OFFICER' | 'HEAD',
  decisionStatus: string,
  comment: string
): Promise<any> =>
  apiFetch(`/department-reviews/${reviewId}/evaluate/`, {
    method: 'POST',
    body: JSON.stringify({ role, status: decisionStatus, comment }),
  });

// ─────────────────────────────────────────────
// RECEPTION ACTIONS
// ─────────────────────────────────────────────

export type ReceptionAction =
  | { action: 'ACCEPT'; planId: number }
  | { action: 'REJECT'; planId: number; reason: string };

export const receptionAction = async (payload: ReceptionAction): Promise<any> => {
  if (payload.action === 'ACCEPT') {
    return submitToReview(payload.planId);
  }
  return rejectPreScreen(payload.planId, payload.reason);
};

// ─────────────────────────────────────────────
// PROFORMA INVOICES
// ─────────────────────────────────────────────

export interface ProformaLineItemPayload {
  label: string;
  vote_no: string;
  amount_zwl: number;
  amount_usd: number;
  is_rates_payment?: boolean;
}

export const createProformaInvoice = async (
  planId: number,
  lineItems: ProformaLineItemPayload[],
  payload: { notes?: string; reception_contacts?: string; rates_comment?: string } = {}
): Promise<any> =>
  apiFetch('/proforma-invoices/', {
    method: 'POST',
    body: JSON.stringify({
      plan: planId,
      line_items: lineItems,
      notes: payload.notes ?? '',
      reception_contacts: payload.reception_contacts ?? '',
      rates_comment: payload.rates_comment ?? '',
    }),
  });

export const getProformaInvoice = async (invoiceId: number): Promise<any> =>
  apiFetch(`/proforma-invoices/${invoiceId}/`);

export const getProformaInvoicesForPlan = async (planId: number): Promise<any[]> => {
  const data = await apiFetch(`/proforma-invoices/?plan=${planId}`);
  return Array.isArray(data) ? data : data.results ?? [];
};

export const confirmPayment = async (
  invoiceId: number,
  payload: {
    receipt_number: string;
    payment_date: string;
    amount_zwl?: number;
    amount_usd?: number;
    payment_method?: string;
    evidence_file?: File;
  }
): Promise<any> => {
  const fd = new FormData();
  fd.append('receipt_number', payload.receipt_number);
  fd.append('payment_date', payload.payment_date);
  if (payload.amount_zwl !== undefined) fd.append('amount_zwl', String(payload.amount_zwl));
  if (payload.amount_usd !== undefined) fd.append('amount_usd', String(payload.amount_usd));
  if (payload.payment_method) fd.append('payment_method', payload.payment_method);
  if (payload.evidence_file) fd.append('evidence_file', payload.evidence_file);
  return apiFetch(`/proforma-invoices/${invoiceId}/confirm_payment/`, { method: 'POST', body: fd });
};

// ─────────────────────────────────────────────
// CHECKLIST TEMPLATES
// ─────────────────────────────────────────────

export const getChecklistTemplates = async (): Promise<any[]> => {
  const data = await apiFetch('/checklist-templates/');
  return Array.isArray(data) ? data : data.results ?? [];
};

// ─────────────────────────────────────────────
// SUBMITTED DOCUMENTS
// ─────────────────────────────────────────────

export const uploadSubmittedDocument = async (
  planId: number,
  file: File,
  label: string,
  requiredDocId?: number
): Promise<any> => {
  const fd = new FormData();
  fd.append('plan', String(planId));
  fd.append('file', file);
  fd.append('label', label);
  if (requiredDocId) fd.append('required_doc', String(requiredDocId));
  return apiFetch('/submitted-documents/', { method: 'POST', body: fd });
};

export const getSubmittedDocuments = async (planId: number): Promise<any[]> => {
  const data = await apiFetch(`/submitted-documents/?plan=${planId}`);
  return Array.isArray(data) ? data : data.results ?? [];
};

export const verifyDocument = async (docId: number, comment?: string): Promise<any> =>
  apiFetch(`/submitted-documents/${docId}/verify/`, {
    method: 'POST',
    body: JSON.stringify({ comment: comment ?? '' }),
  });

export const rejectDocument = async (docId: number, reason: string): Promise<any> =>
  apiFetch(`/submitted-documents/${docId}/reject_document/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

// ─────────────────────────────────────────────
// FINAL DECISION
// ─────────────────────────────────────────────

export const submitFinalDecision = async (
  planId: number,
  decision: 'APPROVED' | 'REJECTED',
  reason: string
): Promise<any> =>
  apiFetch('/final-decisions/', {
    method: 'POST',
    body: JSON.stringify({ plan: planId, decision, reason }),
  });

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

export const getNotifications = async (): Promise<any[]> => {
  const data = await apiFetch('/notifications/');
  return Array.isArray(data) ? data : data.results ?? [];
};

export const markNotificationRead = async (id: number): Promise<any> =>
  apiFetch(`/notifications/${id}/mark_read/`, { method: 'POST' });

export const markAllNotificationsRead = async (): Promise<any> =>
  apiFetch('/notifications/mark_all_read/', { method: 'POST' });
