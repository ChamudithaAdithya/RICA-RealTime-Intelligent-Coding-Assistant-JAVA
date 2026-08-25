import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"RICA-V111 — File I/O in Controller","description":"","frontmatter":{},"headers":[],"relativePath":"violations/RICA-V111.md","filePath":"violations/RICA-V111.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "violations/RICA-V111.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Badge = resolveComponent("Badge");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="rica-v111-—-file-i-o-in-controller" tabindex="-1">RICA-V111 — File I/O in Controller <a class="header-anchor" href="#rica-v111-—-file-i-o-in-controller" aria-label="Permalink to &quot;RICA-V111 — File I/O in Controller&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Badge, {
    type: "danger",
    text: "Error"
  }, null, _parent));
  _push(`<blockquote><p><strong>Stage</strong>: Stage 1 — Layer-Specific Detectors</p></blockquote><table tabindex="0"><thead><tr><th></th><th></th></tr></thead><tbody><tr><td>Detector</td><td><code>ControllerLayerAnalyzer</code> (ControllerLayer)</td></tr><tr><td>Layer</td><td>controller</td></tr><tr><td>Configuration</td><td><code>enableDesignPatternChecks</code></td></tr><tr><td>Related rules</td><td><a href="./RICA-V103.html"><code>RICA-V103</code></a></td></tr><tr><td>Source</td><td><code>src/controllerLayerDetector.ts:210</code></td></tr></tbody></table><h2 id="trigger" tabindex="-1">Trigger <a class="header-anchor" href="#trigger" aria-label="Permalink to &quot;Trigger&quot;">​</a></h2><p>A Controller method creates or calls file types (File, Files, Path, InputStream/Reader/Writer, FileChannel, etc.) directly.</p><h3 id="violating-example" tabindex="-1">Violating example <a class="header-anchor" href="#violating-example" aria-label="Permalink to &quot;Violating example&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@RestController</span></span>
<span class="line"><span>public class ExportController {</span></span>
<span class="line"><span>    @GetMapping(&quot;/export&quot;)</span></span>
<span class="line"><span>    public String export() throws IOException {</span></span>
<span class="line"><span>        Path p = Paths.get(&quot;/tmp/report.txt&quot;);</span></span>
<span class="line"><span>        Files.write(p, &quot;hello&quot;.getBytes());</span></span>
<span class="line"><span>        return Files.readString(p);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="fixed-version" tabindex="-1">Fixed version <a class="header-anchor" href="#fixed-version" aria-label="Permalink to &quot;Fixed version&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>@RestController</span></span>
<span class="line"><span>public class ExportController {</span></span>
<span class="line"><span>    private final ReportFileService reportFileService;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    public ExportController(ReportFileService reportFileService) {</span></span>
<span class="line"><span>        this.reportFileService = reportFileService;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    @GetMapping(&quot;/export&quot;)</span></span>
<span class="line"><span>    public String export() {</span></span>
<span class="line"><span>        return reportFileService.export();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="what-changed" tabindex="-1">What changed <a class="header-anchor" href="#what-changed" aria-label="Permalink to &quot;What changed&quot;">​</a></h2><p>The highlighted diff below shows the real refactor: lines marked with <code>-</code> are removed from the violating version, and lines marked with <code>+</code> are added in the fixed version.</p><div class="language-diff vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">diff</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  @RestController</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  public class ExportController {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     private final ReportFileService reportFileService;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public ExportController(ReportFileService reportFileService) {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         this.reportFileService = reportFileService;</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      @GetMapping(&quot;/export&quot;)</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-     public String export() throws IOException {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         Path p = Paths.get(&quot;/tmp/report.txt&quot;);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         Files.write(p, &quot;hello&quot;.getBytes());</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#B31D28", "--shiki-dark": "#FDAEB7" })}">-         return Files.readString(p);</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+     public String export() {</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#22863A", "--shiki-dark": "#85E89D" })}">+         return reportFileService.export();</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">      }</span></span>
<span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#24292E", "--shiki-dark": "#E1E4E8" })}">  }</span></span></code></pre></div><h2 id="why-it-matters" tabindex="-1">Why it matters <a class="header-anchor" href="#why-it-matters" aria-label="Permalink to &quot;Why it matters&quot;">​</a></h2><p>Controllers should not read or write the file system. File handling involves paths, permissions, streaming, and lifecycle concerns that belong in a dedicated service, keeping the controller free of I/O concerns and testable without touching disk.</p><h2 id="learn-the-concepts-behind-this-rule" tabindex="-1">Learn the concepts behind this rule <a class="header-anchor" href="#learn-the-concepts-behind-this-rule" aria-label="Permalink to &quot;Learn the concepts behind this rule&quot;">​</a></h2><p>These background pages explain the architecture and pattern vocabulary used by this rule:</p><ul><li><a href="./../concepts/refactoring-playbook.html">Refactoring playbook</a> - See practical refactoring moves for common RICA fixes.</li><li><a href="./../concepts/layered-architecture.html">Layered architecture</a> - Understand controllers, services, repositories, entities, and why each layer has a narrow job.</li><li><a href="./../concepts/controllers-services-repositories.html">Controllers, services, and repositories</a> - See the practical difference between inbound HTTP handling, business workflows, and persistence access.</li><li><a href="./../concepts/spring-architecture-guide.html">Spring architecture guide</a> - Learn Spring-specific placement for controllers, services, repositories, validation, transactions, and error handling.</li><li><a href="./../concepts/separation-of-concerns.html">Separation of concerns</a> - Learn why HTTP handling, business decisions, persistence, validation, and external calls should stay separate.</li><li><a href="./../concepts/dependency-injection.html">Dependency injection</a> - Understand constructor injection, field injection, containers, and why direct new calls are risky.</li></ul><h2 id="how-to-fix" tabindex="-1">How to fix <a class="header-anchor" href="#how-to-fix" aria-label="Permalink to &quot;How to fix&quot;">​</a></h2><p>Use this as the practical checklist. Each item explains both the action and the reason behind it.</p><ol><li><strong>Extract file operations into a service class.</strong> This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.</li><li><strong>Inject the file-service into the controller.</strong> This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.</li></ol><h2 id="how-to-verify" tabindex="-1">How to verify <a class="header-anchor" href="#how-to-verify" aria-label="Permalink to &quot;How to verify&quot;">​</a></h2><ol><li>Re-run RICA on the changed file or project.</li><li>Confirm RICA-V111 no longer appears at the same location.</li><li>Run the project tests for the changed feature, because architecture fixes should preserve behavior.</li></ol><h2 id="mitigation-hint" tabindex="-1">Mitigation hint <a class="header-anchor" href="#mitigation-hint" aria-label="Permalink to &quot;Mitigation hint&quot;">​</a></h2><blockquote><p>Move file I/O operations to a service class injected into the controller</p></blockquote><h2 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h2><p><code>file-io</code> <code>controller</code> <code>service</code></p><hr><p><em>This page is generated from <code>src/violationCatalog.ts</code> by <code>scripts/generate-docs.cjs</code>. Do not edit by hand.</em></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("violations/RICA-V111.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RICAV111 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  RICAV111 as default
};
