"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequest = httpRequest;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url = __importStar(require("url"));
function httpRequest(endpoint, opts) {
    return new Promise((resolve, reject) => {
        const parsed = new url.URL(endpoint);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            reject(new Error(`Unsupported protocol: ${parsed.protocol}`));
            return;
        }
        const client = parsed.protocol === 'https:' ? https : http;
        const method = opts.method ?? 'POST';
        const jsonBody = opts.body === undefined ? null : JSON.stringify(opts.body);
        const headers = { Accept: 'application/json', ...(opts.headers || {}) };
        if (jsonBody !== null)
            headers['Content-Type'] = 'application/json';
        const req = client.request({
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method,
            timeout: opts.timeoutMs,
            headers,
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${opts.timeoutMs}ms`));
        });
        if (jsonBody !== null)
            req.write(jsonBody);
        req.end();
    });
}
//# sourceMappingURL=httpJson.js.map