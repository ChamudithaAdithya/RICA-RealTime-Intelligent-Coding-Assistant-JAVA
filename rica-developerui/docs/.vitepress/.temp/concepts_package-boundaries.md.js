import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Package Boundaries","description":"","frontmatter":{},"headers":[],"relativePath":"concepts/package-boundaries.md","filePath":"concepts/package-boundaries.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "concepts/package-boundaries.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="package-boundaries" tabindex="-1">Package Boundaries <a class="header-anchor" href="#package-boundaries" aria-label="Permalink to &quot;Package Boundaries&quot;">​</a></h1><p>Java imports reveal architecture. If a file imports a class from the wrong package, the code probably depends on the wrong layer.</p><h2 id="why-packages-matter" tabindex="-1">Why Packages Matter <a class="header-anchor" href="#why-packages-matter" aria-label="Permalink to &quot;Why Packages Matter&quot;">​</a></h2><p>Packages are not only folders. They describe ownership:</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>com.example.orders.api</span></span>
<span class="line"><span>com.example.orders.application</span></span>
<span class="line"><span>com.example.orders.domain</span></span>
<span class="line"><span>com.example.orders.infrastructure</span></span></code></pre></div><p>Each package should have clear allowed dependencies.</p><h2 id="good-direction" tabindex="-1">Good Direction <a class="header-anchor" href="#good-direction" aria-label="Permalink to &quot;Good Direction&quot;">​</a></h2><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>api -&gt; application -&gt; domain</span></span>
<span class="line"><span>infrastructure -&gt; application/domain contracts</span></span></code></pre></div><p>The API layer can call the application layer. Infrastructure can implement application ports.</p><h2 id="risky-direction" tabindex="-1">Risky Direction <a class="header-anchor" href="#risky-direction" aria-label="Permalink to &quot;Risky Direction&quot;">​</a></h2><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>domain -&gt; infrastructure</span></span>
<span class="line"><span>application -&gt; api</span></span>
<span class="line"><span>repository -&gt; controller</span></span></code></pre></div><p>These imports usually mean an inner or lower-level layer knows about an outer mechanism.</p><h2 id="framework-imports" tabindex="-1">Framework Imports <a class="header-anchor" href="#framework-imports" aria-label="Permalink to &quot;Framework Imports&quot;">​</a></h2><p>Some framework imports are only valid in certain layers.</p><p>Examples:</p><ul><li><code>@GetMapping</code> belongs in controllers/resources.</li><li><code>@Query</code>, <code>@Modifying</code>, and <code>@Param</code> belong in repositories.</li><li>HTTP client and SDK classes belong in infrastructure/adapters.</li><li>JPA annotations normally belong in persistence entities or persistence models.</li></ul><h2 id="why-rica-cares" tabindex="-1">Why RICA Cares <a class="header-anchor" href="#why-rica-cares" aria-label="Permalink to &quot;Why RICA Cares&quot;">​</a></h2><p>Forbidden imports create hidden architecture dependencies. They make code harder to move, test, and reuse.</p><h2 id="practical-fix-rule" tabindex="-1">Practical Fix Rule <a class="header-anchor" href="#practical-fix-rule" aria-label="Permalink to &quot;Practical Fix Rule&quot;">​</a></h2><p>When a package imports the wrong thing, first ask whether the imported type belongs in that layer. If not, move the code to the correct layer or introduce an inward-facing interface/DTO.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("concepts/package-boundaries.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const packageBoundaries = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  packageBoundaries as default
};
