import { AiDecision } from '../../domain/ai';

/**
 * Extract AiDecision values from either the OpenAI JSON-mode object
 * ({"decisions": [...]}) or the legacy top-level array response.
 */
export function parseDecisions(raw: string): AiDecision[] {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`AI response was not valid JSON: ${(e as Error).message}`);
    }
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch (nested) {
      throw new Error(`AI response was not valid JSON: ${(nested as Error).message}`);
    }
  }

  const decisions = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.decisions)
      ? parsed.decisions
      : undefined;
  if (!decisions) {
    throw new Error('AI response did not contain a decisions array');
  }
  return decisions
    .filter(isRecord)
    .map(normalizeDecision);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDecision(item: Record<string, unknown>): AiDecision {
  return {
    violationId: typeof item.violationId === 'string' ? item.violationId : '',
    verdict: item.verdict === 'VIOLATION' || item.verdict === 'NO_VIOLATION' || item.verdict === 'AMBIGUOUS'
      ? item.verdict
      : 'AMBIGUOUS',
    confidence: typeof item.confidence === 'number' ? Math.min(1, Math.max(0, item.confidence)) : 0,
    reasoning: typeof item.reasoning === 'string' ? item.reasoning : '',
    findings: Array.isArray(item.findings) ? (item.findings as AiDecision['findings']) : [],
    ...(typeof item.ambiguityResolution === 'object' && item.ambiguityResolution !== null
      ? { ambiguityResolution: item.ambiguityResolution as AiDecision['ambiguityResolution'] }
      : {}),
  };
}
