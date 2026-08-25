import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Design Patterns","description":"","frontmatter":{},"headers":[],"relativePath":"guides/design-patterns.md","filePath":"guides/design-patterns.md","lastUpdated":1786862404000}');
const _sfc_main = { name: "guides/design-patterns.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="design-patterns" tabindex="-1">Design Patterns <a class="header-anchor" href="#design-patterns" aria-label="Permalink to &quot;Design Patterns&quot;">​</a></h1><p>RICA-V301–V307 flag code that hand-rolls machinery the platform already provides, or that picks the wrong structural pattern.</p><h2 id="rules" tabindex="-1">Rules <a class="header-anchor" href="#rules" aria-label="Permalink to &quot;Rules&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Rule</th><th>What it catches</th></tr></thead><tbody><tr><td><code>RICA-V301</code> Missing adapter</td><td>infrastructure/3rd-party type used directly instead of through an owning adapter (e.g. <code>RestTemplate</code>, SDK clients)</td></tr><tr><td><code>RICA-V302</code> Missing strategy</td><td>many <code>if</code>/<code>else</code> branches evaluating the same variable (replace with Strategy)</td></tr><tr><td><code>RICA-V303</code> Missing factory</td><td><code>new ConcreteType(...)</code> scattered with subtype-conditional construction</td></tr><tr><td><code>RICA-V304</code> Missing builder</td><td>object assembled with &gt;3 chained setters/constructor args (replace with Builder)</td></tr><tr><td><code>RICA-V305</code> Raw thread</td><td><code>new Thread(...)</code> or direct <code>Runnable.run()</code> (use <code>@Async</code> or a <code>TaskExecutor</code>)</td></tr><tr><td><code>RICA-V306</code> Raw executor</td><td><code>Executors.*</code> created or <code>.execute()</code> called directly (use a Spring <code>TaskExecutor</code> bean)</td></tr><tr><td><code>RICA-V307</code> Undocumented public API</td><td>public method/class without Javadoc explaining contracts</td></tr></tbody></table><p>On top of these, <code>RICA-V300</code> is the fallback code when a design-pattern rule matches but no canonical code fits — downstream tooling (e.g. the AI advisory) uses <code>V000</code> for the generic fallback instead.</p><h2 id="why" tabindex="-1">Why <a class="header-anchor" href="#why" aria-label="Permalink to &quot;Why&quot;">​</a></h2><p>Using Spring&#39;s <code>@Async</code>/<code>TaskExecutor</code> instead of raw threads keeps lifecycle and shutdown under the container, and an adapter around a 3rd-party SDK keeps the dependency isolated and swappable. Strategy/factory/builder keep the branch and construction logic small and testable.</p><h2 id="related-rules" tabindex="-1">Related rules <a class="header-anchor" href="#related-rules" aria-label="Permalink to &quot;Related rules&quot;">​</a></h2><p><code>[RICA-V301](./../violations/RICA-V301.md)</code>, <code>[RICA-V302](./../violations/RICA-V302.md)</code>, <code>[RICA-V305](./../violations/RICA-V305.md)</code>.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("guides/design-patterns.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const designPatterns = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  designPatterns as default
};
