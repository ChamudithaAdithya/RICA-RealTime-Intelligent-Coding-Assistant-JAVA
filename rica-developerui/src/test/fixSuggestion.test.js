const assert = require('assert');
const { FixSuggestionEngine } = require('../fixSuggestionEngine');

describe('FixSuggestionEngine', () => {
  const engine = new FixSuggestionEngine();

  it('should create a previewable injection edit for uninjected repository fields', () => {
    const [violation] = engine.enrich([{
      id: 'v102',
      code: 'RICA-V102',
      ruleName: 'ServiceLayer: uninjected repository access',
      severity: 'error',
      message: 'Service class has uninjected repository field',
      filePath: 'src/main/java/com/example/OrderService.java',
      lineNumber: 7,
      mitigationHint: 'Inject repository',
      legacyType: 'uninjected-repository-access',
      detectorSource: 'ServiceLayer',
      contextMetadata: {
        fieldName: 'orderRepository',
        targetComponent: 'OrderRepository',
      },
    }]);

    assert.ok(violation.remediationSuggestions.length >= 2);
    const editSuggestion = violation.remediationSuggestions.find(s => s.edits && s.edits.length);
    assert.ok(editSuggestion, 'should include an editable suggestion');
    assert.match(editSuggestion.title, /Preview: insert @Autowired/);
    assert.match(editSuggestion.description, /Constructor injection/);
    assert.match(editSuggestion.steps[0], /Preview the edit/);
    assert.strictEqual(editSuggestion.safety, 'preview-required');
    assert.strictEqual(editSuggestion.edits[0].text, '@Autowired');
    assert.strictEqual(editSuggestion.edits[0].line, 7);
    assert.ok(violation.quickFix, 'editable remediation should be exposed as quickFix');
  });

  it('should give manual design guidance for god facade without unsafe edits', () => {
    const [violation] = engine.enrich([{
      id: 'v302',
      code: 'RICA-V302',
      ruleName: 'DesignPattern: god facade',
      severity: 'warning',
      message: 'MegaFacade has high fan-in and mostly delegation methods',
      filePath: 'src/main/java/com/example/MegaFacade.java',
      lineNumber: 10,
      mitigationHint: 'Split facade responsibilities',
      legacyType: 'god-facade',
      detectorSource: 'DesignPatternAnalyzer',
      contextMetadata: {
        targetComponent: 'MegaFacade',
      },
    }]);

    assert.strictEqual(violation.remediationSuggestions.length, 1);
    assert.strictEqual(violation.remediationSuggestions[0].safety, 'manual-design-required');
    assert.ok(!violation.remediationSuggestions[0].edits);
    assert.ok(!violation.quickFix, 'manual design guidance should not become an automatic edit');
  });
});
