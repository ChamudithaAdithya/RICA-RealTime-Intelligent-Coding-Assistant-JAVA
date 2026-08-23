"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawTypeName = rawTypeName;
exports.simpleTypeName = simpleTypeName;
exports.typeTokens = typeTokens;
exports.hasAnnotation = hasAnnotation;
exports.lineRange = lineRange;
function rawTypeName(typeName) {
    return (typeName || '').replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
}
function simpleTypeName(typeName) {
    const raw = rawTypeName(typeName);
    return raw.split('.').pop() || raw;
}
function typeTokens(typeName) {
    return (typeName || '').match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) || [];
}
function hasAnnotation(annotations, names) {
    if (!annotations)
        return false;
    const wanted = new Set(names);
    return annotations.some(annotation => {
        const simple = annotation.name.split('.').pop() || annotation.name;
        return wanted.has(annotation.name) || wanted.has(simple);
    });
}
function lineRange(startLine, startColumn = 0, endLine, endColumn) {
    if (!startLine)
        return undefined;
    return {
        start: { line: startLine, character: startColumn },
        end: { line: endLine || startLine, character: endColumn ?? startColumn + 1 },
    };
}
//# sourceMappingURL=detectorUtils.js.map