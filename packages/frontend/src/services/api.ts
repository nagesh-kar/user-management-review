import {
  AuthResponse,
  UserResponse,
  UserCreateRequest,
  PaginatedResponse,
} from "@user-management/shared";

const API_BASE_URL = "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

const request = async <T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { method = "GET", body, headers = {} } = options;

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
    }));
    throw new ApiError(errorData.message, errorData.code, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

// Auth API
export const authApi = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  register: (data: UserCreateRequest): Promise<AuthResponse> =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: data,
    }),

  getCurrentUser: (): Promise<UserResponse> =>
    request<UserResponse>("/auth/me"),
};

// Users API
export const usersApi = {
  list: (page = 1, pageSize = 20): Promise<PaginatedResponse<UserResponse>> =>
    request<PaginatedResponse<UserResponse>>(
      `/users?page=${page}&pageSize=${pageSize}`,
    ),

  getById: (id: string): Promise<UserResponse> =>
    request<UserResponse>(`/users/${id}`),

  update: (id: string, data: Partial<UserResponse>): Promise<UserResponse> =>
    request<UserResponse>(`/users/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: string): Promise<void> =>
    request<void>(`/users/${id}`, {
      method: "DELETE",
    }),
};

export { ApiError };
