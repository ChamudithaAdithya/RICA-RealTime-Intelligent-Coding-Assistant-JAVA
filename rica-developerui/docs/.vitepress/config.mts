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
    text: `${entry.code} - ${entry.name}`,
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
        { text: 'Rule To Concept Map', link: '/rule-concept-map' },
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
      { text: 'Rule Concepts', link: '/rule-concept-map' },
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
            { text: 'SOLID Principles', link: '/concepts/solid-principles' },
            { text: 'Separation of Concerns', link: '/concepts/separation-of-concerns' },
            { text: 'Dependency Inversion', link: '/concepts/dependency-inversion' },
            { text: 'Dependency Injection', link: '/concepts/dependency-injection' },
            { text: 'Ports and Adapters', link: '/concepts/ports-and-adapters' },
            { text: 'Controllers, Services, Repositories', link: '/concepts/controllers-services-repositories' },
            { text: 'Repository Pattern', link: '/concepts/repository-pattern' },
            { text: 'Service Layer Pattern', link: '/concepts/service-layer-pattern' },
            { text: 'Domain Model vs Anemic Model', link: '/concepts/domain-model-vs-anemic-model' },
            { text: 'Infrastructure', link: '/concepts/infrastructure' },
            { text: 'Gateways and Adapters', link: '/concepts/gateways-and-adapters' },
            { text: 'Entities, DTOs, API Contracts', link: '/concepts/entities-dtos-api-contracts' },
            { text: 'API Boundary Design', link: '/concepts/api-boundary-design' },
            { text: 'Validation and Error Boundaries', link: '/concepts/validation-and-error-boundaries' },
            { text: 'Transaction Boundaries', link: '/concepts/transaction-boundaries' },
            { text: 'Framework Coupling', link: '/concepts/framework-coupling' },
            { text: 'Dependency Graphs and Cycles', link: '/concepts/dependency-graphs-and-cycles' },
            { text: 'Static Analysis Basics', link: '/concepts/static-analysis-basics' },
            { text: 'False Positives and Rule Tuning', link: '/concepts/false-positives-and-rule-tuning' },
            { text: 'Refactoring Playbook', link: '/concepts/refactoring-playbook' },
            { text: 'Spring Architecture Guide', link: '/concepts/spring-architecture-guide' },
            { text: 'Testing Architecture Fixes', link: '/concepts/testing-architecture-fixes' },
            { text: 'Glossary', link: '/concepts/glossary' },
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
