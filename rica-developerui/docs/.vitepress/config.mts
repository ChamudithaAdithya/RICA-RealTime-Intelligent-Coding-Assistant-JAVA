import { defineConfig } from 'vitepress'
import { VIOLATION_DOC_BY_CODE } from '../../src/violationCatalog'

// Build violation sidebar groups directly from the shared catalog so the docs
// navigation can never drift from the source of truth.
const byStage = new Map<string, { label: string; items: { text: string; link: string }[] }>()
for (const entry of Object.values(VIOLATION_DOC_BY_CODE)) {
  if (!byStage.has(entry.stage)) {
    byStage.set(entry.stage, { label: entry.stageLabel, items: [] })
  }
  byStage.get(entry.stage)!.items.push({
    text: `${entry.code} · ${entry.name}`,
    link: `/violations/${entry.code}`,
  })
}
const stageOrder = ['stage1', 'stage2', 'stage3', 'stage4', 'fallback']
const violationSidebar = {
  '/violations/': [
    {
      text: 'Rules',
      items: [
        { text: 'Code Reference (Rule Matrix)', link: '/rule-matrix' },
      ],
    },
    ...stageOrder
      .filter((s) => byStage.has(s))
      .map((s) => ({
        text: byStage.get(s)!.label,
        collapsed: s !== 'stage1',
        items: byStage.get(s)!.items,
      })),
  ],
}

export default defineConfig({
  lang: 'en-US',
  title: 'RICA Docs',
  description: 'RICA architecture violation codes and design guidance for Java layered projects',

  themeConfig: {
    nav: [
      { text: 'Rule Matrix', link: '/rule-matrix' },
      { text: 'Guides', link: '/guides/architecture' },
      { text: 'Concepts', link: '/concepts/' },
      { text: 'Violations', link: '/violations/RICA-V101' },
    ],
    sidebar: {
      '/concepts/': [
        {
          text: 'Concepts',
          items: [
            { text: 'Concept Index', link: '/concepts/' },
            { text: 'Layered Architecture', link: '/concepts/layered-architecture' },
            { text: 'Clean Architecture', link: '/concepts/clean-architecture' },
            { text: 'Dependency Inversion', link: '/concepts/dependency-inversion' },
            { text: 'Dependency Injection', link: '/concepts/dependency-injection' },
            { text: 'Controllers, Services, Repositories', link: '/concepts/controllers-services-repositories' },
            { text: 'Infrastructure', link: '/concepts/infrastructure' },
            { text: 'Gateways and Adapters', link: '/concepts/gateways-and-adapters' },
            { text: 'Entities, DTOs, API Contracts', link: '/concepts/entities-dtos-api-contracts' },
            { text: 'Validation and Error Boundaries', link: '/concepts/validation-and-error-boundaries' },
            { text: 'Design Pattern Basics', link: '/concepts/design-patterns' },
            { text: 'Creational Patterns', link: '/concepts/creational-patterns' },
            { text: 'Structural Patterns', link: '/concepts/structural-patterns' },
            { text: 'Behavioral Patterns', link: '/concepts/behavioral-patterns' },
            { text: 'Concurrency and Resources', link: '/concepts/concurrency-boundaries' },
            { text: 'Package Boundaries', link: '/concepts/package-boundaries' },
          ],
        },
      ],
      '/guides/': [
        {
          text: 'Guides',
          items: [
            { text: 'Layered Architecture', link: '/guides/architecture' },
            { text: 'Dependency Injection', link: '/guides/dependency-injection' },
            { text: 'Data Transfer Objects', link: '/guides/data-transfer-objects' },
            { text: 'Design Patterns', link: '/guides/design-patterns' },
            { text: 'Configuration Reference', link: '/guides/configuration' },
          ],
        },
      ],
      ...violationSidebar,
    },
    search: { provider: 'local' },
    editLink: { pattern: 'https://github.com/anomalyco/opencode/issues' },
    outline: { label: 'On this page', level: [2, 3] },
    lastUpdated: true,
  },
})
