import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

export interface HttpJsonOptions {
  timeoutMs: number;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  body: string;
}

export function httpRequest(endpoint: string, opts: HttpJsonOptions): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(endpoint);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      reject(new Error(`Unsupported protocol: ${parsed.protocol}`));
      return;
    }
    const client = parsed.protocol === 'https:' ? https : http;
    const method = opts.method ?? 'POST';
    const jsonBody = opts.body === undefined ? null : JSON.stringify(opts.body);
    const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers || {}) };
    if (jsonBody !== null) headers['Content-Type'] = 'application/json';

    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        timeout: opts.timeoutMs,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${opts.timeoutMs}ms`));
    });
    if (jsonBody !== null) req.write(jsonBody);
    req.end();
  });
}