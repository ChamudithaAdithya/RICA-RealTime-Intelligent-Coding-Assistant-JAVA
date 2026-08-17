import { AiDecision } from '../../domain/ai';

/**
 * Robustly extract a JSON array of AiDecision from LLM output.
 * Tolerates code fences, prose around the JSON, nested arrays, and stray characters.
 * Set AI_DEBUG_RAW=1 to print the raw model reply on parse failure.
 */
export function parseDecisions(raw: string): AiDecision[] {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const parsed = bestEffortParse(cleaned);
  if (parsed === undefined) {
    if (process.env.AI_DEBUG_RAW === '1') {
      console.error('[parseDecisions] RAW AI RESPONSE >>>\n' + cleaned + '\n<<< END');
    }
    throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 300)}`);
  }
  return parsed.map((item) => normalizeDecision(item as Record<string, unknown>));
}

/**
 * Try every `[`..`]` span in the reply and return the longest span that parses.
 * Handles prose wrapped around the array, multiple candidate arrays, and nested
 * arrays (quickFix.edits) that confuse naive first/last bracket extraction.
 */
function bestEffortParse(text: string): unknown[] | undefined {
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === '[') starts.push(i);
  if (starts.length === 0) return undefined;

  let best: unknown[] | undefined;
  for (const s of starts) {
    for (let e = text.length - 1; e > s; e--) {
      if (text[e] !== ']') continue;
      try {
        const candidate: unknown = JSON.parse(text.slice(s, e + 1));
        if (Array.isArray(candidate) && candidate.length > 0) {
          if (!best || JSON.stringify(candidate).length > JSON.stringify(best).length) {
            best = candidate;
          }
          break; // Longest valid span for this start is rightmost; try next start for reach.
        }
      } catch {
        // Not valid at this close bracket — keep searching left/right.
      }
    }
  }
  return best;
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