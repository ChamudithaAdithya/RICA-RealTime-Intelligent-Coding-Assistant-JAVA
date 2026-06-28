// Comprehensive AST schema for Java code analysis
// Phase 2: Enhanced with complexity tracking, injection detection, relationship metadata

export interface PackageInfo {
  name: string;
  simpleName: string;
  parentPackage: string | null;
  subPackages: string[];
  classes: string[];
  interfaces: string[];
  enums: string[];
  annotations: string[];
  isDefaultPackage: boolean;
  accessibleFrom: string;
  layerClassification?: LayerClassification;
}

export interface AttributeEncapsulation {
  hasGetter: boolean;
  hasSetter: boolean;
  getterName?: string;
  setterName?: string;
}

export interface Attribute {
  name: string;
  dataType: string;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  accessModifier: 'public' | 'protected' | 'private' | 'package-private';
  nonAccessModifiers: string[];
  initialValue: any;
  defaultValue: any;
  scope: 'class' | 'class-static' | 'local' | 'block';
  memoryType: 'heap' | 'method_area' | 'stack';
  mutable: boolean;
  isStatic: boolean;
  isFinal: boolean;
  isVolatile: boolean;
  isTransient: boolean;
  isSynthetic: boolean;
  encapsulation: AttributeEncapsulation;
  annotations: Annotation[];
  javaDocComment?: string;
  shadowsParentField: boolean;
  genericType?: string;
  isInjected?: boolean;
  injectionType?: 'field' | 'constructor' | 'setter' | 'implicit-constructor' | 'lombok-constructor';
}

export interface Constructor {
  name: string;
  accessModifier: 'public' | 'protected' | 'private' | 'package-private';
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  accessedFields?: string[];
  constructorType: 'default' | 'no-arg' | 'parameterized' | 'copy' | 'private' | 'singleton';
  parameters: Parameter[];
  throwsExceptions: string[];
  callsThis: boolean;
  callsSuper: boolean;
  chainedConstructor?: string;
  body: string;
  annotations: Annotation[];
  javaDocComment?: string;
  isDefault: boolean;
  isSynthetic: boolean;
  genericTypeParams: GenericTypeParam[];
  calledMethods: MethodCall[];
  createdObjects: ObjectCreation[];
  injectionAssignments?: InjectionAssignment[];
}

export interface InjectionAssignment {
  fieldName: string;
  parameterName: string;
  parameterIndex: number;
}

export interface Parameter {
  name: string;
  dataType: string;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  genericType?: string;
  position: number;
  isFinal: boolean;
  isVarArgs: boolean;
  defaultValue?: any;
  passedBy: 'value';
  annotations: Annotation[];
  scope: 'method';
  memoryType: 'stack';
  shadowsField: boolean;
  isInjected?: boolean;
  constructorAssigned?: boolean;
}

export interface DecisionPoint {
  type: 'if' | 'else-if' | 'for' | 'while' | 'do-while' | 'switch' | 'case' | 'catch' | 'ternary' | 'conditional-and' | 'conditional-or';
  line: number;
  column?: number;
  condition?: string;
  nestingDepth: number;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  maxNestingDepth: number;
  decisionPoints: DecisionPoint[];
}

export interface LocalVariable {
  name: string;
  dataType: string;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  isVarInferred: boolean;
  inferredType?: string;
  isFinal: boolean;
  isEffectivelyFinal: boolean;
  initialValue: any;
  scope: {
    declaredAtLine: number;
    scopeBlock: 'method' | 'for-loop' | 'if-block' | 'try-block' | 'while-loop' | 'switch-block';
  };
  memoryType: 'stack';
  usedInLambda: boolean;
}

export interface MethodBodyInfo {
  linesOfCode: number;
  localVariables: LocalVariable[];
  callsThis: boolean;
  callsSuper: boolean;
  returnsValue: boolean;
  cyclomaticComplexity?: number;
  businessLogicScore?: number;
  complexityMetrics?: ComplexityMetrics;
}

export interface MethodMemoryBehavior {
  stackFrame: string;
  localVarsOnStack: boolean;
}

export interface Method {
  name: string;
  accessModifier: 'public' | 'protected' | 'private' | 'package-private';
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  nonAccessModifiers: string[];
  returnType: string;
  returnTypeGeneric?: string;
  parameters: Parameter[];
  genericTypeParams: GenericTypeParam[];
  throwsExceptions: string[];
  methodType: 'instance' | 'static' | 'abstract' | 'default' | 'native' | 'synchronized';
  overrides?: string;
  overloads: string[];
  isVarArgs: boolean;
  isBridge: boolean;
  isSynthetic: boolean;
  annotations: Annotation[];
  javaDocComment?: string;
  body?: MethodBodyInfo;
  memoryBehavior?: MethodMemoryBehavior;
  calledMethods: MethodCall[];
  accessedFields?: string[];
  createdObjects: ObjectCreation[];
  complexityMetrics?: ComplexityMetrics;
}

export interface GenericTypeParam {
  typeParam: string;
  bound?: string;
  variance: 'invariant' | 'covariant' | 'contravariant';
}

