/**
 * Scaniha TypeScript Official SDK Client (v1.0.0)
 * Strongly typed SDK for TypeScript / React / Next.js projects.
 */

export interface ScanihaConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
  };
}

export class Scaniha {
  private apiKey: string;
  private baseUrl: string;

  public menu: {
    list: () => Promise<ApiResponse>;
  };

  public loyalty: {
    list: () => Promise<ApiResponse>;
  };

  public orders: {
    list: () => Promise<ApiResponse>;
    create: (data: { items: any[]; customer_email?: string }) => Promise<ApiResponse>;
  };

  public customers: {
    list: () => Promise<ApiResponse>;
  };

  public analytics: {
    get: () => Promise<ApiResponse>;
  };

  public games: {
    list: () => Promise<ApiResponse>;
  };

  constructor(config: ScanihaConfig) {
    if (!config.apiKey) {
      throw new Error('Scaniha SDK: apiKey is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://scaniha.com').replace(/\/+$/, '') + '/api/v1';

    this.menu = {
      list: () => this.request('/menu'),
    };

    this.loyalty = {
      list: () => this.request('/loyalty'),
    };

    this.orders = {
      list: () => this.request('/orders'),
      create: (data) => this.request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    };

    this.customers = {
      list: () => this.request('/customers'),
    };

    this.analytics = {
      get: () => this.request('/analytics'),
    };

    this.games = {
      list: () => this.request('/games'),
    };
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Scaniha-TS-SDK/1.0.0',
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(json.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      (err as any).status = res.status;
      (err as any).code = json.error?.code;
      throw err;
    }

    return json as ApiResponse<T>;
  }
}
