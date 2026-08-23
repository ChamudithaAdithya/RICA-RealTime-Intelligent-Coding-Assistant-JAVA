import { Annotation } from './domain/astTypes';
import { DiagnosticRange } from './domain/violations';

export function rawTypeName(typeName: string): string {
  return (typeName || '').replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
}

export function simpleTypeName(typeName: string): string {
  const raw = rawTypeName(typeName);
  return raw.split('.').pop() || raw;
}

export function typeTokens(typeName: string): string[] {
  return (typeName || '').match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) || [];
}

export function hasAnnotation(annotations: Annotation[] | undefined, names: Iterable<string>): boolean {
  if (!annotations) return false;
  const wanted = new Set(names);
  return annotations.some(annotation => {
    const simple = annotation.name.split('.').pop() || annotation.name;
    return wanted.has(annotation.name) || wanted.has(simple);
  });
}

export function lineRange(
  startLine?: number,
  startColumn = 0,
  endLine?: number,
  endColumn?: number,
): DiagnosticRange | undefined {
  if (!startLine) return undefined;
  return {
    start: { line: startLine, character: startColumn },
    end: { line: endLine || startLine, character: endColumn ?? startColumn + 1 },
  };
}
