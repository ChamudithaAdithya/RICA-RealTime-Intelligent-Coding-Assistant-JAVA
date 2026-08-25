import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V109 — Improper Data Access","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V109.md","filePath":"violations/RICA-V109.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V109.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v109-—-improper-data-access" tabindex="-1">RICA-V109 — Improper Data Access <a class="header-anchor" href="#rica-v109-—-improper-data-access" aria-label="Permalink to &quot;RICA-V109 — Improper Data Access&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "danger",
    text: "Error"
  }, null, _parent));
  _push(`<blockquote><p><strong>Stage</strong>: Stage 1 — Layer-Specific Detectors</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>EntityLayerAnalyzer</code> (EntityLayer)</td></tr><tr><td>Layer</td><td>entity</td></tr><tr><td>Configuration</td><td><code>enableDesignPatternChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V114.html"><code>RICA-V114</code></a>, <a href="./RICA-V401.html"><code>RICA-V401</code></a></td></tr><tr><td>Source</td><td><code>src/entityLayerDetector.ts:101</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>An Entity holds a field of a database type (JdbcTemplate, EntityManager, DataSource, JDBC types, Hibernate/ORM types), calls a database API, or constructs a database access object.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@Entity</span></span>
<span class="line"><span>public class AuditLog {</span></span>
<span class="line"><span>    @Autowired private JdbcTemplate jdbcTemplate;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public List&lt;String&gt; recent(int limit) {</span></span>
<span class="line"><span>        return jdbcTemplate.queryForList(</span></span>
<span class="line"><span>            &quot;SELECT message FROM audit_log ORDER BY id DESC LIMIT ?&quot;, String.class, limit);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="fixed-version" tabindex="-1">Fixed version <a class="header-anchor" href="#fixed-version" aria-label="Permalink to &quot;Fixed version&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@Entity</span></span>
<span class="line"><span>public class AuditLogEntry {</span></span>
<span class="line"><span>    private Long id;</span></span>
<span class="line"><span>    private String message;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>@Repository</span></span>
<span class="line"><span>public class AuditLogRepository {</span></span>
<span class="line"><span>    private final JdbcTemplate jdbcTemplate;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public List&lt;String&gt; recent(int limit) { /* data access here */ }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="what-changed" tabindex="-1">What changed <a class="header-anchor" href="#what-changed" aria-label="Permalink to &quot;What changed&quot;">​</a></h2><p>The highlighted diff below shows the real refactor: lines marked with <code>-</code> are removed from the violating version, and lines marked with <code>+</code> are added in the fixed version.</p><div class="language-diff vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">diff</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  @Entity</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">- public class AuditLog {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     @Autowired private JdbcTemplate jdbcTemplate;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+ public class AuditLogEntry {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     private Long id;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     private String message;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+ }</span></span>
<span class="line"></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     public List&lt;String&gt; recent(int limit) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         return jdbcTemplate.queryForList(</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-             &quot;SELECT message FROM audit_log ORDER BY id DESC LIMIT ?&quot;, String.class, limit);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+ @Repository</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+ public class AuditLogRepository {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     private final JdbcTemplate jdbcTemplate;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public List&lt;String&gt; recent(int limit) { /* data access here */ }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>Entities must not manage persistence. Embedding JDBC/JPA access in an entity couples the domain object to a specific storage technology, breaks portability across data sources, and mixes persistence concerns into the domain. Data access belongs in repositories.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/repository-pattern.html">Repository pattern</a> - Learn what belongs in repositories and why query annotations belong at the persistence boundary.</li><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/refactoring-playbook.html">Refactoring playbook</a> - See practical refactoring moves for common RICA fixes.</li><li><a href="./../concepts/dependency-inversion.html">Dependency inversion</a> - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.</li><li><a href="./../concepts/behavioral-patterns.html">Behavioral patterns</a> - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Remove database fields and APIs from the entity.</strong> This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.</li><li><strong>Create (or use) a repository that owns all data access.</strong> This keeps persistence behind the correct boundary, so domain and presentation code do not depend on storage details.</li><li><strong>Have the service coordinate repository calls and entity changes.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V109 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Entities should not contain data access logic — move to Repository</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>jdbc</code> <code>jpa</code> <code>entity</code> <code>repository</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V109.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV109 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV109 as default
};
