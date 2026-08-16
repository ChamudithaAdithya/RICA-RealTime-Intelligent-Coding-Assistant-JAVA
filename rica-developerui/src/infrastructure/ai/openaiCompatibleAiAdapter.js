"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleAiAdapter = void 0;
const httpJson_1 = require("./httpJson");
const prompt_1 = require("./prompt");
const parseDecisions_1 = require("./parseDecisions");
class OpenAICompatibleAiAdapter {
    constructor(endpoint, model, options) {
        this.endpoint = endpoint;
        this.model = model;
        this.options = options;
    }
    async isAvailable() {
        try {
            const res = await (0, httpJson_1.httpRequest)(`${this.stripSlash(this.endpoint)}/models`, {
                method: 'GET',
                timeoutMs: this.options.timeoutMs,
                headers: this.authHeaders(),
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
            temperature: 0.2,
            max_tokens: this.options.maxTokensPerRequest,
            response_format: { type: 'json_object' },
        };
        const res = await (0, httpJson_1.httpRequest)(`${base}/v1/chat/completions`, {
            body,
            timeoutMs: this.options.timeoutMs,
            headers: this.authHeaders(),
        });
        if (res.status < 200 || res.status >= 300) {
            throw new Error(`Provider returned HTTP ${res.status}: ${res.body.slice(0, 200)}`);
        }
        const json = JSON.parse(res.body);
        const content = json.choices?.[0]?.message?.content;
        if (!content)
            throw new Error('Provider response had no message content');
        return (0, parseDecisions_1.parseDecisions)(content);
    }
    authHeaders() {
        return this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : undefined;
    }
    stripSlash(url) {
        return url.replace(/\/+$/, '');
    }
}
exports.OpenAICompatibleAiAdapter = OpenAICompatibleAiAdapter;
//# sourceMappingURL=openaiCompatibleAiAdapter.js.map