import { AiContextPayload, AiDecision } from '../../domain/ai';

export interface AiDecisionProvider {
  /** Whether the configured provider is reachable and ready (e.g. endpoint ping). Called before a run. */
  isAvailable(): Promise<boolean>;
  /** Send the bounded context and receive structured decisions. Implementations must enforce timeout. */
  evaluate(context: AiContextPayload): Promise<AiDecision[]>;
}