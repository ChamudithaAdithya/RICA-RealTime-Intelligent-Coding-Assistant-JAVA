import { AiDecision } from '../../domain/ai';

/**
 * Robustly extract a JSON array of AiDecision from LLM output.
 * Tolerates code fences, prose around the JSON, and stray characters.
 */
export function parseDecisions(raw: string): AiDecision[] {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain a JSON array of decisions');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    throw new Error(`AI response was not valid JSON: ${(e as Error).message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('AI response was not a JSON array');
  }
  return parsed.map((item) => normalizeDecision(item as Record<string, unknown>));
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