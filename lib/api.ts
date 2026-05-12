import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.ventatalk.com") + "/api/v1";

const http: AxiosInstance = axios.create({ baseURL: BASE_URL });

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

function processQueue(token: string) {
  queue.forEach((cb) => cb(token));
  queue = [];
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;

    if (!refreshToken) {
      if (typeof window !== "undefined") window.location.href = "/auth/login";
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(http(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const newToken: string = data.access_token;
      localStorage.setItem("access_token", newToken);
      document.cookie = `admin_token=${newToken}; path=/; SameSite=Lax`;
      processQueue(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return http(original);
    } catch {
      localStorage.clear();
      document.cookie = "admin_token=; path=/; max-age=0";
      window.location.href = "/auth/login";
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export interface BusinessUsage {
  conversations_this_month: number;
  conversations_limit: number;
}

export interface Business {
  id: string;
  name: string;
  email: string;
  plan: string;
  billing_cycle?: string;
  is_active: boolean;
  features: Record<string, unknown> | null;
  conversations_this_month?: number;
  max_conversations_per_month?: number;
  created_at?: string;
  usage?: BusinessUsage;
  integrations?: string[];
  [key: string]: unknown;
}

export interface BusinessListResponse {
  items: Business[];
  total: number;
  page: number;
  limit: number;
}

export interface StatsOverview {
  total_businesses: number;
  active_businesses: number;
  total_conversations_today: number;
  total_revenue_mtd: number;
  plans_breakdown?: { starter: number; pro: number; max: number };
}

export const adminApi = {
  auth: {
    login: (email: string, password: string) =>
      http.post<{ access_token: string; refresh_token: string }>(
        "/auth/login",
        new URLSearchParams({ username: email, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      ),
    me: () => http.get("/auth/me"),
    refresh: (token: string) =>
      http.post("/auth/refresh", { refresh_token: token }),
  },
  businesses: {
    list: (page: number, search?: string) =>
      http.get<BusinessListResponse>("/admin/businesses", {
        params: { page, search },
      }),
    get: (id: string) => http.get<Business>(`/admin/businesses/${id}`),
    updateFeatures: (id: string, features: Record<string, unknown>) =>
      http.patch(`/admin/businesses/${id}/features`, { features }),
    updatePlan: (id: string, plan: string) =>
      http.patch(`/admin/businesses/${id}/plan`, { plan }),
  },
  stats: {
    overview: () => http.get<StatsOverview>("/admin/stats/overview"),
  },
};
