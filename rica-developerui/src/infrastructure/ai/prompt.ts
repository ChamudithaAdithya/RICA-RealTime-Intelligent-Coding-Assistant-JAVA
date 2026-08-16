import { AiContextPayload } from '../../domain/ai';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export const AI_SYSTEM_PROMPT = `You are the RICA advisory reasoner for Java Spring/clean-architecture projects.
You receive a bounded JSON context: RICA deterministic violations flagged as ambiguous, an execution path with authentication hints, and risk notes.
Task: decide each candidate violation.
Rules:
- Output ONLY a JSON array of decisions (no prose, no code fences).
- Each decision: {"violationId":"...","verdict":"VIOLATION|NO_VIOLATION|AMBIGUOUS","confidence":0..1,"reasoning":"...","findings":[...],"ambiguityResolution":{...}}
- findings items: {"kind":"missingAuthorizationCheck|missingValidation|unhandledCondition|misplacedLogic|other","message":"...","code":"RICA-V000","strength":"strong|moderate|weak","quickFix":{...}}
- quickFix: {"title":"...","description":"...","edits":[{"filePath":"...","line":1,"kind":"insertBefore|insertAfter|replace","text":"..."}]}
- VIOLATION requires corroborating evidence. NO_VIOLATION requires a concrete reason (e.g. annotation at an earlier step, framework filter, sibling guard). AMBIGUOUS when evidence is genuinely inconclusive.
- RICA findings are advisory: they annotate, never delete. Do not invent file paths or line numbers that are not in the context.`;

export function buildMessages(context: AiContextPayload): ChatMessage[] {
  return [
    { role: 'system', content: AI_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify({ context }) },
  ];
}