export interface AnnotationElement {
  elementName: string;
  elementType: string;
  defaultValue?: any;
}

export interface Annotation {
  name: string;
  fullyQualifiedName: string;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  target: string[];
  retention: 'SOURCE' | 'CLASS' | 'RUNTIME';
  isInherited: boolean;
  isRepeatable: boolean;
  elements: { [key: string]: any };
  isBuiltIn: boolean;
}

export interface MethodCall {
  calledMethodName: string;
  targetClass?: string;
  targetMethod?: string;
  isLibraryCall: boolean;
  lineNumber?: number;
  column?: number;
  receiverVariableName?: string;
  receiverType?: string;
  receiverIsInjected?: boolean;
  arguments: string[];
}

export interface ObjectCreation {
  className: string;
  isExternal: boolean;
  lineNumber?: number;
  constructorArgs: string[];
  isPotentialViolation?: boolean;
  targetLayer?: string;
}

export interface ImportInfo {
  qualifiedName: string;
  simpleName: string;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  isStatic: boolean;
  isWildcard: boolean;
  line: number;
}

export interface Interface {
  name: string;
  fullyQualifiedName: string;
  accessModifier: 'public' | 'package-private';
  extendsInterfaces: string[];
  isFunctional: boolean;
  genericTypeParams: string[];
  abstractMethods: string[];
  defaultMethods: DefaultMethod[];
  staticMethods: StaticMethod[];
  privateMethods: string[];
  constants: Constant[];
  annotations: Annotation[];
}

export interface DefaultMethod {
  name: string;
  body: string;
}

export interface StaticMethod {
  name: string;
}

export interface Constant {
  name: string;
  dataType: string;
  value: any;
}

export interface EnumConstant {
  name: string;
  ordinal: number;
  constructorArgs: any[];
}

export interface Enum {
  name: string;
  fullyQualifiedName: string;
  accessModifier: 'public' | 'package-private';
  implements: string[];
  constants: EnumConstant[];
  fields: { name: string; dataType: string }[];
  constructor: string;
  methods: string[];
  builtInMethods: string[];
  annotations: Annotation[];
}

export interface RecordComponent {
  name: string;
  dataType: string;
  annotations: string[];
}

export interface JavaRecord {
  name: string;
  fullyQualifiedName: string;
  accessModifier: 'public' | 'package-private';
  isImplicitlyFinal: boolean;
  components: RecordComponent[];
  autoGenerated: string[];
  customConstructors: 'compact constructor' | 'full canonical override' | 'none';
  additionalMethods: string[];
  implements: string[];
  annotations: string[];
}

export interface LayerClassification {
  finalAssignedLayer: string;
  confidenceScore: number;
  heuristicsMatched: {
    annotationScore: number;
    namingScore: number;
    packageScore: number;
  };
  violationsDetected: string[];
}

export interface RelationshipMetadata {
  isInjection?: boolean;
  injectionType?: string;
  cardinality?: number;
  methodContext?: string;
  targetMethod?: string;
  line?: number;
  source?: string;
}

export interface Relationship {
  sourceId: string;
  targetId: string;
  type: 'extends' | 'implements' | 'has-a' | 'uses' | 'calls' | 'inner-class';
  label?: string;
  metadata?: RelationshipMetadata;
}

export interface ClassInfo {
  className: string;
  fullyQualifiedName: string;
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  accessModifier: 'public' | 'protected' | 'private' | 'package-private';
  nonAccessModifiers: string[];
  classType: 'class' | 'abstract class' | 'interface' | 'enum' | 'record' | 'annotation' | 'sealed class';
  superClass: string;
  interfaces: string[];
  permittedSubclasses: string[];
  isSealed: boolean;
  isFinal: boolean;
  isAbstract: boolean;
  isInner: boolean;
  innerClassType: 'static' | 'non-static' | 'local' | 'anonymous' | null;
  outerClass: string | null;
  genericTypeParams: GenericTypeParam[];
  annotations: Annotation[];
  javaDocComment?: string;
  attributes: Attribute[];
  constructors: Constructor[];
  methods: Method[];
  staticInitializers: { block: string }[];
  instanceInitializers: { block: string }[];
  innerClasses: string[];
  memoryLocation: 'method_area' | 'heap' | 'stack';
  loadedBy?: string;
  sourceFile: string;
  allExternalDependencies?: string[];
  methodCallGraph?: { [methodName: string]: MethodCall[] };
  detectedLayer?: 'controller' | 'service' | 'repository' | 'dao' | 'entity' | 'dto' | 'config' | 'utility' | 'aspect' | 'view' | 'unknown';
  stereotypes?: string[];
  layerClassification?: LayerClassification;
  injectionStrategy?: 'field' | 'constructor' | 'setter' | 'mixed' | 'none';
}

export interface FullASTOutput {
  packageInfo: PackageInfo;
  classes: ClassInfo[];
  imports: ImportInfo[];
  relationships: Relationship[];
  timestamp: number;
  filePath: string;
}

export interface ASTProjectOutput {
  projectName: string;
  workspacePath: string;
  timestamp: number;
  files: Record<string, FullASTOutput>;
  relationships: Relationship[];
  totalFiles: number;
}
