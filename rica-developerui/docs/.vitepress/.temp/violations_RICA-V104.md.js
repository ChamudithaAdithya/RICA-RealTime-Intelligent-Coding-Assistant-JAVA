import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V104 — Anemic Service","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V104.md","filePath":"violations/RICA-V104.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V104.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v104-—-anemic-service" tabindex="-1">RICA-V104 — Anemic Service <a class="header-anchor" href="#rica-v104-—-anemic-service" aria-label="Permalink to &quot;RICA-V104 — Anemic Service&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "warning",
    text: "Warning"
  }, null, _parent));
  _push(`<blockquote><p><strong>Stage</strong>: Stage 1 — Layer-Specific Detectors</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>ServiceLayerAnalyzer</code> (ServiceLayer)</td></tr><tr><td>Layer</td><td>service</td></tr><tr><td>Configuration</td><td><code>enableDesignPatternChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V106.html"><code>RICA-V106</code></a>, <a href="./RICA-V108.html"><code>RICA-V108</code></a></td></tr><tr><td>Source</td><td><code>src/serviceLayerDetector.ts:141</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>A <code>@Service</code> class has zero concrete methods, or has at least two concrete methods where every one of them is only an accessor or a trivial pass-through delegation with no business logic, no branching, and no meaningful body.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@Service</span></span>
<span class="line"><span>public class OrderService {</span></span>
<span class="line"><span>    private final OrderRepository repo;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public OrderService(OrderRepository repo) { this.repo = repo; }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public List&lt;Order&gt; findAll() { return repo.findAll(); }</span></span>
<span class="line"><span>    public Order findById(long id) { return repo.findById(id); }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="fixed-version" tabindex="-1">Fixed version <a class="header-anchor" href="#fixed-version" aria-label="Permalink to &quot;Fixed version&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@Service</span></span>
<span class="line"><span>public class OrderService {</span></span>
<span class="line"><span>    private final OrderRepository repo;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public OrderService(OrderRepository repo) { this.repo = repo; }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public List&lt;Order&gt; findAll() { return repo.findAll(); }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public void place(Order order) {</span></span>
<span class="line"><span>        order.assertValid();</span></span>
<span class="line"><span>        if (!order.isBelowLimit()) {</span></span>
<span class="line"><span>            throw new OrderLimitException(&quot;over limit&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        repo.save(order);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="what-changed" tabindex="-1">What changed <a class="header-anchor" href="#what-changed" aria-label="Permalink to &quot;What changed&quot;">​</a></h2><p>The highlighted diff below shows the real refactor: lines marked with <code>-</code> are removed from the violating version, and lines marked with <code>+</code> are added in the fixed version.</p><div class="language-diff vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">diff</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  @Service</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  public class OrderService {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      private final OrderRepository repo;</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      public OrderService(OrderRepository repo) { this.repo = repo; }</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      public List&lt;Order&gt; findAll() { return repo.findAll(); }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     public Order findById(long id) { return repo.findById(id); }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public void place(Order order) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         order.assertValid();</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         if (!order.isBelowLimit()) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+             throw new OrderLimitException(&quot;over limit&quot;);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         repo.save(order);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>Services are the natural home for business rules: validation, calculations, orchestration, and state transitions. When a service is nothing but getters and delegation, that logic has leaked into controllers, entities, or helpers — making it untestable in isolation and harder to reason about. RICA flags it so behavior can be pulled back into the layer that owns it.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/service-layer-pattern.html">Service Layer pattern</a> - Learn why business use cases should be orchestrated in services rather than controllers or repositories.</li><li><a href="./../concepts/refactoring-playbook.html">Refactoring playbook</a> - See practical refactoring moves for common RICA fixes.</li><li><a href="./../concepts/behavioral-patterns.html">Behavioral patterns</a> - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.</li><li><a href="./../concepts/spring-architecture-guide.html">Spring architecture guide</a> - Learn Spring-specific placement for controllers, services, repositories, validation, transactions, and error handling.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Move validation, calculation, and orchestration logic from controllers/entities into the service.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li><li><strong>Give the service at least one method that embodies a business rule (beyond a single call-through).</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li><li><strong>If the class genuinely has no behavior, reconsider whether it should be a service at all.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V104 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Move business logic from controllers/entities into this service class</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>anemic</code> <code>service</code> <code>business-logic</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V104.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV104 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV104 as default
};
