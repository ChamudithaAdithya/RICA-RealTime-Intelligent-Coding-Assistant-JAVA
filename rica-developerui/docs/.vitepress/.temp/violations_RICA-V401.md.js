import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V401 — Controller Bypass","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V401.md","filePath":"violations/RICA-V401.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V401.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v401-—-controller-bypass" tabindex="-1">RICA-V401 — Controller Bypass <a class="header-anchor" href="#rica-v401-—-controller-bypass" aria-label="Permalink to &quot;RICA-V401 — Controller Bypass&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "danger",
    text: "Error"
  }, null, _parent));
  _push(`<blockquote><p><strong>Stage</strong>: Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>controllerBypassRule (dependencyGraph.ts)</code> (CrossFileAnalyzer)</td></tr><tr><td>Layer</td><td>controller → repository</td></tr><tr><td>Configuration</td><td><code>enableArchitecturalChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V103.html"><code>RICA-V103</code></a>, <a href="./RICA-V114.html"><code>RICA-V114</code></a>, <a href="./RICA-V402.html"><code>RICA-V402</code></a></td></tr><tr><td>Source</td><td><code>src/dependencyGraph.ts:549</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>A Controller directly calls, holds (has-a), or uses a Repository node in the project dependency graph instead of going through a Service.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@RestController</span></span>
<span class="line"><span>public class OrderController {</span></span>
<span class="line"><span>    @Autowired private OrderRepository orderRepository; // injects repo directly</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    @GetMapping(&quot;/orders/recent&quot;)</span></span>
<span class="line"><span>    public List&lt;Order&gt; recent() {</span></span>
<span class="line"><span>        return orderRepository.findRecent(); // bypasses the service layer</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="fixed-version" tabindex="-1">Fixed version <a class="header-anchor" href="#fixed-version" aria-label="Permalink to &quot;Fixed version&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@RestController</span></span>
<span class="line"><span>public class OrderController {</span></span>
<span class="line"><span>    private final OrderService orderService;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public OrderController(OrderService orderService) {</span></span>
<span class="line"><span>        this.orderService = orderService;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    @GetMapping(&quot;/orders/recent&quot;)</span></span>
<span class="line"><span>    public List&lt;Order&gt; recent() {</span></span>
<span class="line"><span>        return orderService.recentOrders(); // service owns persistence</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="what-changed" tabindex="-1">What changed <a class="header-anchor" href="#what-changed" aria-label="Permalink to &quot;What changed&quot;">​</a></h2><p>The highlighted diff below shows the real refactor: lines marked with <code>-</code> are removed from the violating version, and lines marked with <code>+</code> are added in the fixed version.</p><div class="language-diff vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">diff</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  @RestController</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  public class OrderController {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     @Autowired private OrderRepository orderRepository; // injects repo directly</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     private final OrderService orderService;</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public OrderController(OrderService orderService) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         this.orderService = orderService;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      @GetMapping(&quot;/orders/recent&quot;)</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      public List&lt;Order&gt; recent() {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         return orderRepository.findRecent(); // bypasses the service layer</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         return orderService.recentOrders(); // service owns persistence</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>Controllers should only reach the persistence layer through services, which carry the business rules and transactional boundaries. A direct controller→repository edge lets HTTP concerns and data access bypass the domain entirely, leading to duplicated logic and inconsistent invariants.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/repository-pattern.html">Repository pattern</a> - Learn what belongs in repositories and why query annotations belong at the persistence boundary.</li><li><a href="./../concepts/dependency-graphs-and-cycles.html">Dependency graphs and cycles</a> - Learn cycles, inverted dependencies, fan-in, fan-out, and why graph rules matter.</li><li><a href="./../concepts/clean-architecture.html">Clean Architecture and dependency direction</a> - Learn why source dependencies should point inward and why framework details belong outside core code.</li><li><a href="./../concepts/package-boundaries.html">Package boundaries</a> - Learn how Java packages express architectural ownership and why forbidden imports are meaningful.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Move the repository call into a service method.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li><li><strong>Inject the service into the controller.</strong> This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.</li><li><strong>Call the service from the controller and let it touch the repository.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V401 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Inject the Repository through a Service layer instead of accessing it directly from the Controller</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>layering</code> <code>controller</code> <code>repository</code> <code>graph</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V401.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV401 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV401 as default
};
