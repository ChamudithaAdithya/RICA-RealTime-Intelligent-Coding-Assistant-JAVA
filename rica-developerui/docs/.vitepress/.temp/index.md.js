import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"RICA","text":"Architecture violation codes and design guidance for Java layered projects","tagline":"Every code the analyzers can emit, documented from a single source of truth in src/violationCatalog.ts.","actions":[{"theme":"brand","text":"Rule Matrix","link":"/rule-matrix"},{"theme":"alt","text":"Concepts","link":"/concepts/"},{"theme":"alt","text":"Guides","link":"/guides/architecture"}]},"features":[{"title":"Layered architecture","details":"Controllers, services, repositories, entities, and what belongs where."},{"title":"Cross-file graph rules","details":"Controller bypass, cross-layer leaks, cyclic dependencies, and inverted dependencies."},{"title":"Design patterns and boundaries","details":"Strategy, factory, threading discipline, package boundaries, and dependency direction."},{"title":"Concept library","details":"Plain-language explanations of infrastructure, gateways, dependency inversion, DTOs, and design-pattern families."}]},"headers":[],"relativePath":"index.md","filePath":"index.md","lastUpdated":1787628223000}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
