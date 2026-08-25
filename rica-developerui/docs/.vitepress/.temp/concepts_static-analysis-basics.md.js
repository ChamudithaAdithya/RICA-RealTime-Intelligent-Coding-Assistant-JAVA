import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Static Analysis Basics","description":"","frontmatter":{},"headers":[],"relativePath":"concepts/static-analysis-basics.md","filePath":"concepts/static-analysis-basics.md","lastUpdated":null}');
const _sfc_main = { name: "concepts/static-analysis-basics.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="static-analysis-basics" tabindex="-1">Static Analysis Basics <a class="header-anchor" href="#static-analysis-basics" aria-label="Permalink to &quot;Static Analysis Basics&quot;">​</a></h1><p>Static analysis inspects source code without running the program.</p><p>RICA reads Java files, extracts structure, and checks for patterns that usually indicate architecture or design problems.</p><h2 id="what-rica-can-see" tabindex="-1">What RICA Can See <a class="header-anchor" href="#what-rica-can-see" aria-label="Permalink to &quot;What RICA Can See&quot;">​</a></h2><p>RICA can inspect:</p><ul><li>packages and imports</li><li>class names and annotations</li><li>method declarations</li><li>fields and constructor dependencies</li><li>method calls</li><li><code>new</code> expressions</li><li>common framework types</li><li>dependency graph edges</li></ul><h2 id="what-rica-cannot-perfectly-know" tabindex="-1">What RICA Cannot Perfectly Know <a class="header-anchor" href="#what-rica-cannot-perfectly-know" aria-label="Permalink to &quot;What RICA Cannot Perfectly Know&quot;">​</a></h2><p>Static analysis cannot always know runtime behavior.</p><p>Examples:</p><ul><li>dependency injection may happen through configuration not visible in the file</li><li>reflection may create hidden calls</li><li>framework conventions may wire code dynamically</li><li>a package name may not match the actual intended layer</li><li>a test fixture may intentionally violate production rules</li></ul><h2 id="why-some-rules-are-heuristic" tabindex="-1">Why Some Rules Are Heuristic <a class="header-anchor" href="#why-some-rules-are-heuristic" aria-label="Permalink to &quot;Why Some Rules Are Heuristic&quot;">​</a></h2><p>A heuristic is a practical detection rule based on strong signals. It is not mathematical proof.</p><p>For example, a controller method with many loops and branches is a strong signal for business logic in the wrong layer, but the analyzer still needs thresholds and context.</p><h2 id="related-rica-rules" tabindex="-1">Related RICA Rules <a class="header-anchor" href="#related-rica-rules" aria-label="Permalink to &quot;Related RICA Rules&quot;">​</a></h2><p>All RICA rules use static analysis. Graph and design-pattern rules are especially heuristic because they infer design intent from code shape.</p><h2 id="practical-fix-rule" tabindex="-1">Practical Fix Rule <a class="header-anchor" href="#practical-fix-rule" aria-label="Permalink to &quot;Practical Fix Rule&quot;">​</a></h2><p>Treat RICA findings as architecture evidence. Confirm the code context, then either refactor the code or tune the rule configuration.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("concepts/static-analysis-basics.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const staticAnalysisBasics = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  staticAnalysisBasics as default
};
