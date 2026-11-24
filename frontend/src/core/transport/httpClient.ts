export interface HttpClient {
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
}

export interface HttpClientConfig {
  baseUrl?: string;
  getHeaders?: () => Record<string, string>;
  credentials?: RequestCredentials;
}

export function getDefaultApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  return envUrl ? envUrl.replace(/\/+$/, "") : "/api";
}

export function getDefaultAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof localStorage !== "undefined") {
    const stayToken = localStorage.getItem("ird_stay_token");
    const staffToken = localStorage.getItem("ird_staff_token");
    if (stayToken) headers["x-stay-token"] = stayToken;
    if (staffToken) headers["Authorization"] = `Bearer ${staffToken}`;
  }
  return headers;
}

export function createHttpClient(config: HttpClientConfig = {}): HttpClient {
  const baseUrl = config.baseUrl ?? getDefaultApiBaseUrl();
  const getHeaders = config.getHeaders ?? getDefaultAuthHeaders;
  const credentials = config.credentials ?? "include";

  return {
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...getHeaders(),
        ...((options.headers as Record<string, string>) || {}),
      };

      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      return data as T;
    },
  };
}

export const httpClient = createHttpClient();
