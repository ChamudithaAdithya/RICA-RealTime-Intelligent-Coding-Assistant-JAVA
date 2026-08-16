---
layout: home

hero:
  name: RICA
  text: Architecture violation codes and design guidance for Java layered projects
  tagline: Every code the analyzers can emit, documented from a single source of truth in src/violationCatalog.ts.
  actions:
    - theme: brand
      text: Rule Matrix
      link: /rule-matrix
    - theme: alt
      text: Guides
      link: /guides/architecture

features:
  - title: Layered architecture
    details: Controllers, services, repositories, entities — what belongs where and the violations RICA-V101–V114 catch.
  - title: Cross-file graph rules
    details: Controller bypass, cross-layer leaks, cyclic and inverted dependencies (V401–V404), detected from the dependency graph.
  - title: Design patterns & boundaries
    details: Strategy/factory usage, threading discipline (V301–V307) and package-boundary enforcement (V501).

---