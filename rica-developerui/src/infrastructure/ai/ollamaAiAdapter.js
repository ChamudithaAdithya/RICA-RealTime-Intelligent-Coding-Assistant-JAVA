"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaAiAdapter = void 0;
const httpJson_1 = require("./httpJson");
const prompt_1 = require("./prompt");
const parseDecisions_1 = require("./parseDecisions");
class OllamaAiAdapter {
    constructor(endpoint, model, options) {
        this.endpoint = endpoint;
        this.model = model;
        this.options = options;
    }
    async isAvailable() {
        try {
            const res = await (0, httpJson_1.httpRequest)(`${this.stripSlash(this.endpoint)}/api/tags`, {
                method: 'GET',
                timeoutMs: this.options.timeoutMs,
            });
            return res.status >= 200 && res.status < 300;
        }
        catch {
            return false;
        }
    }
    async evaluate(context) {
        const base = this.stripSlash(this.endpoint);
        const body = {
            model: this.model,
            messages: (0, prompt_1.buildMessages)(context),
            stream: true,
            format: 'json',
            options: { num_predict: this.options.maxTokensPerRequest, temperature: 0.2 },
        };
        const res = await (0, httpJson_1.httpRequest)(`${base}/api/chat`, {
            body,
            timeoutMs: this.options.timeoutMs,
        });
        if (res.status < 200 || res.status >= 300) {
            throw new Error(`Ollama returned HTTP ${res.status}: ${res.body.slice(0, 200)}`);
        }
        return (0, parseDecisions_1.parseDecisions)(extractOllamaContent(res.body));
    }
    stripSlash(url) {
        return url.replace(/\/+$/, '');
    }
}
exports.OllamaAiAdapter = OllamaAiAdapter;
/**
 * Streaming responses are NDJSON: one object per line {...,"message":{"content":...},"done":false}.
 * Accumulate the content deltas. Falls back to a single JSON object for layered gateways
 * (e.g. tunnels/proxies) that buffer the stream into one non-streamed reply.
 */
function extractOllamaContent(body) {
    const lines = body.split(/\r?\n/).filter(l => l.trim());
    if (lines.length > 1) {
        let content = '';
        for (const line of lines) {
            try {
                const chunk = JSON.parse(line);
                content += chunk.message?.content ?? '';
                if (chunk.done)
                    break;
            }
            catch {
                // Non-JSON line — ignore (blank keepalives etc.).
            }
        }
        if (content)
            return content;
    }
    try {
        const json = JSON.parse(body);
        return json.message?.content ?? '';
    }
    catch {
        return '';
    }
}
//# sourceMappingURL=ollamaAiAdapter.js.map