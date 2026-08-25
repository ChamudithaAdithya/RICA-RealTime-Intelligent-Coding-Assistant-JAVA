import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V106 — Business Logic in the Wrong Layer","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V106.md","filePath":"violations/RICA-V106.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V106.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v106-—-business-logic-in-the-wrong-layer" tabindex="-1">RICA-V106 — Business Logic in the Wrong Layer <a class="header-anchor" href="#rica-v106-—-business-logic-in-the-wrong-layer" aria-label="Permalink to &quot;RICA-V106 — Business Logic in the Wrong Layer&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "warning",
    text: "Warning"
  }, null, _parent));
  _push(`<blockquote><p><strong>Stage</strong>: Stage 1 — Layer-Specific Detectors</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>ControllerLayerAnalyzer / EntityLayerAnalyzer</code> (ControllerLayer)</td></tr><tr><td>Layer</td><td>controller / entity</td></tr><tr><td>Configuration</td><td><code>enableBusinessLogicChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V104.html"><code>RICA-V104</code></a>, <a href="./RICA-V204.html"><code>RICA-V204</code></a></td></tr><tr><td>Source</td><td><code>src/controllerLayerDetector.ts:347</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>A Controller or Entity method has a business-logic score at or above the configured threshold (default 3). The score grows with the number of loops, conditionals, comparisons, and data-manipulation operators in the method body.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@RestController</span></span>
<span class="line"><span>public class OrderController {</span></span>
<span class="line"><span>    @PostMapping(&quot;/orders/apply&quot;)</span></span>
<span class="line"><span>    public double apply(@RequestBody Order order) {</span></span>
<span class="line"><span>        double total = 0;</span></span>
<span class="line"><span>        for (Item i : order.getItems()) {</span></span>
<span class="line"><span>            if (i.isDiscounted()) { total += i.getPrice() * 0.9; }</span></span>
<span class="line"><span>            else { total += i.getPrice() * i.getQty(); }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if (total &gt; 1000) total -= 50;</span></span>
<span class="line"><span>        return total;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="fixed-version" tabindex="-1">Fixed version <a class="header-anchor" href="#fixed-version" aria-label="Permalink to &quot;Fixed version&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@RestController</span></span>
<span class="line"><span>public class OrderController {</span></span>
<span class="line"><span>    private final OrderService orderService;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    @PostMapping(&quot;/orders/apply&quot;)</span></span>
<span class="line"><span>    public double apply(@RequestBody OrderRequest req) {</span></span>
<span class="line"><span>        return orderService.calculateTotal(req.toOrder());</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="what-changed" tabindex="-1">What changed <a class="header-anchor" href="#what-changed" aria-label="Permalink to &quot;What changed&quot;">​</a></h2><p>The highlighted diff below shows the real refactor: lines marked with <code>-</code> are removed from the violating version, and lines marked with <code>+</code> are added in the fixed version.</p><div class="language-diff vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">diff</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  @RestController</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  public class OrderController {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     private final OrderService orderService;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      @PostMapping(&quot;/orders/apply&quot;)</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     public double apply(@RequestBody Order order) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         double total = 0;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         for (Item i : order.getItems()) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-             if (i.isDiscounted()) { total += i.getPrice() * 0.9; }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-             else { total += i.getPrice() * i.getQty(); }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         if (total &gt; 1000) total -= 50;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         return total;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public double apply(@RequestBody OrderRequest req) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         return orderService.calculateTotal(req.toOrder());</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>Controllers should only orchestrate HTTP concerns (parse input, call services, shape responses) and entities should only guard their own invariants. Complex decision-making and data manipulation in these layers makes the logic untestable without HTTP/persistence infrastructure and scatters business rules away from the service layer where they belong.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/separation-of-concerns.html">Separation of concerns</a> - Learn why HTTP handling, business decisions, persistence, validation, and external calls should stay separate.</li><li><a href="./../concepts/domain-model-vs-anemic-model.html">Domain model vs anemic model</a> - Learn where domain invariants belong and when entities become too passive or too busy.</li><li><a href="./../concepts/service-layer-pattern.html">Service Layer pattern</a> - Learn why business use cases should be orchestrated in services rather than controllers or repositories.</li><li><a href="./../concepts/refactoring-playbook.html">Refactoring playbook</a> - See practical refactoring moves for common RICA fixes.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Extract the branches/loops/calculations into a service method.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li><li><strong>Call that service from the controller/entity.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li><li><strong>Keep the controller and entity thin enough that their bodies are mostly delegation.</strong> This keeps the code aligned with the controller / entity responsibility expected by RICA-V106.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V106 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Business logic should be in the Service layer, not in Controllers or Entities</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>business-logic</code> <code>controller</code> <code>entity</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V106.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV106 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV106 as default
};
