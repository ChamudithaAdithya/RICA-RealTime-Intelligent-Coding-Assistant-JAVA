import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V404 — Entity Exposure","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V404.md","filePath":"violations/RICA-V404.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V404.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v404-—-entity-exposure" tabindex="-1">RICA-V404 — Entity Exposure <a class="header-anchor" href="#rica-v404-—-entity-exposure" aria-label="Permalink to &quot;RICA-V404 — Entity Exposure&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "warning",
    text: "Warning"
  }, null, _parent));
  _push(`<blockquote><p><strong>Severity context</strong>: `);
  _push(ssrRenderComponent(_component_Badge, {
    type: "warning",
    text: "Warning"
  }, null, _parent));
  _push(` Entity returned from a public method or accepted as a parameter `);
  _push(ssrRenderComponent(_component_Badge, {
    type: "tip",
    text: "Info"
  }, null, _parent));
  _push(` Entity exposed via a public/protected field</p></blockquote><blockquote><p><strong>Stage</strong>: Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>entityExposureRule (dependencyGraph.ts)</code> (CrossFileAnalyzer)</td></tr><tr><td>Layer</td><td>controller api</td></tr><tr><td>Configuration</td><td><code>enableArchitecturalChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V201.html"><code>RICA-V201</code></a>, <a href="./RICA-V202.html"><code>RICA-V202</code></a></td></tr><tr><td>Source</td><td><code>src/dependencyGraph.ts:644</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>A Controller exposes an entity layer type in a public method return type or parameter, or via a <code>public</code>/<code>protected</code> field.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@RestController</span></span>
<span class="line"><span>public class UserController {</span></span>
<span class="line"><span>    public User find(long id) {   // returns entity type</span></span>
<span class="line"><span>        return userService.findById(id);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="fixed-version" tabindex="-1">Fixed version <a class="header-anchor" href="#fixed-version" aria-label="Permalink to &quot;Fixed version&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@RestController</span></span>
<span class="line"><span>public class UserController {</span></span>
<span class="line"><span>    public UserResponse find(long id) { // returns DTO</span></span>
<span class="line"><span>        return userService.getResponse(id);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="what-changed" tabindex="-1">What changed <a class="header-anchor" href="#what-changed" aria-label="Permalink to &quot;What changed&quot;">​</a></h2><p>The highlighted diff below shows the real refactor: lines marked with <code>-</code> are removed from the violating version, and lines marked with <code>+</code> are added in the fixed version.</p><div class="language-diff vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">diff</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  @RestController</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  public class UserController {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     public User find(long id) {   // returns entity type</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         return userService.findById(id);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public UserResponse find(long id) { // returns DTO</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         return userService.getResponse(id);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>Entities are internal persistence/domain shapes. Leaking them across the API boundary couples clients to the data model — schema changes become breaking changes. DTOs define a stable contract at the edge.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/clean-architecture.html">Clean Architecture and dependency direction</a> - Learn why source dependencies should point inward and why framework details belong outside core code.</li><li><a href="./../concepts/dependency-graphs-and-cycles.html">Dependency graphs and cycles</a> - Learn cycles, inverted dependencies, fan-in, fan-out, and why graph rules matter.</li><li><a href="./../concepts/package-boundaries.html">Package boundaries</a> - Learn how Java packages express architectural ownership and why forbidden imports are meaningful.</li><li><a href="./../concepts/entities-dtos-api-contracts.html">Entities, DTOs, and API contracts</a> - Understand why entities are internal models and DTOs are stable request/response contracts.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Replace the entity return type or parameter with a DTO.</strong> This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.</li><li><strong>Map between entity and DTO in the service layer.</strong> This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.</li><li><strong>Make entity fields on controllers private and delegate access via services.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V404 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Replace the Entity type with a dedicated DTO (Data Transfer Object) in the API contract</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>dto</code> <code>entity</code> <code>api</code> <code>graph</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V404.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV404 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV404 as default
};
