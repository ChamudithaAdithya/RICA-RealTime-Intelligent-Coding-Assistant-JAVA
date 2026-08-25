import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V108 — Anemic Entity","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V108.md","filePath":"violations/RICA-V108.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V108.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v108-—-anemic-entity" tabindex="-1">RICA-V108 — Anemic Entity <a class="header-anchor" href="#rica-v108-—-anemic-entity" aria-label="Permalink to &quot;RICA-V108 — Anemic Entity&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "tip",
    text: "Info"
  }, null, _parent));
  _push(`<blockquote><p><strong>Stage</strong>: Stage 1 — Layer-Specific Detectors</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>EntityLayerAnalyzer</code> (EntityLayer)</td></tr><tr><td>Layer</td><td>entity</td></tr><tr><td>Configuration</td><td><code>enableBusinessLogicChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V104.html"><code>RICA-V104</code></a></td></tr><tr><td>Source</td><td><code>src/entityLayerDetector.ts:246</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>An entity has zero methods, or more than 80% of its methods are plain getters/setters with no behavior.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@Entity</span></span>
<span class="line"><span>public class Account {</span></span>
<span class="line"><span>    private BigDecimal balance;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public BigDecimal getBalance() { return balance; }</span></span>
<span class="line"><span>    public void setBalance(BigDecimal balance) { this.balance = balance; }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="fixed-version" tabindex="-1">Fixed version <a class="header-anchor" href="#fixed-version" aria-label="Permalink to &quot;Fixed version&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@Entity</span></span>
<span class="line"><span>public class Account {</span></span>
<span class="line"><span>    private BigDecimal balance;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public void deposit(BigDecimal amount) {</span></span>
<span class="line"><span>        this.balance = this.balance.add(amount);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public boolean canWithdraw(BigDecimal amount) {</span></span>
<span class="line"><span>        return this.balance.compareTo(amount) &gt;= 0;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="what-changed" tabindex="-1">What changed <a class="header-anchor" href="#what-changed" aria-label="Permalink to &quot;What changed&quot;">​</a></h2><p>The highlighted diff below shows the real refactor: lines marked with <code>-</code> are removed from the violating version, and lines marked with <code>+</code> are added in the fixed version.</p><div class="language-diff vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">diff</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  @Entity</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  public class Account {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      private BigDecimal balance;</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     public BigDecimal getBalance() { return balance; }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     public void setBalance(BigDecimal balance) { this.balance = balance; }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public void deposit(BigDecimal amount) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         this.balance = this.balance.add(amount);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public boolean canWithdraw(BigDecimal amount) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         return this.balance.compareTo(amount) &gt;= 0;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>A class with no behavior captures no business contract — it is just a dumb data holder. In domain-driven designs, entities should encapsulate invariants and rules (they tell you what the domain concept <em>does</em>). RICA reports this at <code>info</code> level because anemic entities are sometimes an intentional, acceptable trade-off.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/domain-model-vs-anemic-model.html">Domain model vs anemic model</a> - Learn where domain invariants belong and when entities become too passive or too busy.</li><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/refactoring-playbook.html">Refactoring playbook</a> - See practical refactoring moves for common RICA fixes.</li><li><a href="./../concepts/dependency-inversion.html">Dependency inversion</a> - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.</li><li><a href="./../concepts/solid-principles.html">SOLID principles</a> - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Identify business rules that operate on the entity&#39;s own state.</strong> This replaces branching with named behaviors, making each variation easier to test and change independently.</li><li><strong>Move them onto the entity as behavior methods.</strong> This keeps the code aligned with the entity responsibility expected by RICA-V108.</li><li><strong>If the entity genuinely is a pure data holder, verify this is intentional and rely on services for behavior.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V108 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Add behavior (methods) to the entity instead of keeping it as a pure data holder</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>anemic</code> <code>entity</code> <code>ddd</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V108.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV108 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV108 as default
};
