import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V107 — Direct Layer Access","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V107.md","filePath":"violations/RICA-V107.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V107.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v107-—-direct-layer-access" tabindex="-1">RICA-V107 — Direct Layer Access <a class="header-anchor" href="#rica-v107-—-direct-layer-access" aria-label="Permalink to &quot;RICA-V107 — Direct Layer Access&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "danger",
    text: "Error"
  }, null, _parent));
  _push(`<blockquote><p><strong>Stage</strong>: Stage 1 — Layer-Specific Detectors</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>EntityLayerAnalyzer</code> (EntityLayer)</td></tr><tr><td>Layer</td><td>entity</td></tr><tr><td>Configuration</td><td><code>enableDesignPatternChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V401.html"><code>RICA-V401</code></a>, <a href="./RICA-V402.html"><code>RICA-V402</code></a></td></tr><tr><td>Source</td><td><code>src/entityLayerDetector.ts:85</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>An Entity holds a field, calls a method, or instantiates a service, repository, or infrastructure class directly.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@Entity</span></span>
<span class="line"><span>public class User {</span></span>
<span class="line"><span>    @Autowired private AuditService auditService; // wrong layer</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public void disable() {</span></span>
<span class="line"><span>        auditService.log(&quot;disabled&quot;); // entity reaches up</span></span>
<span class="line"><span>        this.enabled = false;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="fixed-version" tabindex="-1">Fixed version <a class="header-anchor" href="#fixed-version" aria-label="Permalink to &quot;Fixed version&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@Entity</span></span>
<span class="line"><span>public class User {</span></span>
<span class="line"><span>    private boolean enabled = true;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public void disable() { this.enabled = false; }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// Service layer owns the audit call</span></span>
<span class="line"><span>@Transactional</span></span>
<span class="line"><span>public void disableUser(long id) {</span></span>
<span class="line"><span>    User user = userRepository.findById(id);</span></span>
<span class="line"><span>    user.disable();</span></span>
<span class="line"><span>    auditService.log(&quot;disabled &quot; + id);</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="what-changed" tabindex="-1">What changed <a class="header-anchor" href="#what-changed" aria-label="Permalink to &quot;What changed&quot;">​</a></h2><p>The highlighted diff below shows the real refactor: lines marked with <code>-</code> are removed from the violating version, and lines marked with <code>+</code> are added in the fixed version.</p><div class="language-diff vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">diff</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  @Entity</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  public class User {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     @Autowired private AuditService auditService; // wrong layer</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     private boolean enabled = true;</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     public void disable() {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         auditService.log(&quot;disabled&quot;); // entity reaches up</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         this.enabled = false;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public void disable() { this.enabled = false; }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+ // Service layer owns the audit call</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+ @Transactional</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+ public void disableUser(long id) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     User user = userRepository.findById(id);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     user.disable();</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     auditService.log(&quot;disabled &quot; + id);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+ }</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>Entities are the innermost domain layer; they must not know about services, repositories, or infrastructure. Such references are not persisted, break serialization, and tangle the domain with upper layers so entities can no longer be reused across data sources or tested without bootstrapping the whole application.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/refactoring-playbook.html">Refactoring playbook</a> - See practical refactoring moves for common RICA fixes.</li><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/service-layer-pattern.html">Service Layer pattern</a> - Learn why business use cases should be orchestrated in services rather than controllers or repositories.</li><li><a href="./../concepts/solid-principles.html">SOLID principles</a> - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.</li><li><a href="./../concepts/spring-architecture-guide.html">Spring architecture guide</a> - Learn Spring-specific placement for controllers, services, repositories, validation, transactions, and error handling.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Remove service/repository/infrastructure fields and calls from the entity.</strong> This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.</li><li><strong>Have the service layer coordinate domain objects and perform data access.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li><li><strong>If the entity needs derived data, compute it in the service and pass it in.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V107 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Access external layers through the Service layer instead of directly</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>layering</code> <code>entity</code> <code>dependency-rule</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V107.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV107 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV107 as default
};
