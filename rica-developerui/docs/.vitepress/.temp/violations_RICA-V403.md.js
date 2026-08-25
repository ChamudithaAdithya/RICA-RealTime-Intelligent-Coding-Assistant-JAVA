import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V403 — Cyclic / Inverted Dependency","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V403.md","filePath":"violations/RICA-V403.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V403.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v403-—-cyclic-inverted-dependency" tabindex="-1">RICA-V403 — Cyclic / Inverted Dependency <a class="header-anchor" href="#rica-v403-—-cyclic-inverted-dependency" aria-label="Permalink to &quot;RICA-V403 — Cyclic / Inverted Dependency&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "danger",
    text: "Error"
  }, null, _parent));
  _push(`<blockquote><p><strong>Severity context</strong>: `);
  _push(ssrRenderComponent(_component_Badge, {
    type: "danger",
    text: "Error"
  }, null, _parent));
  _push(` True SCC cycle between classes (Tarjan) `);
  _push(ssrRenderComponent(_component_Badge, {
    type: "warning",
    text: "Warning"
  }, null, _parent));
  _push(` Inverted dependency edge (lower layer → higher layer, ruleId INVERTED_DEP)</p></blockquote><blockquote><p><strong>Stage</strong>: Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>cyclicDependencyRule (dependencyGraph.ts)</code> (CrossFileAnalyzer)</td></tr><tr><td>Layer</td><td>cross-layer / graph</td></tr><tr><td>Configuration</td><td><code>enableArchitecturalChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V402.html"><code>RICA-V402</code></a>, <a href="./RICA-V501.html"><code>RICA-V501</code></a></td></tr><tr><td>Source</td><td><code>src/dependencyGraph.ts:585</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>Tarjan SCC finds a true cycle among classes, or an inverted edge (a lower layer depending on a higher layer) appears when following <code>calls</code>/<code>has-a</code>/<code>uses</code> edges.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>// A depends on B, B depends on C, C depends on A</span></span>
<span class="line"><span>class A { B b; }</span></span>
<span class="line"><span>class B { C c; }</span></span>
<span class="line"><span>class C { A a; } // cycle!</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>Circular dependencies make the code impossible to test in isolation, block other components, and cause initialization and packaging headaches. Inverted edges violate the Dependency Rule and prevent lower layers from being reused by anything above them.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/dependency-graphs-and-cycles.html">Dependency graphs and cycles</a> - Learn cycles, inverted dependencies, fan-in, fan-out, and why graph rules matter.</li><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/clean-architecture.html">Clean Architecture and dependency direction</a> - Learn why source dependencies should point inward and why framework details belong outside core code.</li><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/package-boundaries.html">Package boundaries</a> - Learn how Java packages express architectural ownership and why forbidden imports are meaningful.</li><li><a href="./../concepts/dependency-inversion.html">Dependency inversion</a> - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Break the cycle by extracting the shared members into a separate module/class.</strong> This keeps the code aligned with the cross-layer / graph responsibility expected by RICA-V403.</li><li><strong>Introduce an interface in the lower layer and let the higher layer implement it.</strong> This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.</li><li><strong>Apply the Dependency Inversion Principle so high-level policies do not depend on low-level details.</strong> This keeps the code aligned with the cross-layer / graph responsibility expected by RICA-V403.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V403 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Break the cycle by extracting shared logic into a separate module or introducing an interface</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>cycle</code> <code>graph</code> <code>inversion</code> <code>layering</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V403.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV403 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV403 as default
};
