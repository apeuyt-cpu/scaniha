/**
 * Scaniha JavaScript / TypeScript Official SDK Client (v1.0.0)
 * Works in Browser, Node.js, Next.js, and React Native.
 *
 * Usage:
 *   const { Scaniha } = require('./scaniha-sdk')
 *   const scaniha = new Scaniha({ apiKey: 'sk_live_your_api_key' })
 *   const menu = await scaniha.menu.list()
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Scaniha = factory().Scaniha;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  class ScanihaClient {
    constructor(config = {}) {
      if (!config.apiKey) {
        throw new Error('Scaniha SDK: apiKey is required. Pass { apiKey: "sk_live_..." }');
      }
      this.apiKey = config.apiKey;
      this.baseUrl = (config.baseUrl || 'https://scaniha.com').replace(/\/+$/, '') + '/api/v1';

      this.menu = {
        list: () => this._request('/menu'),
      };

      this.loyalty = {
        list: () => this._request('/loyalty'),
      };

      this.orders = {
        list: () => this._request('/orders'),
        create: (data) => this._request('/orders', { method: 'POST', body: JSON.stringify(data) }),
      };

      this.customers = {
        list: () => this._request('/customers'),
      };

      this.analytics = {
        get: () => this._request('/analytics'),
      };

      this.games = {
        list: () => this._request('/games'),
      };
    }

    async _request(endpoint, options = {}) {
      const url = this.baseUrl + endpoint;
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Scaniha-JS-SDK/1.0.0',
        ...(options.headers || {}),
      };

      const res = await fetch(url, { ...options, headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const err = new Error(json.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        err.status = res.status;
        err.code = json.error?.code;
        throw err;
      }

      return json;
    }
  }

  return { Scaniha: ScanihaClient };
}));
