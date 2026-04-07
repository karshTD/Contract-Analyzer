// API Layer - All fetch calls live here
// When JWT is added, update getAuthHeaders() and all endpoints automatically get auth

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Auth token management
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
  // Also write to a cookie so Next.js middleware can read it server-side
  document.cookie = `auth_token=${token}; path=/; SameSite=Lax`;
}

export function clearAuthToken(): void {
  localStorage.removeItem("auth_token");
  // Expire the cookie
  document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
}

// Headers with auth - update this single function when JWT is added
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Types
export interface FlaggedClause {
  clause: string;
  score: number;
  matched_complaint: string;
}

export interface RiskReportData {
  overall_risk_level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  summary?: string;
  top_dangerous_clauses?: {
    title: string;
    description: string;
    impact: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
  }[];
  financial_stress_assessment?: {
    high_stress_percentage: number;
    high_stress_avg_emi: number;
    low_stress_avg_emi: number;
    interpretation: string;
  };
  recommendations?: string[];
  sections_to_negotiate?: {
    clause: string;
    action: string;
  }[];
  borrower_rights?: string[];
}

export interface AnalysisStatus {
  status: "pending" | "processing" | "complete" | "failed";
  stage: number;
  stage_name: string;
  flagged_clauses: FlaggedClause[];
  risk_report: string;                        // kept as plain-text fallback
  risk_report_structured?: RiskReportData;    // structured JSON from LLM
  risk_level: "HIGH" | "MEDIUM" | "LOW";
}

export interface LoanStats {
  total_loans?: number;
  average_amount?: number;
  high_risk_count?: number;
  medium_risk_count?: number;
  low_risk_count?: number;
  [key: string]: unknown;
}

export interface UploadResponse {
  task_id: string;
}

export interface StressPrediction {
  stress_level: "high" | "low";
  probability: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Upload PDF for analysis
// uploadContract accepts an optional pre-built FormData (with financial profile fields).
// If not provided, it builds a minimal FormData with just the file (backward-compatible).
export async function uploadContract(file: File, existingFormData?: FormData): Promise<UploadResponse> {
  const formData = existingFormData ?? new FormData();
  if (!existingFormData) {
    formData.append("file", file);
  }

  // Add Authorization header manually — do NOT set Content-Type so the
  // browser can set it with the correct multipart boundary.
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || "Failed to upload contract", response.status);

  }

  return response.json();
}

// Get analysis status
export async function getAnalysisStatus(taskId: string): Promise<AnalysisStatus> {
  const response = await fetch(`${API_BASE_URL}/status/${taskId}`);

  if (!response.ok) {
    throw new ApiError("Failed to get analysis status", response.status);
  }

  return response.json();
}

// Get loan statistics
export async function getLoanStats(): Promise<LoanStats> {
  const response = await fetch(`${API_BASE_URL}/loan_stats`);

  if (!response.ok) {
    throw new ApiError("Failed to get loan statistics", response.status);
  }

  return response.json();
}

// Predict stress level
export async function predictStress(data: {
  age: number;
  income: number;
  loan_amount: number;
  emi: number;
  tenure: number;
  credit_score: number;
}): Promise<StressPrediction> {
  const response = await fetch(`${API_BASE_URL}/predict_stress`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new ApiError("Failed to predict stress level", response.status);
  }

  return response.json();
}

// Auth endpoints (stubbed - will fail gracefully)
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new ApiError(body.error || "Invalid email or password", response.status);
    }
    throw new ApiError(body.error || "Login failed", response.status);
  }

  const data = await response.json();
  setAuthToken(data.token);
  return data;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 409) {
      throw new ApiError(body.error || "Email already registered", response.status);
    }
    throw new ApiError(body.error || "Registration failed", response.status);
  }

  const data_response = await response.json();
  setAuthToken(data_response.token);
  return data_response;
}

export function logout(): void {
  clearAuthToken();
}
