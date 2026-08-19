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
            stream: false,
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
        const json = JSON.parse(res.body);
        const content = json.message?.content;
        if (!content)
            throw new Error('Ollama response had no message content');
        return (0, parseDecisions_1.parseDecisions)(content);
    }
    stripSlash(url) {
        return url.replace(/\/+$/, '');
    }
}
exports.OllamaAiAdapter = OllamaAiAdapter;
//# sourceMappingURL=ollamaAiAdapter.js.map