"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaParser = void 0;
const java_parser_1 = __importDefault(require("java-parser"));
class JavaParser {
    constructor(outputChannel) {
        // ─── Persistence-write detection (typed receiver) ──────────────
        // A call counts as a persistence write only when the receiver variable's
        // resolved type is a persistence type (Repository/DAO/EntityManager/…).
        // In-memory ops on List/Map never qualify, and read methods (find*/get*/count…)
        // are excluded so V310 targets multi-step write sequences, not reads.
        this.PERSISTENCE_TYPE_RE = /(Repository|Dao|DAO|EntityManager|JdbcTemplate|JdbcOperations|Session|MongoTemplate|Mapper|PersistenceManager)$/;
        this.PERSISTENCE_READ_RE = /^(find|get|read|count|exists|has|load|query|search|is|to)/i;
        this.outputChannel = outputChannel;
        this.parser = java_parser_1.default;
        this.outputChannel.appendLine('Java parser loaded successfully');
    }
    parse(sourceCode, filePath) {
        try {
            const cst = this.parser.parse(sourceCode);
            const ast = this.cstToAst(cst, filePath, sourceCode);
            return ast;
        }
        catch (error) {
            this.outputChannel.appendLine(`Parse error in ${filePath}: ${error.message}`);
            return {
                classes: [],
                relationships: [],
                error: true,
                errorMessage: error.message
            };
        }
    }
    cstToAst(cst, filePath, sourceCode) {
        if (!cst) {
            return {
                packageInfo: this.createEmptyPackageInfo(filePath),
                classes: [],
                imports: [],
                relationships: [],
                timestamp: Date.now(),
                filePath
            };
        }
        // Extract package information and imports
        const packageInfo = this.extractPackageInfo(cst, filePath);
        const imports = this.extractImports(cst);
        // Find all type declarations
        const classes = [];
        const relationships = [];
        this.findTypeDeclarations(cst, classes, relationships, sourceCode, filePath);
        // Populate packageInfo with top-level types
        for (const cls of classes) {
            // Only add top-level types (not nested/inner classes)
            if (!cls.outerClass) {
                if (cls.classType === 'interface') {
                    packageInfo.interfaces.push(cls.className);
                }
                else if (cls.classType === 'enum') {
                    packageInfo.enums.push(cls.className);
                }
                else if (cls.classType === 'annotation') {
                    packageInfo.annotations.push(cls.className);
                }
                else {
                    packageInfo.classes.push(cls.className);
                }
            }
        }
        // Classify classes based on annotations and naming conventions
        for (const cls of classes) {
            this.classifyClass(cls);
        }
        // Post-process: Build allExternalDependencies and methodCallGraph for each top-level class
        for (const cls of classes) {
            if (!cls.outerClass) {
                const externalDeps = this.collectExternalDependencies(cls, imports, packageInfo.name);
                cls.allExternalDependencies = externalDeps;
                cls.methodCallGraph = this.buildMethodCallGraph(cls);
                // Add calls relationships from method calls
                for (const method of cls.methods) {
                    for (const call of method.calledMethods) {
                        if (call.targetClass && !call.isLibraryCall) {
                            // Deduplicate calls relationships
                            const existing = relationships.find(r => r.sourceId === cls.fullyQualifiedName &&
                                r.targetId === call.targetClass &&
                                r.type === 'calls' &&
                                r.metadata?.methodContext === method.name &&
                                r.metadata?.targetMethod === call.targetMethod);
                            if (!existing) {
                                relationships.push(this.makeRelation(cls.fullyQualifiedName, call.targetClass, 'calls', `calls ${call.calledMethodName}`, {
                                    methodContext: method.name,
                                    targetMethod: call.targetMethod,
                                    line: call.lineNumber
                                }));
                            }
                        }
                    }
                }
            }
        }
        return {
            packageInfo,
            classes,
            imports,
            relationships,
            timestamp: Date.now(),
            filePath
        };
    }
    createEmptyPackageInfo(filePath) {
        return {
            name: 'default',
            simpleName: 'default',
            parentPackage: null,
            subPackages: [],
            classes: [],
            interfaces: [],
            enums: [],
            annotations: [],
            isDefaultPackage: true,
            accessibleFrom: 'everywhere'
        };
    }
    extractPackageInfo(cst, filePath) {
        const packageName = this.findPackageDeclaration(cst);
        if (!packageName) {
            return this.createEmptyPackageInfo(filePath);
        }
        const parts = packageName.split('.');
        const simpleName = parts[parts.length - 1];
        const parentPackage = parts.length > 1 ? parts.slice(0, parts.length - 1).join('.') : null;
        const subPackages = [];
        return {
            name: packageName,
            simpleName,
            parentPackage,
            subPackages,
            classes: [],
            interfaces: [],
            enums: [],
            annotations: [],
            isDefaultPackage: false,
            accessibleFrom: 'everywhere'
        };
    }
    findPackageDeclaration(node) {
        if (!node)
            return null;
        // Check if this node is a packageDeclaration
        if (node.name === 'packageDeclaration' && node.children) {
            const packageIdentifier = this.getIdentifierFromNode(node);
            return packageIdentifier || null;
        }
        // Traverse children
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        const result = this.findPackageDeclaration(child);
                        if (result)
                            return result;
                    }
                }
            }
        }
        return null;
    }
    getIdentifierFromNode(node) {
        if (!node?.children)
            return '';
        if (node.children.Identifier) {
            const identifiers = [];
            for (const id of node.children.Identifier) {
                if (id.image)
                    identifiers.push(id.image);
            }
            return identifiers.join('.');
        }
        return '';
    }
    findTypeDeclarations(node, classes, relationships, sourceCode, filePath) {
        if (!node)
            return;
        // Only process top-level type declarations
        if (node.name === 'typeDeclaration' && node.children) {
            if (node.children.classDeclaration) {
                this.processClassDeclaration(node.children.classDeclaration[0], classes, relationships, sourceCode, filePath);
            }
            if (node.children.interfaceDeclaration) {
                this.processInterfaceDeclaration(node.children.interfaceDeclaration[0], classes, relationships, sourceCode, filePath);
            }
            if (node.children.enumDeclaration) {
                this.processEnumDeclaration(node.children.enumDeclaration[0], classes, sourceCode, filePath);
            }
            return; // Don't traverse deeper from typeDeclaration
        }
        // Continue searching for typeDeclaration nodes
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        this.findTypeDeclarations(child, classes, relationships, sourceCode, filePath);
                    }
                }
            }
        }
    }
    processClassDeclaration(node, classes, relationships, sourceCode, filePath) {
        if (!node?.children)
            return;
        // Extract keyword modifiers AND annotation modifier entries from classDeclaration level
        const classModifiers = this.getClassModifiersFromNode(node);
        const classModifierNodes = node.children.classModifier || [];
        // Handle normal class
        if (node.children.normalClassDeclaration) {
            const ncd = node.children.normalClassDeclaration[0];
            this.processNormalClass(ncd, classModifiers, classModifierNodes, null, classes, relationships, sourceCode, filePath);
        }
        // Handle enum (java-parser 2.x: enumDeclaration inside classDeclaration)
        if (node.children.enumDeclaration) {
            const ed = node.children.enumDeclaration[0];
            this.processEnumDeclaration(ed, classes, sourceCode, filePath);
        }
    }
    getClassModifiersFromNode(node) {
        const modifiers = [];
        if (!node?.children?.classModifier)
            return modifiers;
        for (const cm of node.children.classModifier) {
            if (cm.children) {
                if (cm.children.Public)
                    modifiers.push('public');
                if (cm.children.Private)
                    modifiers.push('private');
                if (cm.children.Protected)
                    modifiers.push('protected');
                if (cm.children.Abstract)
                    modifiers.push('abstract');
                if (cm.children.Static)
                    modifiers.push('static');
                if (cm.children.Final)
                    modifiers.push('final');
                if (cm.children.Strictfp)
                    modifiers.push('strictfp');
                if (cm.children.Sealed)
                    modifiers.push('sealed');
                if (cm.children.NonSealed)
                    modifiers.push('non-sealed');
            }
        }
        return modifiers;
    }
    getAnnotationsFromModifierList(modifiers) {
        const annotations = [];
        for (const mod of modifiers) {
            if (mod.children?.annotation) {
                for (const ann of mod.children.annotation) {
                    const annObj = this.extractAnnotation(ann);
                    if (annObj)
                        annotations.push(annObj);
                }
            }
        }
        return annotations;
    }
    processNormalClass(ncd, classModifiers, classModifierNodes, outerClass, classes, relationships, sourceCode, filePath) {
        // Get class name from typeIdentifier
        const className = this.getTypeIdentifier(ncd);
        if (!className)
            return;
        // Get class-level modifiers from the classDeclaration node (passed as classModifiers)
        const modifiers = classModifiers.length > 0 ? classModifiers : this.getModifiers(ncd);
        // Get annotations from classDeclaration modifier nodes
        const annotationsFromMods = this.getAnnotationsFromModifierList(classModifierNodes);
        const isAbstract = modifiers.includes('abstract');
        const isFinal = modifiers.includes('final');
        const isStatic = modifiers.includes('static'); // For inner classes
        const isSealed = modifiers.includes('sealed');
        // Get fully qualified name
        const pkgName = this.extractPackageInfoFromSource(sourceCode)?.name || '';
        const fullyQualifiedName = pkgName ? `${pkgName}.${className}` : className;
        // Get superclass
        const superClass = this.getSuperClass(ncd);
        if (superClass) {
            relationships.push(this.makeRelation(fullyQualifiedName, superClass === 'Object' ? 'java.lang.Object' : superClass, 'extends', 'inherits', { cardinality: 1 }));
        }
        // Get interfaces
        const interfaces = this.getSuperInterfaces(ncd);
        for (const iface of interfaces) {
            relationships.push(this.makeRelation(fullyQualifiedName, iface, 'implements', 'implements', { cardinality: 1 }));
        }
        // Get generic type parameters
        const genericTypeParams = this.extractGenericTypeParameters(ncd);
        // Get annotations (merge from class modifiers with any from ncd)
        const ncdAnnotations = this.extractAnnotations(ncd);
        const allAnnotations = [...annotationsFromMods];
        for (const ann of ncdAnnotations) {
            if (!allAnnotations.some(a => a.fullyQualifiedName === ann.fullyQualifiedName)) {
                allAnnotations.push(ann);
            }
        }
        const annotations = allAnnotations;
        // Get Javadoc
        const javaDocComment = this.extractJavaDoc(ncd);
        // Get class body details
        const { fields, methods, constructors, staticInitBlocks, instanceInitBlocks, innerClassNames } = this.processClassBody(ncd, className, sourceCode, allAnnotations);
        // Determine class type
        let classType = 'class';
        if (isAbstract)
            classType = 'abstract class';
        if (isSealed)
            classType = 'sealed class';
        // Note: 'final' is indicated by isFinal flag, not by classType
        // Determine access modifier
        const accessModifier = this.getAccessModifier(modifiers);
        // Determine inner class info
        const isInner = outerClass !== null;
        const innerClassType = isStatic ? 'static' : (isInner ? 'non-static' : null);
        const outerClassInfo = outerClass;
        // Determine memory location
        const memoryLocation = this.determineMemoryLocation(modifiers);
        const loc = this.extractLocation(ncd);
        const classInfo = {
            className,
            fullyQualifiedName,
            ...loc,
            accessModifier,
            nonAccessModifiers: modifiers.filter(m => !['public', 'protected', 'private', 'package-private'].includes(m)),
            classType,
            superClass: superClass && superClass !== 'Object' ? superClass : 'java.lang.Object',
            interfaces,
            permittedSubclasses: isSealed ? this.extractPermittedSubclasses(ncd) : [],
            isSealed,
            isFinal,
            isAbstract,
            isInner,
            innerClassType,
            outerClass: outerClassInfo,
            genericTypeParams,
            annotations,
            javaDocComment,
            attributes: fields,
            constructors,
            methods,
            staticInitializers: staticInitBlocks,
            instanceInitializers: instanceInitBlocks,
            innerClasses: innerClassNames,
            memoryLocation,
            loadedBy: 'ApplicationClassLoader',
            sourceFile: filePath.split(/[\\/]/).pop() || 'Unknown.java',
            allExternalDependencies: [], // Will be filled later
            methodCallGraph: {} // Will be filled later
        };
        // Detect implicit constructor injection (hand-written constructor)
        for (const ctor of constructors) {
            if (ctor.injectionAssignments) {
                for (const assign of ctor.injectionAssignments) {
                    const field = classInfo.attributes.find(a => a.name === assign.fieldName);
                    if (field) {
                        field.isInjected = true;
                        field.injectionType = 'implicit-constructor';
                    }
                }
            }
        }
        // Determine injection strategy
        const allInjected = classInfo.attributes.filter(a => a.isInjected);
        if (allInjected.length > 0) {
            const hasFieldAnnotation = allInjected.some(a => a.injectionType === 'field');
            const hasConstructorAssign = allInjected.some(a => a.injectionType === 'implicit-constructor' || a.injectionType === 'lombok-constructor');
            const hasSetterInjection = allInjected.some(a => a.injectionType === 'setter');
            const uniqueTypes = new Set(allInjected.map(a => a.injectionType));
            if (uniqueTypes.size > 1)
                classInfo.injectionStrategy = 'mixed';
            else if (hasFieldAnnotation)
                classInfo.injectionStrategy = 'field';
            else if (hasConstructorAssign)
                classInfo.injectionStrategy = 'constructor';
            else if (hasSetterInjection)
                classInfo.injectionStrategy = 'setter';
            else
                classInfo.injectionStrategy = 'mixed';
        }
        else {
            classInfo.injectionStrategy = 'none';
        }
        classes.push(classInfo);
        // Add has-a relationships for fields with custom types (deduplicated)
        const hasARelMap = new Map();
        for (const attr of fields) {
            if (this.isCustomType(attr.dataType)) {
                const baseType = attr.dataType.replace(/<.*>/g, '').trim();
                if (this.isCustomType(baseType)) {
                    const key = `${fullyQualifiedName}->${baseType}`;
                    if (!hasARelMap.has(key)) {
                        hasARelMap.set(key, { count: 0, isInjected: false, injectionTypes: new Set() });
                    }
                    const entry = hasARelMap.get(key);
                    entry.count++;
                    if (attr.isInjected) {
                        entry.isInjected = true;
                        entry.injectionTypes.add(attr.injectionType || 'field');
                    }
                }
            }
        }
        for (const [key, entry] of hasARelMap) {
            const [, to] = key.split('->');
            relationships.push(this.makeRelation(fullyQualifiedName, to, 'has-a', entry.count > 1 ? `owns (${entry.count}x)` : 'owns', {
                cardinality: entry.count,
                isInjection: entry.isInjected || undefined,
                injectionType: entry.isInjected ? Array.from(entry.injectionTypes).join(',') : undefined
            }));
        }
        // Process inner classes recursively
        const classBody = ncd.children.classBody?.[0];
        if (classBody?.children?.classBodyDeclaration) {
            for (const cbd of classBody.children.classBodyDeclaration) {
                if (cbd.children?.classMemberDeclaration) {
                    const cmd = cbd.children.classMemberDeclaration[0];
                    if (cmd.children?.classDeclaration) {
                        const innerClassDecl = cmd.children.classDeclaration[0];
                        const innerClassModifiers = this.getClassModifiersFromNode(innerClassDecl);
                        const innerModNodes = innerClassDecl.children?.classModifier || [];
                        const innerNcd = innerClassDecl.children?.normalClassDeclaration?.[0];
                        if (innerNcd) {
                            this.processNormalClass(innerNcd, innerClassModifiers, innerModNodes, className, classes, relationships, sourceCode, filePath);
                        }
                    }
                }
            }
        }
    }
    makeRelation(from, to, type, label, metadata) {
        return { sourceId: from, targetId: to, type, label, metadata };
    }
    extractPermittedSubclasses(node) {
        if (!node?.children?.permits)
            return [];
        const permits = node.children.permits[0];
        if (!permits?.children?.classTypeList)
            return [];
        const ctl = permits.children.classTypeList[0];
        if (!ctl?.children?.classType)
            return [];
        return ctl.children.classType.map((ct) => this.extractClassName(ct)).filter(Boolean);
    }
    processInterfaceDeclaration(node, classes, relationships, sourceCode, filePath) {
        if (!node?.children)
            return;
        if (node.children.normalInterfaceDeclaration) {
            const nid = node.children.normalInterfaceDeclaration[0];
            this.processNormalInterface(nid, classes, relationships, sourceCode);
        }
        if (node.children.annotationTypeDeclaration) {
            const atd = node.children.annotationTypeDeclaration[0];
            this.processAnnotationInterface(atd, classes, sourceCode, filePath);
        }
    }
    processEnumDeclaration(node, classes, sourceCode, filePath) {
        const enumName = this.getTypeIdentifier(node);
        if (!enumName)
            return;
        const pkgName = this.extractPackageInfoFromSource(sourceCode)?.name || '';
        const fullyQualifiedName = pkgName ? `${pkgName}.${enumName}` : enumName;
        const modifiers = this.getModifiers(node);
        const accessModifier = this.getAccessModifier(modifiers);
        const nonAccessModifiers = modifiers.filter(m => !['public', 'protected', 'private', 'package-private'].includes(m));
        const annotations = this.extractAnnotations(node);
        const javaDocComment = this.extractJavaDoc(node);
        // Get implements interfaces
        const implementsInterfaces = this.getExtendsInterfaces(node);
        // Get enum constants as attributes
        const constants = this.getEnumConstants(node);
        const attributes = constants.map(c => ({
            name: c,
            dataType: enumName,
            accessModifier: 'public',
            nonAccessModifiers: ['public', 'static', 'final'],
            initialValue: c,
            defaultValue: null,
            scope: 'class-static',
            memoryType: 'method_area',
            mutable: false,
            isStatic: true,
            isFinal: true,
            isVolatile: false,
            isTransient: false,
            isSynthetic: false,
            encapsulation: { hasGetter: false, hasSetter: false },
            annotations: [],
            shadowsParentField: false
        }));
        // Get enum methods (if any)
        const methods = []; // Could extract from enum body
        // Constructors (enum constructor is private)
        const constructors = [{
                name: enumName,
                accessModifier: 'private',
                constructorType: 'private',
                parameters: [],
                throwsExceptions: [],
                callsThis: false,
                callsSuper: false,
                body: '/* enum constructor */',
                annotations: [],
                isDefault: false,
                isSynthetic: false,
                genericTypeParams: [],
                calledMethods: [],
                createdObjects: []
            }];
        const loc = this.extractLocation(node);
        const classInfo = {
            className: enumName,
            fullyQualifiedName,
            ...loc,
            accessModifier,
            nonAccessModifiers,
            classType: 'enum',
            superClass: 'java.lang.Enum',
            interfaces: implementsInterfaces,
            permittedSubclasses: [],
            isSealed: false,
            isFinal: true, // enums are implicitly final
            isAbstract: false,
            isInner: false,
            innerClassType: null,
            outerClass: null,
            genericTypeParams: [],
            annotations,
            javaDocComment,
            attributes,
            constructors,
            methods,
            staticInitializers: [],
            instanceInitializers: [],
            innerClasses: [],
            memoryLocation: 'method_area',
            sourceFile: filePath.split(/[\\/]/).pop() || 'Unknown.java',
            allExternalDependencies: [],
            methodCallGraph: {}
        };
        classes.push(classInfo);
    }
    extractEnumDetails(node, enumName, fullyQualifiedName, accessModifier, sourceCode) {
        const implementsInterfaces = this.getExtendsInterfaces(node);
        const constants = this.extractEnumConstants(node);
        const fields = this.extractEnumFields(node);
        const constructor = this.extractEnumConstructor(enumName);
        const methods = this.extractEnumMethods(node);
        const annotations = this.extractAnnotations(node);
        return {
            name: enumName,
            fullyQualifiedName,
            accessModifier,
            implements: implementsInterfaces,
            constants,
            fields,
            constructor,
            methods,
            builtInMethods: ['values()', 'valueOf(String)', 'ordinal()', 'name()'],
            annotations
        };
    }
    extractEnumConstants(node) {
        const constants = [];
        if (!node?.children?.enumBody)
            return constants;
        const enumBody = node.children.enumBody[0];
        if (!enumBody?.children?.enumConstantList)
            return constants;
        const enumConstantList = enumBody.children.enumConstantList[0];
        if (!enumConstantList?.children?.enumConstant)
            return constants;
        let ordinal = 0;
        for (const ec of enumConstantList.children.enumConstant) {
            const name = ec.children?.Identifier?.[0]?.image || 'Unknown';
            const args = this.extractEnumConstantArgs(ec);
            constants.push({
                name,
                ordinal: ordinal++,
                constructorArgs: args
            });
        }
        return constants;
    }
    extractEnumConstantArgs(ec) {
        const args = [];
        if (!ec?.children?.arguments)
            return args;
        const argumentsNode = ec.children.arguments[0];
        if (!argumentsNode?.children?.expressionList)
            return args;
        const el = argumentsNode.children.expressionList[0];
        if (!el?.children?.expression)
            return args;
        for (const expr of el.children.expression) {
            args.push(this.extractExpressionValue(expr));
        }
        return args;
    }
    extractExpressionValue(expr) {
        // Simple extraction for literals
        if (!expr?.children)
            return null;
        if (expr.children.stringLiteral) {
            return expr.children.stringLiteral[0]?.image?.replace(/^"|"$/g, '') || null;
        }
        if (expr.children.integerLiteral) {
            return parseInt(expr.children.integerLiteral[0]?.image || '0');
        }
        if (expr.children.floatingPointLiteral) {
            return parseFloat(expr.children.floatingPointLiteral[0]?.image || '0');
        }
        if (expr.children.booleanLiteral) {
            return expr.children.booleanLiteral[0]?.image === 'true';
        }
        if (expr.children.nullLiteral) {
            return null;
        }
        if (expr.children.Identifier) {
            return expr.children.Identifier[0]?.image;
        }
        return null;
    }
    extractEnumFields(node) {
        const fields = [];
        // Enum can have fields in its body
        const enumBody = node.children?.enumBody?.[0];
        if (!enumBody?.children?.classBodyDeclaration)
            return fields;
        for (const cbd of enumBody.children.classBodyDeclaration) {
            if (cbd.children?.classMemberDeclaration) {
                const cmd = cbd.children.classMemberDeclaration[0];
                if (cmd.children?.fieldDeclaration) {
                    const fd = cmd.children.fieldDeclaration[0];
                    const fieldType = this.getFieldType(fd);
                    const fieldNames = this.getVariableDeclaratorIds(fd);
                    for (const name of fieldNames) {
                        fields.push({
                            name,
                            dataType: fieldType
                        });
                    }
                }
            }
        }
        return fields;
    }
    extractEnumConstructor(enumName) {
        return `private ${enumName}() {}`; // Simplified, would need to extract actual constructor params
    }
    extractEnumMethods(node) {
        // Extract methods defined in enum
        return [];
    }
    processNormalInterface(nid, classes, relationships, sourceCode) {
        const interfaceName = this.getTypeIdentifier(nid);
        if (!interfaceName)
            return;
        const pkgName = this.extractPackageInfoFromSource(sourceCode)?.name || '';
        const fullyQualifiedName = pkgName ? `${pkgName}.${interfaceName}` : interfaceName;
        const modifiers = this.getModifiers(nid);
        const accessModifier = this.getAccessModifier(modifiers);
        const genericTypeParams = this.extractGenericTypeParameters(nid);
        const annotations = this.extractAnnotations(nid);
        const javaDocComment = this.extractJavaDoc(nid);
        const extendedInterfaces = this.getExtendsInterfaces(nid);
        for (const iface of extendedInterfaces) {
            relationships.push(this.makeRelation(fullyQualifiedName, iface, 'extends', 'extends', { cardinality: 1 }));
        }
        const { abstractMethods, defaultMethods, staticMethods, privateMethods, constants } = this.processInterfaceBody(nid);
        const isFunctional = abstractMethods.length === 1 && defaultMethods.length === 0;
        const interfaceInfo = {
            name: interfaceName,
            fullyQualifiedName,
            accessModifier,
            extendsInterfaces: extendedInterfaces,
            isFunctional,
            genericTypeParams: genericTypeParams.map(g => g.typeParam),
            abstractMethods,
            defaultMethods,
            staticMethods,
            privateMethods,
            constants,
            annotations
        };
        const loc = this.extractLocation(nid);
        const classWrapper = {
            className: interfaceName,
            fullyQualifiedName,
            ...loc,
            accessModifier,
            nonAccessModifiers: modifiers.filter(m => !['public', 'protected', 'private', 'package-private'].includes(m)),
            classType: 'interface',
            superClass: 'java.lang.Object',
            interfaces: extendedInterfaces,
            permittedSubclasses: [],
            isSealed: false,
            isFinal: false,
            isAbstract: true,
            isInner: false,
            innerClassType: null,
            outerClass: null,
            genericTypeParams,
            annotations,
            javaDocComment,
            attributes: [],
            constructors: [],
            methods: [
                // Abstract methods
                ...abstractMethods.map(m => ({
                    name: m,
                    accessModifier: 'public',
                    nonAccessModifiers: ['abstract'],
                    returnType: 'void',
                    parameters: [],
                    genericTypeParams: [],
                    throwsExceptions: [],
                    methodType: 'abstract',
                    overrides: undefined,
                    overloads: [],
                    isVarArgs: false,
                    isBridge: false,
                    isSynthetic: false,
                    annotations: [],
                    body: { linesOfCode: 0, localVariables: [], callsThis: false, callsSuper: false, returnsValue: false },
                    memoryBehavior: { stackFrame: 'pushed on call, popped on return', localVarsOnStack: true },
                    calledMethods: [],
                    createdObjects: []
                })),
                // Default methods
                ...defaultMethods.map(dm => ({
                    name: dm.name,
                    accessModifier: 'public',
                    nonAccessModifiers: ['default'],
                    returnType: 'void',
                    parameters: [],
                    genericTypeParams: [],
                    throwsExceptions: [],
                    methodType: 'default',
                    overrides: undefined,
                    overloads: [],
                    isVarArgs: false,
                    isBridge: false,
                    isSynthetic: false,
                    annotations: [],
                    javaDocComment: dm.body,
                    body: { linesOfCode: 1, localVariables: [], callsThis: false, callsSuper: false, returnsValue: false },
                    memoryBehavior: { stackFrame: 'pushed on call, popped on return', localVarsOnStack: true },
                    calledMethods: [],
                    createdObjects: []
                })),
                // Static methods
                ...staticMethods.map(sm => ({
                    name: sm.name,
                    accessModifier: 'public',
                    nonAccessModifiers: ['static'],
                    returnType: 'void',
                    parameters: [],
                    genericTypeParams: [],
                    throwsExceptions: [],
                    methodType: 'static',
                    overrides: undefined,
                    overloads: [],
                    isVarArgs: false,
                    isBridge: false,
                    isSynthetic: false,
                    annotations: [],
                    body: { linesOfCode: 1, localVariables: [], callsThis: false, callsSuper: false, returnsValue: false },
                    memoryBehavior: { stackFrame: 'pushed on call, popped on return', localVarsOnStack: true },
                    calledMethods: [],
                    createdObjects: []
                }))
            ],
            staticInitializers: [],
            instanceInitializers: [],
            innerClasses: [],
            memoryLocation: 'method_area',
            sourceFile: this.getSourceFileName(nid) || 'Unknown.java'
        };
        classes.push(classWrapper);
    }
    processAnnotationInterface(node, classes, sourceCode, filePath) {
        const annotationName = this.getTypeIdentifier(node);
        if (!annotationName)
            return;
        const pkgName = this.extractPackageInfoFromSource(sourceCode)?.name || '';
        const fullyQualifiedName = pkgName ? `${pkgName}.${annotationName}` : annotationName;
        const modifiers = this.getModifiers(node);
        const accessModifier = this.getAccessModifier(modifiers);
        const nonAccessModifiers = modifiers.filter(m => !['public', 'protected', 'private', 'package-private'].includes(m));
        const annotations = this.extractAnnotations(node);
        const javaDocComment = this.extractJavaDoc(node);
        const loc = this.extractLocation(node);
        const annotationInfo = {
            className: annotationName,
            fullyQualifiedName,
            ...loc,
            accessModifier,
            nonAccessModifiers,
            classType: 'annotation',
            superClass: 'java.lang.annotation.Annotation',
            interfaces: [],
            permittedSubclasses: [],
            isSealed: false,
            isFinal: true,
            isAbstract: false,
            isInner: false,
            innerClassType: null,
            outerClass: null,
            genericTypeParams: [],
            annotations,
            javaDocComment,
            attributes: [],
            constructors: [],
            methods: [],
            staticInitializers: [],
            instanceInitializers: [],
            innerClasses: [],
            memoryLocation: 'method_area',
            sourceFile: filePath.split(/[\\/]/).pop() || 'Unknown.java',
            allExternalDependencies: [],
            methodCallGraph: {}
        };
        classes.push(annotationInfo);
    }
    getTypeIdentifier(node) {
        if (!node?.children)
            return '';
        // Look for typeIdentifier
        if (node.children.typeIdentifier) {
            const ti = node.children.typeIdentifier[0];
            if (ti.children?.Identifier) {
                return ti.children.Identifier[0].image;
            }
        }
        return '';
    }
    getSuperClass(node) {
        if (!node?.children?.superclass)
            return null;
        const sc = node.children.superclass[0];
        const typeName = this.extractClassName(sc);
        return typeName || null;
    }
    getSuperInterfaces(node) {
        // java-parser 2.x: the implements clause lives under classImplements, not superinterfaces.
        const clauses = ['classImplements', 'superinterfaces'];
        for (const key of clauses) {
            const clause = node?.children?.[key]?.[0];
            if (clause?.children?.interfaceTypeList?.[0]) {
                return this.extractTypeList(clause.children.interfaceTypeList[0]);
            }
        }
        return [];
    }
    getExtendsInterfaces(node) {
        const clauses = ['classImplements', 'interfaceExtends', 'extendsInterfaces'];
        for (const key of clauses) {
            const clause = node?.children?.[key]?.[0];
            if (clause?.children?.interfaceTypeList?.[0]) {
                return this.extractTypeList(clause.children.interfaceTypeList[0]);
            }
        }
        return [];
    }
    extractTypeName(node) {
        const identifiers = [];
        const collectIds = (n) => {
            if (!n)
                return;
            if (n.children?.Identifier) {
                for (const id of n.children.Identifier) {
                    identifiers.push(id.image);
                }
            }
            if (n.children) {
                for (const key of Object.keys(n.children)) {
                    if (Array.isArray(n.children[key])) {
                        for (const child of n.children[key]) {
                            collectIds(child);
                        }
                    }
                }
            }
        };
        collectIds(node);
        return identifiers.length > 0 ? identifiers[0] : '';
    }
    extractTypeList(node) {
        const types = [];
        const collectTypes = (n) => {
            if (!n)
                return;
            if (n.name === 'classType' || n.name === 'interfaceType') {
                const typeName = this.extractTypeName(n);
                if (typeName && !types.includes(typeName)) {
                    types.push(typeName);
                }
                return; // Don't go deeper
            }
            if (n.children) {
                for (const key of Object.keys(n.children)) {
                    if (Array.isArray(n.children[key])) {
                        for (const child of n.children[key]) {
                            collectTypes(child);
                        }
                    }
                }
            }
        };
        collectTypes(node);
        return types;
    }
    getEnumConstants(node) {
        const constants = [];
        if (!node?.children?.enumBody)
            return constants;
        const enumBody = node.children.enumBody[0];
        if (!enumBody?.children?.enumConstantList)
            return constants;
        const enumConstantList = enumBody.children.enumConstantList[0];
        if (!enumConstantList?.children?.enumConstant)
            return constants;
        for (const ec of enumConstantList.children.enumConstant) {
            if (ec.children?.Identifier) {
                constants.push(ec.children.Identifier[0].image);
            }
        }
        return constants;
    }
    processClassBody(node, className, sourceCode, classAnnotations) {
        const fields = [];
        const methods = [];
        const constructors = [];
        const staticInitBlocks = [];
        const instanceInitBlocks = [];
        const innerClassNames = [];
        if (!node?.children?.classBody) {
            return { fields, methods, constructors, staticInitBlocks, instanceInitBlocks, innerClassNames };
        }
        const classBody = node.children.classBody[0];
        if (!classBody?.children?.classBodyDeclaration) {
            return { fields, methods, constructors, staticInitBlocks, instanceInitBlocks, innerClassNames };
        }
        const fieldNames = new Set();
        // Pass 1: Process fields and constructors (injection detection must run before methods)
        for (const cbd of classBody.children.classBodyDeclaration) {
            // Static initializer: static { ... }
            if (cbd.name === 'staticInitializer') {
                if (cbd.children?.classInitializer) {
                    const block = this.extractInitializerBlock(cbd);
                    if (block)
                        staticInitBlocks.push(block);
                }
                continue;
            }
            // Instance initializer: { ... }
            if (cbd.name === 'initializer') {
                const block = this.extractInitializerBlock(cbd);
                if (block)
                    instanceInitBlocks.push(block);
                continue;
            }
            // Constructor
            if (cbd.children?.constructorDeclaration) {
                const cd = cbd.children.constructorDeclaration[0];
                const ctorModifiers = this.getConstructorModifiers(cd);
                const ctor = this.extractDetailedConstructor(cd, ctorModifiers, className, fieldNames);
                if (ctor)
                    constructors.push(ctor);
            }
            if (cbd.children?.classMemberDeclaration) {
                const cmd = cbd.children.classMemberDeclaration[0];
                // Field declaration
                if (cmd.children?.fieldDeclaration) {
                    const fd = cmd.children.fieldDeclaration[0];
                    const fieldModifiers = this.getFieldModifiers(fd);
                    const fieldType = this.getFieldType(fd);
                    const fieldInfoList = this.extractFieldDeclarations(fd, fieldModifiers, className, sourceCode);
                    for (const fieldInfo of fieldInfoList) {
                        fields.push(fieldInfo);
                        fieldNames.add(fieldInfo.name);
                    }
                }
            }
        }
        // Run constructor injection detection BEFORE processing methods
        // so method symbol tables get correct isInjected flags
        for (const ctor of constructors) {
            if (ctor.injectionAssignments) {
                for (const assign of ctor.injectionAssignments) {
                    const field = fields.find(a => a.name === assign.fieldName);
                    if (field) {
                        field.isInjected = true;
                        field.injectionType = 'implicit-constructor';
                    }
                }
            }
        }
        // Lombok: detect @AllArgsConstructor, @RequiredArgsConstructor, @Builder
        // Must run before method processing so symbol tables see isInjected=true.
        const lombokAnnotations = ['AllArgsConstructor', 'RequiredArgsConstructor', 'Builder'];
        const hasLombokAnnotation = classAnnotations.some(a => lombokAnnotations.some(l => a.name === l || a.fullyQualifiedName === l));
        if (hasLombokAnnotation) {
            const isRequired = classAnnotations.some(a => a.name === 'RequiredArgsConstructor' || a.fullyQualifiedName === 'RequiredArgsConstructor');
            if (isRequired) {
                // @RequiredArgsConstructor: only final fields are injected
                for (const field of fields) {
                    if (!field.isInjected && field.isFinal) {
                        field.isInjected = true;
                        field.injectionType = 'lombok-constructor';
                    }
                }
            }
            else {
                // @AllArgsConstructor or @Builder: all fields are injected
                for (const field of fields) {
                    if (!field.isInjected) {
                        field.isInjected = true;
                        field.injectionType = 'lombok-constructor';
                    }
                }
            }
        }
        // Pass 2: Process methods and inner classes (fields now have correct isInjected)
        for (const cbd of classBody.children.classBodyDeclaration) {
            if (cbd.children?.classMemberDeclaration) {
                const cmd = cbd.children.classMemberDeclaration[0];
                // Method declaration
                if (cmd.children?.methodDeclaration) {
                    const md = cmd.children.methodDeclaration[0];
                    const methodModifiers = this.getMethodModifiers(md);
                    const method = this.extractDetailedMethod(md, methodModifiers, fields, fieldNames, sourceCode);
                    if (method)
                        methods.push(method);
                }
                // Inner class/nested class
                if (cmd.children?.classDeclaration) {
                    const innerClass = cmd.children.classDeclaration[0];
                    const innerClassName = this.getTypeIdentifier(innerClass);
                    if (innerClassName) {
                        innerClassNames.push(innerClassName);
                    }
                }
            }
        }
        // Detect setter injection: @Autowired/@Inject on setXxx() methods
        for (const method of methods) {
            if (method.name.startsWith('set') && method.parameters.length === 1) {
                const hasInjectAnnotation = method.annotations.some(a => a.name === 'Autowired' || a.fullyQualifiedName === 'Autowired' ||
                    a.name === 'Inject' || a.fullyQualifiedName === 'Inject' ||
                    a.name === 'Resource' || a.fullyQualifiedName === 'Resource');
                if (hasInjectAnnotation) {
                    const fieldName = method.name.charAt(3).toLowerCase() + method.name.slice(4);
                    const field = fields.find(f => f.name === fieldName);
                    if (field && !field.isInjected) {
                        field.isInjected = true;
                        field.injectionType = 'setter';
                    }
                }
            }
        }
        // Post-process fields to compute default values and encapsulation
        this.postProcessFields(fields, methods);
        return { fields, methods, constructors, staticInitBlocks, instanceInitBlocks, innerClassNames };
    }
    extractInitializerBlock(cbd) {
        // Simple extraction - would need the source code positions to extract actual block
        return { block: '/* initializer block */' };
    }
    extractFieldDeclarations(fd, modifiers, className, sourceCode) {
        const attributes = [];
        const accessModifier = this.getAccessModifier(modifiers);
        const nonAccessModifiers = modifiers.filter(m => !['public', 'protected', 'private', 'package-private'].includes(m));
        const dataType = this.getFieldType(fd);
        const genericType = dataType.includes('<') ? dataType : undefined;
        const fieldNames = this.getVariableDeclaratorIds(fd);
        const variableDeclarators = fd.children?.variableDeclaratorList?.[0]?.children?.variableDeclarator || [];
        // Extract field annotations
        const fieldAnnotations = this.extractFieldAnnotations(fd);
        const isInjected = this.isInjectionAnnotation(fieldAnnotations);
        for (let i = 0; i < fieldNames.length; i++) {
            const name = fieldNames[i];
            const vd = variableDeclarators[i];
            // Extract initial value
            const initialValue = this.extractInitialValue(vd);
            // Compute default JVM value
            const defaultValue = this.computeJVMDefault(dataType);
            // Determine scope and memory location
            const isStatic = nonAccessModifiers.includes('static');
            const scope = isStatic ? 'class-static' : 'class';
            const memoryType = isStatic ? 'method_area' : 'heap';
            // Determine mutability
            const isFinal = nonAccessModifiers.includes('final');
            const mutable = !isFinal;
            // Encapsulation check
            const hasGetter = this.hasGetterMethod(name, className);
            const hasSetter = this.hasSetterMethod(name, className);
            const loc = this.extractLocation(fd);
            attributes.push({
                name,
                dataType,
                ...loc,
                accessModifier,
                nonAccessModifiers,
                initialValue,
                defaultValue,
                scope,
                memoryType,
                mutable,
                isStatic,
                isFinal,
                isVolatile: nonAccessModifiers.includes('volatile'),
                isTransient: nonAccessModifiers.includes('transient'),
                isSynthetic: false,
                encapsulation: {
                    hasGetter,
                    hasSetter,
                    getterName: hasGetter ? this.generateGetterName(name, accessModifier) : undefined,
                    setterName: hasSetter ? this.generateSetterName(name, accessModifier) : undefined
                },
                annotations: fieldAnnotations,
                javaDocComment: this.extractFieldJavaDoc(vd),
                shadowsParentField: false, // Need inheritance analysis
                genericType,
                isInjected,
                injectionType: isInjected ? 'field' : undefined
            });
        }
        return attributes;
    }
    extractFieldAnnotations(fd) {
        const annotations = [];
        // java-parser 2.x CST: fieldModifier entries contain annotation directly, not wrapped in 'annotations'
        if (fd.children?.fieldModifier) {
            for (const mod of fd.children.fieldModifier) {
                if (mod.children?.annotation) {
                    for (const ann of mod.children.annotation) {
                        const annObj = this.extractAnnotation(ann);
                        if (annObj)
                            annotations.push(annObj);
                    }
                }
            }
        }
        return annotations;
    }
    isInjectionAnnotation(annotations) {
        const injectionAnnotations = ['Autowired', 'Inject', 'Resource'];
        return annotations.some(ann => {
            const name = ann.name;
            const fqn = ann.fullyQualifiedName || '';
            return injectionAnnotations.some(inj => name === inj || fqn.endsWith('.' + inj) || fqn === inj);
        });
    }
    processInterfaceBody(node) {
        const abstractMethods = [];
        const defaultMethods = [];
        const staticMethods = [];
        const privateMethods = [];
        const constants = [];
        if (!node?.children?.interfaceBody) {
            return { abstractMethods, defaultMethods, staticMethods, privateMethods, constants };
        }
        const interfaceBody = node.children.interfaceBody[0];
        if (!interfaceBody?.children?.interfaceMemberDeclaration) {
            return { abstractMethods, defaultMethods, staticMethods, privateMethods, constants };
        }
        for (const imd of interfaceBody.children.interfaceMemberDeclaration) {
            // Constant declaration (public static final)
            if (imd.children?.constantDeclaration) {
                const constDecl = imd.children.constantDeclaration[0];
                const constName = this.getVariableDeclaratorIds(constDecl)[0];
                const constType = this.getFieldType(constDecl);
                const constValue = this.extractInitialValue(constDecl.children.variableDeclaratorList?.[0]?.children?.variableDeclarator?.[0]);
                if (constName) {
                    constants.push({
                        name: constName,
                        dataType: constType,
                        value: constValue
                    });
                }
            }
            // Interface method declaration
            if (imd.children?.interfaceMethodDeclaration) {
                const iMethod = imd.children.interfaceMethodDeclaration[0];
                // Names/types/params live on the methodHeader child, not on the declaration node.
                const header = iMethod.children?.methodHeader?.[0];
                const modifiers = this.getMethodModifiers(imd);
                const methodName = header ? this.getMethodName(header) : '';
                const returnType = header ? this.getReturnType(header) : 'void';
                const isStatic = modifiers.includes('static');
                const isDefault = modifiers.includes('default');
                const isPrivate = modifiers.includes('private');
                const isAbstract = modifiers.includes('abstract') || (!isStatic && !isDefault && !isPrivate);
                if (isPrivate) {
                    privateMethods.push(methodName);
                }
                else if (isStatic) {
                    staticMethods.push({ name: methodName });
                }
                else if (isDefault) {
                    defaultMethods.push({
                        name: methodName,
                        body: `default ${methodName}...` // Would extract actual body
                    });
                }
                else if (isAbstract) {
                    abstractMethods.push(methodName);
                }
            }
        }
        return { abstractMethods, defaultMethods, staticMethods, privateMethods, constants };
    }
    getFieldModifiers(node) {
        const modifiers = [];
        if (!node?.children?.fieldModifier)
            return modifiers;
        for (const fm of node.children.fieldModifier) {
            if (fm.children) {
                if (fm.children.Public)
                    modifiers.push('public');
                if (fm.children.Private)
                    modifiers.push('private');
                if (fm.children.Protected)
                    modifiers.push('protected');
                if (fm.children.Static)
                    modifiers.push('static');
                if (fm.children.Final)
                    modifiers.push('final');
            }
        }
        return modifiers;
    }
    getMethodModifiers(node) {
        const modifiers = [];
        const modKey = node?.children?.methodModifier
            ? 'methodModifier'
            : node?.children?.interfaceMethodModifier ? 'interfaceMethodModifier' : null;
        if (!modKey)
            return modifiers;
        for (const mm of node.children[modKey]) {
            if (mm.children) {
                if (mm.children.Public)
                    modifiers.push('public');
                if (mm.children.Private)
                    modifiers.push('private');
                if (mm.children.Protected)
                    modifiers.push('protected');
                if (mm.children.Abstract)
                    modifiers.push('abstract');
                if (mm.children.Static)
                    modifiers.push('static');
                if (mm.children.Final)
                    modifiers.push('final');
            }
        }
        return modifiers;
    }
    getConstructorModifiers(node) {
        const modifiers = [];
        if (!node?.children?.constructorModifier)
            return modifiers;
        for (const cm of node.children.constructorModifier) {
            if (cm.children) {
                if (cm.children.Public)
                    modifiers.push('public');
                if (cm.children.Private)
                    modifiers.push('private');
                if (cm.children.Protected)
                    modifiers.push('protected');
            }
        }
        return modifiers;
    }
    getFieldType(node) {
        if (!node?.children?.unannType)
            return 'unknown';
        const unannType = node.children.unannType[0];
        return this.extractType(unannType);
    }
    extractType(node) {
        if (!node)
            return 'unknown';
        // Primitive types
        if (node.children?.unannPrimitiveType) {
            const pt = node.children.unannPrimitiveType[0];
            if (pt.children?.numericType) {
                const nt = pt.children.numericType[0];
                if (nt.children?.integralType) {
                    const it = nt.children.integralType[0];
                    if (it.children?.Int)
                        return 'int';
                    if (it.children?.Long)
                        return 'long';
                    if (it.children?.Short)
                        return 'short';
                    if (it.children?.Byte)
                        return 'byte';
                    if (it.children?.Char)
                        return 'char';
                }
                if (nt.children?.floatingPointType) {
                    const ft = nt.children.floatingPointType[0];
                    if (ft.children?.Float)
                        return 'float';
                    if (ft.children?.Double)
                        return 'double';
                }
            }
            if (pt.children?.Boolean)
                return 'boolean';
        }
        // Reference types
        if (node.children?.unannReferenceType) {
            const rt = node.children.unannReferenceType[0];
            if (rt.children?.unannClassOrInterfaceType) {
                const cit = rt.children.unannClassOrInterfaceType[0];
                const className = this.extractClassName(cit);
                const typeArgs = this.extractTypeArguments(cit);
                if (typeArgs) {
                    return `${className}<${typeArgs}>`;
                }
                return className;
            }
        }
        return 'unknown';
    }
    extractClassName(node) {
        if (!node?.children?.unannClassType)
            return '';
        const uct = node.children.unannClassType[0];
        if (uct.children?.Identifier) {
            // Dotted class types (org.slf4j.Logger) expose every segment as a
            // direct Identifier child — join them for the fully-qualified type.
            return uct.children.Identifier.map((id) => id.image).join('.');
        }
        return '';
    }
    extractTypeArguments(node) {
        if (!node?.children?.unannClassType)
            return null;
        const uct = node.children.unannClassType[0];
        if (!uct.children?.typeArguments)
            return null;
        const ta = uct.children.typeArguments[0];
        if (!ta.children?.typeArgumentList)
            return null;
        const tal = ta.children.typeArgumentList[0];
        if (!tal.children?.typeArgument)
            return null;
        const typeArg = tal.children.typeArgument[0];
        if (!typeArg.children?.referenceType)
            return null;
        const rt = typeArg.children.referenceType[0];
        if (!rt.children?.classOrInterfaceType)
            return null;
        const cit = rt.children.classOrInterfaceType[0];
        if (!cit.children?.classType)
            return null;
        const ct = cit.children.classType[0];
        if (!ct.children?.Identifier)
            return null;
        return ct.children.Identifier[0].image;
    }
    getVariableDeclaratorIds(node) {
        const names = [];
        if (!node?.children?.variableDeclaratorList)
            return names;
        const vdl = node.children.variableDeclaratorList[0];
        if (!vdl?.children?.variableDeclarator)
            return names;
        for (const vd of vdl.children.variableDeclarator) {
            if (vd.children?.variableDeclaratorId) {
                const vdi = vd.children.variableDeclaratorId[0];
                if (vdi.children?.Identifier) {
                    names.push(vdi.children.Identifier[0].image);
                }
            }
        }
        return names;
    }
    extractDetailedMethod(node, modifiers, classAttributes, fieldNames, sourceCode) {
        if (!node?.children?.methodHeader)
            return null;
        const header = node.children.methodHeader[0];
        // Get method name
        const methodName = this.getMethodName(header);
        if (!methodName)
            return null;
        const isAbstract = modifiers.includes('abstract');
        const accessModifier = this.getAccessModifier(modifiers);
        const nonAccessModifiers = modifiers.filter(m => !['public', 'protected', 'private', 'package-private'].includes(m));
        // Get return type
        const returnType = this.getReturnType(header);
        const returnTypeGeneric = returnType.includes('<') ? returnType : undefined;
        // Get parameters
        const methodDeclarator = header.children.methodDeclarator?.[0];
        const parameters = methodDeclarator ? this.getDetailedParameters(methodDeclarator, fieldNames) : [];
        // Get generic type parameters
        const genericTypeParams = this.extractGenericTypeParameters(header);
        // Get throws clause
        const throwsExceptions = this.extractThrowsClause(node);
        // Determine method type
        let methodType = 'instance';
        if (nonAccessModifiers.includes('static'))
            methodType = 'static';
        if (nonAccessModifiers.includes('synchronized'))
            methodType = 'synchronized';
        if (isAbstract)
            methodType = 'abstract';
        if (nonAccessModifiers.includes('native'))
            methodType = 'native';
        // Check for default method (interface)
        if (nonAccessModifiers.includes('default'))
            methodType = 'default';
        // Get method body
        const methodBody = node.children?.methodBody?.[0];
        const bodyInfo = this.analyzeMethodBody(methodBody, parameters, returnType);
        let cyclomaticComplexity = 1;
        let businessLogicScore = 0;
        let accessedFields = [];
        let complexityMetrics;
        if (methodBody) {
            complexityMetrics = this.extractComplexityMetrics(methodBody);
            cyclomaticComplexity = complexityMetrics.cyclomaticComplexity;
            accessedFields = this.extractAccessedFields(methodBody, fieldNames);
            if (methodBody.location) {
                const start = methodBody.location.startOffset;
                const end = methodBody.location.endOffset;
                if (typeof start === 'number' && typeof end === 'number') {
                    const bodyText = sourceCode.substring(start, end + 1);
                    businessLogicScore = this.calculateBusinessLogicScore(bodyText, bodyInfo.linesOfCode, cyclomaticComplexity);
                }
            }
        }
        bodyInfo.cyclomaticComplexity = cyclomaticComplexity;
        bodyInfo.businessLogicScore = businessLogicScore;
        bodyInfo.complexityMetrics = complexityMetrics;
        // Build symbol table for variable resolution
        const symbolTable = new Map();
        // Add class-level fields (attributes)
        for (const attr of classAttributes) {
            symbolTable.set(attr.name, { type: attr.dataType, isInjected: attr.isInjected || false });
        }
        // Add method parameters (they shadow fields)
        for (const param of parameters) {
            symbolTable.set(param.name, { type: param.dataType, isInjected: param.isInjected || false });
        }
        // Add local variables from method body (they shadow parameters/fields)
        if (bodyInfo.localVariables) {
            for (const local of bodyInfo.localVariables) {
                symbolTable.set(local.name, { type: local.dataType, isInjected: false });
            }
        }
        // Extract behavioral dependencies with symbol resolution
        const calledMethods = this.extractMethodCalls(methodBody, symbolTable);
        const createdObjects = this.extractObjectCreationsFromBody(methodBody);
        bodyInfo.persistenceWrites = this.extractPersistenceWrites(calledMethods);
        bodyInfo.writtenVariables = this.extractWrittenVariables(methodBody);
        const loc = this.extractLocation(node);
        const method = {
            name: methodName,
            accessModifier: isAbstract ? 'public' : accessModifier,
            ...loc,
            nonAccessModifiers,
            returnType,
            returnTypeGeneric,
            parameters,
            genericTypeParams,
            throwsExceptions,
            methodType,
            overrides: undefined,
            overloads: [],
            isVarArgs: parameters.some(p => p.isVarArgs),
            isBridge: false,
            isSynthetic: false,
            annotations: this.extractMethodAnnotations(node),
            javaDocComment: this.extractJavaDoc(node),
            body: bodyInfo,
            memoryBehavior: {
                stackFrame: 'pushed on call, popped on return',
                localVarsOnStack: true
            },
            calledMethods,
            createdObjects,
            accessedFields,
            complexityMetrics
        };
        return method;
    }
    extractMethodCalls(methodBody, symbolTable) {
        const calls = [];
        if (!methodBody)
            return calls;
        const extractArgumentsFromSuffix = (suffix) => {
            const args = [];
            const mis = suffix.children?.methodInvocationSuffix?.[0];
            if (!mis?.children?.argumentList)
                return args;
            const al = mis.children.argumentList[0];
            if (!al?.children?.expression)
                return args;
            for (const expr of al.children.expression) {
                const val = this.extractExpressionValue(expr);
                args.push(val !== null && val !== undefined ? String(val) : '?');
            }
            return args;
        };
        const collectFqnIdentifiers = (fqnNode) => {
            const ids = [];
            const collect = (n) => {
                if (!n)
                    return;
                if (n.name === 'fqnOrRefTypePartCommon' && n.children?.Identifier) {
                    for (const id of n.children.Identifier) {
                        if (id.image)
                            ids.push(id.image);
                    }
                }
                if (n.children) {
                    for (const key of Object.keys(n.children)) {
                        if (Array.isArray(n.children[key])) {
                            for (const c of n.children[key])
                                collect(c);
                        }
                    }
                }
            };
            collect(fqnNode);
            return ids;
        };
        const traverse = (node) => {
            if (!node)
                return;
            // java-parser 2.x: method calls use primarySuffix.methodInvocationSuffix
            if (node.name === 'primarySuffix' && node.children?.methodInvocationSuffix) {
                // Find the parent primary node to extract receiver
                let primaryNode = null;
                const findPrimary = (n, parent) => {
                    if (n === node) {
                        primaryNode = parent;
                        return true;
                    }
                    if (n.children) {
                        for (const key of Object.keys(n.children)) {
                            if (Array.isArray(n.children[key])) {
                                for (const c of n.children[key]) {
                                    if (findPrimary(c, n))
                                        return true;
                                }
                            }
                        }
                    }
                    return false;
                };
                // Walk up from parameter (we can't, no parent pointers)
                // Instead, methodInvocationSuffix is found inside primary > primarySuffix
                // The primaryPrefix has the receiver
                // Since we can't walk up, we traverse the tree differently
                const mis = node.children.methodInvocationSuffix[0];
                const lineNumber = mis.location?.startLine || 0;
                const args = extractArgumentsFromSuffix(node);
                // Find the method name from the invocation suffix
                // Actually, we need the receiver which is in primaryPrefix > fqnOrRefType
                // Let's defer and handle this at the primary level
                return traverse(mis);
            }
            // Look for the pattern: primary -> primaryPrefix.fqnOrRefType + primarySuffix.methodInvocationSuffix
            if (node.name === 'primary') {
                const prefix = node.children?.primaryPrefix?.[0];
                const suffix = node.children?.primarySuffix?.[0];
                if (prefix && suffix && suffix.children?.methodInvocationSuffix) {
                    const fqnNode = prefix.children?.fqnOrRefType?.[0];
                    const fqnIdentifiers = fqnNode ? collectFqnIdentifiers(fqnNode) : [];
                    if (fqnIdentifiers.length > 0) {
                        const methodName = fqnIdentifiers.pop();
                        const receiverName = fqnIdentifiers.length > 0 ? fqnIdentifiers.join('.') : undefined;
                        // The first identifier is the receiver variable
                        const firstId = fqnIdentifiers.length > 0 ? fqnIdentifiers[0] : undefined;
                        let targetClass;
                        let receiverType;
                        let receiverIsInjected = false;
                        let lineNumber;
                        const loc = this.extractLocation(suffix);
                        if (loc?.startLine)
                            lineNumber = loc.startLine;
                        if (firstId && symbolTable) {
                            const symbol = symbolTable.get(firstId);
                            if (symbol) {
                                targetClass = symbol.type;
                                receiverType = symbol.type;
                                receiverIsInjected = symbol.isInjected;
                            }
                            else if (/^[A-Z]/.test(firstId)) {
                                targetClass = firstId;
                                receiverType = firstId;
                            }
                        }
                        const args = extractArgumentsFromSuffix(suffix);
                        calls.push({
                            calledMethodName: methodName,
                            targetClass,
                            targetMethod: targetClass ? `${targetClass}.${methodName}` : methodName,
                            isLibraryCall: targetClass ? this.isStandardLibrary(targetClass) : false,
                            lineNumber,
                            receiverVariableName: receiverName || firstId,
                            receiverType,
                            receiverIsInjected: receiverIsInjected || undefined,
                            arguments: args
                        });
                    }
                    // Deliberately do NOT return here — descend so nested method
                    // invocations inside argument lists (e.g. b.getX() in a.setX(b.getX()))
                    // are captured as their own MethodCall entries.
                }
            }
            // Also handle the old methodCall format (legacy)
            if (node.name === 'methodCall' && node.children?.methodName) {
                const methodNameNode = node.children.methodName[0];
                const methodName = this.extractSimpleName(methodNameNode);
                if (methodName) {
                    const receiver = this.extractReceiver(node);
                    let targetClass;
                    let receiverVarName;
                    let receiverType;
                    let receiverIsInjected = false;
                    const loc2 = this.extractLocation(node);
                    if (receiver) {
                        const varName = this.getReceiverVariableName(receiver);
                        receiverVarName = varName;
                        receiverType = this.inferReceiverType(receiver);
                        if (varName && symbolTable) {
                            const symbol = symbolTable.get(varName);
                            if (symbol) {
                                targetClass = symbol.type;
                                receiverType = symbol.type;
                                receiverIsInjected = symbol.isInjected;
                            }
                            else if (/^[A-Z]/.test(varName)) {
                                targetClass = varName;
                                receiverType = varName;
                            }
                        }
                        else if (varName && /^[A-Z]/.test(varName)) {
                            targetClass = varName;
                            receiverType = varName;
                        }
                    }
                    calls.push({
                        calledMethodName: methodName,
                        targetClass,
                        targetMethod: targetClass ? `${targetClass}.${methodName}` : methodName,
                        isLibraryCall: targetClass ? this.isStandardLibrary(targetClass) : false,
                        lineNumber: loc2?.startLine,
                        receiverVariableName: receiverVarName,
                        receiverType,
                        receiverIsInjected: receiverIsInjected || undefined,
                        arguments: []
                    });
                }
            }
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            traverse(child);
                        }
                    }
                }
            }
        };
        traverse(methodBody);
        return calls;
    }
    getReceiverVariableName(receiver) {
        if (!receiver)
            return undefined;
        if (receiver.name === 'Identifier') {
            return receiver.image;
        }
        if (receiver.children?.Identifier) {
            // Return first identifier (could be qualified, we take the last part)
            const identifiers = receiver.children.Identifier;
            if (identifiers.length > 0) {
                return identifiers[identifiers.length - 1].image;
            }
        }
        // For expressionName, it might have an Identifier directly
        if (receiver.name === 'expressionName' && receiver.children?.Identifier) {
            return receiver.children.Identifier[0].image;
        }
        return undefined;
    }
    extractObjectCreationsFromBody(methodBody) {
        const creations = [];
        if (!methodBody)
            return creations;
        const LOOP_NODES = new Set([
            'forStatement', 'basicForStatement', 'enhancedForStatement',
            'whileStatement', 'doStatement',
        ]);
        const traverse = (node, loopDepth = 0) => {
            if (!node)
                return;
            if (node.name === 'newExpression' || node.name === 'objectCreationExpression') {
                const className = this.extractCreatedClassName(node);
                if (className) {
                    creations.push({
                        className,
                        isExternal: false,
                        lineNumber: node.location?.startLine ?? 0,
                        constructorArgs: this.extractCreationArgs(node),
                        hasBranching: this.containsConditionalExpression(node),
                        insideLoop: loopDepth > 0,
                    });
                }
            }
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            traverse(child, LOOP_NODES.has(node.name) ? loopDepth + 1 : loopDepth);
                        }
                    }
                }
            }
        };
        traverse(methodBody);
        return creations;
    }
    /** Extract the constructor argument expressions for a `new` CST node (mirrors extractArgumentsFromSuffix). */
    extractCreationArgs(node) {
        const args = [];
        const collectArgs = (n) => {
            if (!n)
                return;
            const al = n.children?.argumentList?.[0];
            if (al?.children?.expression) {
                for (const expr of al.children.expression) {
                    const val = this.extractExpressionValue(expr);
                    args.push(val !== null && val !== undefined ? String(val) : '?');
                }
            }
            if (n.children) {
                for (const key of Object.keys(n.children)) {
                    if (Array.isArray(n.children[key])) {
                        for (const c of n.children[key]) {
                            if (c === n)
                                continue;
                            collectArgs(c);
                        }
                    }
                }
            }
        };
        collectArgs(node);
        return args;
    }
    /** True if the CST subtree contains a conditional (ternary) expression — branching logic inside a construction. */
    containsConditionalExpression(node) {
        if (!node)
            return false;
        // java-parser wraps every expression in a conditionalExpression pass-through;
        // a real ternary additionally carries QuestionMark/Colon children.
        if (node.name === 'conditionalExpression' && node.children?.QuestionMark)
            return true;
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        if (child !== node && this.containsConditionalExpression(child))
                            return true;
                    }
                }
            }
        }
        return false;
    }
    extractPersistenceWrites(calledMethods) {
        const writes = [];
        for (const call of calledMethods) {
            const receiverType = call.receiverType || call.targetClass || '';
            if (!this.PERSISTENCE_TYPE_RE.test(receiverType.replace(/<.*>/g, '').trim()))
                continue;
            if (this.PERSISTENCE_READ_RE.test(call.calledMethodName))
                continue;
            writes.push({
                call: `${receiverType.split('.').pop()}.${call.calledMethodName}`,
                line: call.lineNumber || 0,
            });
        }
        return writes;
    }
    extractWrittenVariables(methodBody) {
        if (!methodBody)
            return [];
        const written = new Set();
        const traverse = (node) => {
            if (!node)
                return;
            if (node.name === 'localVariableDeclaration') {
                const names = this.getLocalVarNames(node);
                for (const n of names)
                    written.add(n);
            }
            // Assignment x = ..., x += ... — CST: binaryExpression has an AssignmentOperator child.
            if (node.name === 'binaryExpression' && Array.isArray(node.children?.AssignmentOperator)
                && Array.isArray(node.children.unaryExpression)) {
                const lhs = node.children.unaryExpression[0];
                const ids = this.collectLhsIdentifiers(lhs);
                for (const id of ids)
                    written.add(id);
            }
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key])
                            traverse(child);
                    }
                }
            }
        };
        traverse(methodBody);
        return Array.from(written);
    }
    /** Collects the identifiers written on the left-hand side (x, this.field, a.b, arr[i]). */
    collectLhsIdentifiers(node) {
        if (!node)
            return [];
        const ids = [];
        const collect = (n) => {
            if (!n)
                return;
            if (Array.isArray(n.children?.Identifier)) {
                for (const id of n.children.Identifier) {
                    if (id?.image)
                        ids.push(id.image);
                }
            }
            if (n.children) {
                for (const key of Object.keys(n.children)) {
                    if (Array.isArray(n.children[key])) {
                        for (const c of n.children[key])
                            collect(c);
                    }
                }
            }
        };
        collect(node);
        return ids;
    }
    extractDetailedMethodParameters(header, fieldNames) {
        const params = [];
        if (!header?.children?.methodDeclarator)
            return params;
        const declarator = header.children.methodDeclarator[0];
        if (!declarator?.children?.formalParameterList)
            return params;
        const fpl = declarator.children.formalParameterList[0];
        if (!fpl?.children?.formalParameter)
            return params;
        const formalParams = fpl.children.formalParameter;
        for (let i = 0; i < formalParams.length; i++) {
            const fp = formalParams[i];
            const paramType = this.getParameterType(fp);
            const paramName = this.getParameterName(fp);
            const paramModifiers = this.getParameterModifiers(fp);
            const paramAnnotations = this.extractParameterAnnotations(fp);
            const isInjected = this.isInjectionAnnotation(paramAnnotations);
            params.push({
                name: paramName,
                dataType: paramType,
                position: i,
                isFinal: paramModifiers.includes('final'),
                isVarArgs: paramModifiers.includes('varargs'),
                passedBy: 'value',
                annotations: paramAnnotations,
                scope: 'method',
                memoryType: 'stack',
                shadowsField: fieldNames.has(paramName),
                isInjected
            });
        }
        return params;
    }
    extractDetailedConstructor(node, modifiers, className, fieldNames) {
        if (!node?.children?.constructorDeclarator)
            return null;
        const declarator = node.children.constructorDeclarator[0];
        // Constructor name must match class name
        const constructorName = this.getSimpleTypeName(declarator);
        if (!constructorName || constructorName !== className)
            return null;
        const accessModifier = this.getAccessModifier(modifiers);
        const parameters = this.getDetailedParameters(declarator, fieldNames);
        const annotations = this.extractConstructorAnnotations(node);
        const javaDocComment = this.extractJavaDoc(node);
        // Determine constructor type
        let constructorType = 'parameterized';
        if (parameters.length === 0) {
            constructorType = 'no-arg';
        }
        // Check for chained constructor
        let callsThis = false;
        let callsSuper = false;
        let chainedConstructor;
        const throwsExceptions = [];
        // Analyze constructor body for method calls and object creations
        const constructorBody = node.children?.constructorBody?.[0];
        const constructorBlock = constructorBody?.children?.block?.[0];
        const explicitConstructorInvocation = constructorBlock?.children?.explicitConstructorInvocation;
        if (explicitConstructorInvocation && explicitConstructorInvocation.length > 0) {
            const eci = explicitConstructorInvocation[0];
            if (eci.children?.this) {
                callsThis = true;
                chainedConstructor = `${className}(${this.extractChainedConstructorParams(eci)})`;
            }
            else if (eci.children?.constructorArguments || eci.children?.primary) {
                callsSuper = true;
            }
        }
        const bodyInfo = this.analyzeConstructorBody(constructorBody, parameters);
        const loc = this.extractLocation(node);
        const accessedFields = this.extractAccessedFields(constructorBody, fieldNames);
        const injectionAssignments = this.detectConstructorInjection(constructorBody, parameters, fieldNames);
        const constructor = {
            name: constructorName,
            accessModifier,
            ...loc,
            constructorType,
            parameters,
            throwsExceptions,
            callsThis,
            callsSuper,
            chainedConstructor,
            body: this.extractConstructorBody(node),
            annotations,
            javaDocComment,
            isDefault: parameters.length === 0,
            isSynthetic: false,
            genericTypeParams: [],
            calledMethods: bodyInfo.calledMethods,
            createdObjects: bodyInfo.createdObjects,
            accessedFields,
            injectionAssignments
        };
        return constructor;
    }
    detectConstructorInjection(constructorBody, parameters, fieldNames) {
        const assignments = [];
        if (!constructorBody)
            return assignments;
        const block = constructorBody.children?.block;
        const blockNode = Array.isArray(block) ? block[0] : block;
        const stmts = blockNode ? this.getBlockStatements(blockNode) : (constructorBody.children?.blockStatements?.[0]?.children?.blockStatement || []);
        for (const stmt of stmts) {
            const statement = stmt.children?.statement?.[0];
            if (!statement)
                continue;
            // Look for assignment expressions
            this.findAssignmentPatterns(statement, parameters, fieldNames, assignments);
        }
        return assignments;
    }
    findAssignmentPatterns(node, parameters, fieldNames, assignments) {
        if (!node)
            return;
        // java-parser 2.x: assignment is inside expression > conditionalExpression > binaryExpression
        // with AssignmentOperator child
        if (node.name === 'binaryExpression' && node.children?.AssignmentOperator) {
            // Left side (target)
            let fieldName = null;
            const lhs = node.children?.unaryExpression?.[0];
            const rhs = node.children?.expression?.[0];
            if (lhs) {
                // Check for this.field pattern: primary > primaryPrefix.This + primarySuffix.Identifier
                const primary = this.findChildByName(lhs, 'primary');
                if (primary) {
                    const prefix = primary.children?.primaryPrefix?.[0];
                    const suffix = primary.children?.primarySuffix?.[0];
                    if (prefix?.children?.This && suffix?.children?.Identifier) {
                        fieldName = suffix.children.Identifier[0].image;
                    }
                }
                // Check for direct field access
                if (!fieldName) {
                    const id = this.findFirstIdentifier(lhs);
                    if (id)
                        fieldName = id;
                }
            }
            if (fieldName && fieldNames.has(fieldName) && rhs) {
                const paramName = this.findFirstIdentifier(rhs);
                if (paramName) {
                    const paramIdx = parameters.findIndex(p => p.name === paramName);
                    if (paramIdx >= 0) {
                        assignments.push({
                            fieldName,
                            parameterName: paramName,
                            parameterIndex: paramIdx
                        });
                    }
                }
            }
            return;
        }
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        this.findAssignmentPatterns(child, parameters, fieldNames, assignments);
                    }
                }
            }
        }
    }
    findChildByName(node, name) {
        if (!node)
            return null;
        if (node.name === name)
            return node;
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        const result = this.findChildByName(child, name);
                        if (result)
                            return result;
                    }
                }
            }
        }
        return null;
    }
    findFirstIdentifier(node) {
        if (!node)
            return null;
        if (node.name === 'Identifier' || (node.image && !node.children)) {
            return node.image || null;
        }
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        const result = this.findFirstIdentifier(child);
                        if (result)
                            return result;
                    }
                }
            }
        }
        return null;
    }
    analyzeConstructorBody(constructorBody, parameters) {
        if (!constructorBody) {
            return { calledMethods: [], createdObjects: [] };
        }
        const block = constructorBody.children?.block;
        const blockNode = Array.isArray(block) ? block[0] : block;
        const stmts = blockNode ? this.getBlockStatements(blockNode) : (constructorBody.children?.blockStatements?.[0]?.children?.blockStatement || []);
        const calledMethods = [];
        const createdObjects = [];
        for (const stmt of stmts) {
            if (stmt.children?.statement) {
                const statement = stmt.children.statement[0];
                // Extract method calls
                this.analyzeStatementForCalls(statement, (callType, targetClass, methodName) => {
                    if (callType === 'method' && methodName) {
                        calledMethods.push({
                            calledMethodName: methodName,
                            targetClass: targetClass,
                            targetMethod: targetClass ? `${targetClass}.${methodName}` : methodName,
                            isLibraryCall: targetClass ? this.isStandardLibrary(targetClass) : false,
                            lineNumber: 0,
                            arguments: []
                        });
                    }
                });
                // Extract object creations
                const creations = this.extractObjectCreations(statement);
                createdObjects.push(...creations);
            }
        }
        return { calledMethods, createdObjects };
    }
    getDetailedParameters(declarator, fieldNames) {
        const params = [];
        if (!declarator?.children?.formalParameterList)
            return params;
        const fpl = declarator.children.formalParameterList[0];
        if (!fpl?.children?.formalParameter)
            return params;
        const formalParams = fpl.children.formalParameter;
        for (let i = 0; i < formalParams.length; i++) {
            const fp = formalParams[i];
            const paramType = this.getParameterType(fp);
            const paramName = this.getParameterName(fp);
            const paramModifiers = this.getParameterModifiers(fp);
            const paramAnnotations = this.extractParameterAnnotations(fp);
            const isInjected = this.isInjectionAnnotation(paramAnnotations);
            const loc = this.extractLocation(fp);
            params.push({
                name: paramName,
                dataType: paramType,
                ...loc,
                position: i,
                isFinal: paramModifiers.includes('final'),
                isVarArgs: paramModifiers.includes('varargs'),
                passedBy: 'value',
                annotations: paramAnnotations,
                scope: 'method',
                memoryType: 'stack',
                shadowsField: fieldNames.has(paramName),
                isInjected
            });
        }
        return params;
    }
    extractInterfaceMethod(node) {
        if (!node?.children?.methodHeader)
            return null;
        const header = node.children.methodHeader[0];
        const methodName = this.getMethodName(header);
        if (!methodName)
            return null;
        const returnType = this.getReturnType(header);
        const parameters = this.getMethodParameters(header);
        return {
            name: methodName,
            returnType,
            access: 'abstract',
            parameters
        };
    }
    getMethodName(header) {
        if (!header?.children?.methodDeclarator)
            return '';
        const declarator = header.children.methodDeclarator[0];
        if (!declarator?.children?.Identifier)
            return '';
        return declarator.children.Identifier[0].image;
    }
    getSimpleTypeName(node) {
        if (!node?.children?.simpleTypeName)
            return '';
        const stn = node.children.simpleTypeName[0];
        if (stn?.children?.Identifier) {
            return stn.children.Identifier[0].image;
        }
        if (stn?.children?.typeIdentifier) {
            const ti = stn.children.typeIdentifier[0];
            if (ti?.children?.Identifier) {
                return ti.children.Identifier[0].image;
            }
        }
        return '';
    }
    getReturnType(header) {
        if (!header?.children?.result)
            return 'void';
        const result = header.children.result[0];
        if (result.children?.Void)
            return 'void';
        if (result.children?.unannType) {
            return this.extractType(result.children.unannType[0]);
        }
        return 'void';
    }
    getMethodParameters(header) {
        const params = [];
        if (!header?.children?.methodDeclarator)
            return params;
        const declarator = header.children.methodDeclarator[0];
        if (!declarator?.children?.formalParameterList)
            return params;
        const fpl = declarator.children.formalParameterList[0];
        if (!fpl?.children?.formalParameter)
            return params;
        for (const fp of fpl.children.formalParameter) {
            const paramType = this.getParameterType(fp);
            const paramName = this.getParameterName(fp);
            params.push({
                name: paramName,
                type: paramType
            });
        }
        return params;
    }
    getConstructorParameters(declarator) {
        const params = [];
        if (!declarator?.children?.formalParameterList)
            return params;
        const fpl = declarator.children.formalParameterList[0];
        if (!fpl?.children?.formalParameter)
            return params;
        for (const fp of fpl.children.formalParameter) {
            const paramType = this.getParameterType(fp);
            const paramName = this.getParameterName(fp);
            params.push({
                name: paramName,
                type: paramType
            });
        }
        return params;
    }
    getParameterType(fp) {
        // java-parser 2.x: unannType is inside variableParaRegularParameter
        let typeNode = null;
        if (fp?.children?.variableParaRegularParameter) {
            const vprp = fp.children.variableParaRegularParameter[0];
            if (vprp?.children?.unannType) {
                typeNode = vprp.children.unannType[0];
            }
        }
        if (!typeNode && fp?.children?.unannType) {
            typeNode = fp.children.unannType[0];
        }
        if (!typeNode)
            return 'unknown';
        return this.extractType(typeNode);
    }
    getParameterModifiers(fp) {
        const modifiers = [];
        if (!fp?.children)
            return modifiers;
        if (fp.children.final)
            modifiers.push('final');
        if (fp.children.annotations)
            modifiers.push('annotated');
        // Check for varargs
        if (fp.children?.variableArityParameter) {
            modifiers.push('varargs');
        }
        return modifiers;
    }
    getParameterName(fp) {
        // java-parser 2.x CST: use variableParaRegularParameter
        if (fp?.children?.variableParaRegularParameter) {
            const vprp = fp.children.variableParaRegularParameter[0];
            // Inside it, find variableDeclaratorId
            const findId = (n) => {
                if (!n)
                    return '';
                if (n.children?.variableDeclaratorId) {
                    const vdi = n.children.variableDeclaratorId[0];
                    if (vdi?.children?.Identifier)
                        return vdi.children.Identifier[0].image;
                }
                if (n.children) {
                    for (const key of Object.keys(n.children)) {
                        if (Array.isArray(n.children[key])) {
                            for (const c of n.children[key]) {
                                const r = findId(c);
                                if (r)
                                    return r;
                            }
                        }
                    }
                }
                return '';
            };
            const name = findId(vprp);
            if (name)
                return name;
        }
        // Legacy: direct variableDeclaratorId
        if (fp?.children?.variableDeclaratorId) {
            const vdi = fp.children.variableDeclaratorId[0];
            if (vdi?.children?.Identifier)
                return vdi.children.Identifier[0].image;
        }
        return 'param';
    }
    extractAnnotations(node) {
        const annotations = [];
        if (!node?.children?.annotations)
            return annotations;
        const annotationsNode = node.children.annotations[0];
        if (!annotationsNode?.children?.annotation)
            return annotations;
        for (const ann of annotationsNode.children.annotation) {
            const fqName = this.getAnnotationName(ann);
            if (fqName) {
                const simpleName = fqName.split('.').pop() || fqName;
                const elements = this.extractAnnotationElements(ann);
                const isBuiltIn = this.isBuiltInAnnotation(fqName);
                const loc = this.extractLocation(ann);
                annotations.push({
                    name: simpleName,
                    fullyQualifiedName: fqName,
                    ...loc,
                    target: [], // Not available at usage site
                    retention: 'RUNTIME', // Default assumption
                    isInherited: false,
                    isRepeatable: false,
                    elements,
                    isBuiltIn
                });
            }
        }
        return annotations;
    }
    extractAnnotationElements(ann) {
        const elements = {};
        if (!ann?.children?.elementValuePair)
            return elements;
        for (const evp of ann.children.elementValuePair) {
            const keyNode = evp.children?.identifier;
            const valueNode = evp.children?.elementValue;
            if (keyNode && valueNode) {
                const key = keyNode[0]?.image;
                const value = this.extractElementValue(valueNode);
                if (key)
                    elements[key] = value;
            }
        }
        return elements;
    }
    extractElementValue(node) {
        if (!node)
            return null;
        // Handle simple values: literals, class literals, etc.
        // This is a simplified extraction
        if (node.children?.expression) {
            return this.extractExpressionValue(node.children.expression[0]);
        }
        if (node.name === 'stringLiteral') {
            return node.image?.replace(/^"|"$/g, '');
        }
        if (node.name === 'integerLiteral') {
            return parseInt(node.image || '0');
        }
        if (node.name === 'booleanLiteral') {
            return node.image === 'true';
        }
        if (node.name === 'nullLiteral') {
            return null;
        }
        if (node.name === 'Identifier') {
            return node.image;
        }
        return null;
    }
    isBuiltInAnnotation(fqName) {
        const builtIns = [
            'java.lang.Override',
            'java.lang.Deprecated',
            'java.lang.SuppressWarnings',
            'java.lang.annotation.Target',
            'java.lang.annotation.Retention',
            'java.lang.annotation.Inherited',
            'java.lang.annotation.Documented',
            'jakarta.annotation.Generated'
        ];
        return builtIns.includes(fqName);
    }
    extractMethodAnnotations(node) {
        const annotations = [];
        if (!node?.children?.methodModifier)
            return annotations;
        // java-parser 2.x: annotation is directly in methodModifier entries, no wrapping 'annotations' node
        for (const mod of node.children.methodModifier) {
            if (mod.children?.annotation) {
                for (const ann of mod.children.annotation) {
                    const annObj = this.extractAnnotation(ann);
                    if (annObj)
                        annotations.push(annObj);
                }
            }
        }
        return annotations;
    }
    extractAnnotation(ann) {
        const fqName = this.getAnnotationName(ann);
        if (!fqName)
            return null;
        const simpleName = fqName.split('.').pop() || fqName;
        const elements = this.extractAnnotationElements(ann);
        const isBuiltIn = this.isBuiltInAnnotation(fqName);
        const loc = this.extractLocation(ann);
        return {
            name: simpleName,
            fullyQualifiedName: fqName,
            ...loc,
            target: [],
            retention: 'RUNTIME',
            isInherited: false,
            isRepeatable: false,
            elements,
            isBuiltIn
        };
    }
    extractParameterAnnotations(fp) {
        const annotations = [];
        // java-parser 2.x CST: annotation nodes are inside variableModifier entries under variableParaRegularParameter
        const vprp = fp?.children?.variableParaRegularParameter?.[0];
        if (vprp?.children?.variableModifier) {
            for (const mod of vprp.children.variableModifier) {
                if (mod?.children?.annotation) {
                    for (const ann of mod.children.annotation) {
                        const annObj = this.extractAnnotation(ann);
                        if (annObj)
                            annotations.push(annObj);
                    }
                }
            }
        }
        return annotations;
    }
    extractConstructorAnnotations(node) {
        const annotations = [];
        // java-parser 2.x: annotations are inside constructorModifier entries on the constructorDeclaration
        if (node?.children?.constructorModifier) {
            for (const mod of node.children.constructorModifier) {
                if (mod.children?.annotation) {
                    for (const ann of mod.children.annotation) {
                        const annObj = this.extractAnnotation(ann);
                        if (annObj)
                            annotations.push(annObj);
                    }
                }
            }
        }
        return annotations;
    }
    getAnnotationName(ann) {
        if (!ann?.children)
            return '';
        // java-parser 2.x CST: annotation has At + typeName (or annotationName/qualifiedName in other formats)
        if (ann.children.typeName) {
            return this.getIdentifierFromNode(ann.children.typeName[0]);
        }
        if (ann.children.qualifiedName) {
            return this.getIdentifierFromNode(ann.children.qualifiedName[0]);
        }
        if (ann.children.annotationName) {
            return this.getIdentifierFromNode(ann.children.annotationName[0]);
        }
        return '';
    }
    extractJavaDoc(node) {
        // In java-parser, comments are not part of the CST by default
        // We would need the original source code and line numbers to extract javadoc
        return undefined;
    }
    extractFieldJavaDoc(vd) {
        // Similarly, javadoc extraction requires source code with comment positions
        return undefined;
    }
    getAccessModifier(modifiers) {
        if (modifiers.includes('public'))
            return 'public';
        if (modifiers.includes('private'))
            return 'private';
        if (modifiers.includes('protected'))
            return 'protected';
        return 'package-private';
    }
    extractGenericTypeParameters(node) {
        const typeParams = [];
        if (node?.children?.typeParameters) {
            const tp = node.children.typeParameters[0];
            if (tp?.children?.typeParameterList) {
                const tpl = tp.children.typeParameterList[0];
                if (tpl?.children?.typeParameter) {
                    for (const param of tpl.children.typeParameter) {
                        const typeParamName = this.getTypeParameterName(param);
                        const bound = this.getTypeParameterBound(param);
                        const variance = this.determineVariance(param);
                        typeParams.push({
                            typeParam: typeParamName,
                            bound,
                            variance
                        });
                    }
                }
            }
        }
        return typeParams;
    }
    getTypeParameterName(param) {
        if (!param?.children?.Identifier)
            return 'T';
        return param.children.Identifier[0].image;
    }
    getTypeParameterBound(param) {
        if (!param?.children?.typeBound)
            return undefined;
        const bound = param.children.typeBound[0];
        if (!bound?.children?.referenceType)
            return undefined;
        return this.extractClassName(bound.children.referenceType[0]);
    }
    determineVariance(param) {
        // In Java, type parameters are invariant by default unless wildcards are used
        // Determining variance requires analyzing usage sites
        return 'invariant';
    }
    analyzeMethodBody(methodBody, parameters, returnType) {
        if (!methodBody) {
            return {
                linesOfCode: 0,
                localVariables: [],
                callsThis: false,
                callsSuper: false,
                returnsValue: returnType !== 'void'
            };
        }
        const block = methodBody.children?.block?.[0];
        const stmts = this.getBlockStatements(block);
        const localVariables = [];
        let linesOfCode = 0;
        let callsThis = false;
        let callsSuper = false;
        for (const stmt of stmts) {
            if (stmt.children?.statement) {
                const statement = stmt.children.statement[0];
                linesOfCode++;
                // Check for this/super calls
                this.analyzeStatementForCalls(statement, c => {
                    if (c === 'this')
                        callsThis = true;
                    if (c === 'super')
                        callsSuper = true;
                });
                // Extract local variables
                const locals = this.extractLocalVariables(statement);
                localVariables.push(...locals);
            }
            else {
                // java-parser 2.x wraps locals in localVariableDeclarationStatement
                linesOfCode++;
                this.analyzeStatementForCalls(stmt, c => {
                    if (c === 'this')
                        callsThis = true;
                    if (c === 'super')
                        callsSuper = true;
                });
                const locals = this.extractLocalVariables(stmt);
                localVariables.push(...locals);
            }
        }
        return {
            linesOfCode,
            localVariables,
            callsThis,
            callsSuper,
            returnsValue: returnType !== 'void'
        };
    }
    getBlockStatements(block) {
        if (!block?.children)
            return [];
        if (Array.isArray(block.children.blockStatement)) {
            return block.children.blockStatement;
        }
        if (Array.isArray(block.children.blockStatements)) {
            const blockStatements = block.children.blockStatements[0];
            return blockStatements?.children?.blockStatement || [];
        }
        return [];
    }
    isStandardLibrary(className) {
        return className.startsWith('java.') || className.startsWith('javax.') || className.startsWith('jakarta.');
    }
    analyzeStatementForCalls(statement, callback) {
        if (!statement)
            return;
        // java-parser 2.x: method invocation via primary > primarySuffix.methodInvocationSuffix
        if (statement.name === 'primary') {
            const prefix = statement.children?.primaryPrefix?.[0];
            const suffix = statement.children?.primarySuffix?.[0];
            if (suffix?.children?.methodInvocationSuffix) {
                // Check for this/super calls: This(...) or Super(...)
                if (prefix?.children?.This) {
                    callback('this');
                    return;
                }
                if (prefix?.children?.Super) {
                    callback('super');
                    return;
                }
                // Regular method call: extract from fqnOrRefType
                const fqnNode = prefix?.children?.fqnOrRefType?.[0];
                if (fqnNode) {
                    const ids = this.collectFqnIdentifiers(fqnNode);
                    if (ids.length > 0) {
                        const methodName = ids.pop();
                        const receiverName = ids.join('.');
                        let targetClass;
                        if (receiverName) {
                            targetClass = this.inferReceiverTypeByName(receiverName);
                        }
                        callback('method', targetClass, methodName);
                        return; // Don't recurse further into this primary
                    }
                }
            }
        }
        // Legacy methodCall format (java-parser 1.x)
        if (statement.name === 'methodCall') {
            if (statement.children?.methodName) {
                const methodNameNode = statement.children.methodName[0];
                const methodName = this.extractSimpleName(methodNameNode);
                if (methodName) {
                    const receiver = this.extractReceiver(statement);
                    let targetClass;
                    if (receiver) {
                        targetClass = this.inferReceiverType(receiver);
                    }
                    callback('method', targetClass, methodName);
                }
            }
            if (statement.children?.primary) {
                const primary = statement.children.primary[0];
                if (primary.children?.expression) {
                    this.analyzeStatementForCalls(primary.children.expression[0], callback);
                }
            }
        }
        // Constructor invocation: new ClassName(...)
        if (statement.name === 'newExpression' || statement.name === 'objectCreationExpression') {
            const className = this.extractCreatedClassName(statement);
            if (className) {
                callback('method', className, '<init>');
            }
        }
        // Recursive search
        if (statement.children) {
            for (const key of Object.keys(statement.children)) {
                if (Array.isArray(statement.children[key])) {
                    for (const child of statement.children[key]) {
                        this.analyzeStatementForCalls(child, callback);
                    }
                }
            }
        }
    }
    collectFqnIdentifiers(fqnNode) {
        const ids = [];
        const collect = (n) => {
            if (!n)
                return;
            if (n.name === 'fqnOrRefTypePartCommon' && n.children?.Identifier) {
                for (const id of n.children.Identifier) {
                    if (id.image)
                        ids.push(id.image);
                }
            }
            if (n.children) {
                for (const key of Object.keys(n.children)) {
                    if (Array.isArray(n.children[key])) {
                        for (const c of n.children[key])
                            collect(c);
                    }
                }
            }
        };
        collect(fqnNode);
        return ids;
    }
    inferReceiverTypeByName(receiverName) {
        const firstSegment = receiverName.split('.')[0];
        if (!firstSegment)
            return undefined;
        if (/^[A-Z]/.test(firstSegment)) {
            return firstSegment;
        }
        return undefined;
    }
    extractSimpleName(node) {
        if (!node)
            return '';
        if (node.children?.Identifier) {
            return node.children.Identifier[0].image;
        }
        if (node.name === 'Identifier') {
            return node.image;
        }
        return '';
    }
    extractReceiver(statement) {
        // For a method call, receiver is often in 'primary' or 'expressionName'
        if (statement.children?.primary) {
            return statement.children.primary[0];
        }
        if (statement.children?.expressionName) {
            return statement.children.expressionName[0];
        }
        return null;
    }
    inferReceiverType(receiver) {
        // Simplified: look for Identifier in receiver
        if (!receiver)
            return undefined;
        if (receiver.name === 'Identifier') {
            return receiver.image;
        }
        if (receiver.children?.Identifier) {
            return receiver.children.Identifier[0].image;
        }
        return undefined;
    }
    extractCreatedClassName(creation) {
        // java-parser 2.x: newExpression → unqualifiedClassInstanceCreationExpression → classOrInterfaceTypeToInstantiate
        if (creation?.children?.unqualifiedClassInstanceCreationExpression) {
            const ucie = creation.children.unqualifiedClassInstanceCreationExpression[0];
            const citi = ucie?.children?.classOrInterfaceTypeToInstantiate?.[0];
            if (citi) {
                return this.getIdentifierFromNode(citi) || '';
            }
        }
        // Legacy: objectCreationExpression → createdName
        if (!creation?.children?.createdName)
            return '';
        const createdName = creation.children.createdName[0];
        if (createdName?.children?.Identifier) {
            return createdName.children.Identifier[0].image;
        }
        // Could be qualified name
        return this.getIdentifierFromNode(createdName) || '';
    }
    extractObjectCreations(statement) {
        const creations = [];
        const findCreations = (node) => {
            if (!node)
                return;
            if (node.name === 'newExpression' || node.name === 'objectCreationExpression') {
                const className = this.extractCreatedClassName(node);
                if (className) {
                    creations.push({
                        className,
                        isExternal: false, // Will be determined later
                        lineNumber: node.location?.startLine ?? 0,
                        constructorArgs: []
                    });
                }
            }
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            findCreations(child);
                        }
                    }
                }
            }
        };
        findCreations(statement);
        return creations;
    }
    extractLocalVariables(statement) {
        const locals = [];
        if (!statement)
            return locals;
        if (statement.name === 'localVariableDeclaration') {
            const type = this.getLocalVarType(statement);
            const names = this.getLocalVarNames(statement);
            const loc = this.extractLocation(statement);
            const declaredAtLine = loc?.startLine ?? 0;
            for (let i = 0; i < names.length; i++) {
                locals.push({
                    name: names[i],
                    dataType: type,
                    ...loc,
                    isVarInferred: false,
                    inferredType: undefined,
                    isFinal: false,
                    isEffectivelyFinal: true,
                    initialValue: null,
                    scope: {
                        declaredAtLine,
                        scopeBlock: 'method'
                    },
                    memoryType: 'stack',
                    usedInLambda: false
                });
            }
            return locals;
        }
        // java-parser 2.x: scan the subtree for localVariableDeclaration nodes
        // (e.g. wrapped under localVariableDeclarationStatement).
        const findDecls = (n) => {
            if (!n)
                return;
            if (n.name === 'localVariableDeclaration') {
                const type = this.getLocalVarType(n);
                const names = this.getLocalVarNames(n);
                const loc = this.extractLocation(n);
                const declaredAtLine = loc?.startLine ?? 0;
                for (let i = 0; i < names.length; i++) {
                    locals.push({
                        name: names[i],
                        dataType: type,
                        ...loc,
                        isVarInferred: false,
                        inferredType: undefined,
                        isFinal: false,
                        isEffectivelyFinal: true,
                        initialValue: null,
                        scope: {
                            declaredAtLine,
                            scopeBlock: 'method'
                        },
                        memoryType: 'stack',
                        usedInLambda: false
                    });
                }
                return;
            }
            if (n.children) {
                for (const key of Object.keys(n.children)) {
                    if (Array.isArray(n.children[key])) {
                        for (const c of n.children[key])
                            findDecls(c);
                    }
                }
            }
        };
        findDecls(statement);
        // Check for enhanced for loop
        if (statement.name === 'enhancedForStatement') {
            const loopVar = this.extractEnhancedForVariable(statement);
            if (loopVar) {
                const loc = this.extractLocation(statement);
                const declaredAtLine = loc?.startLine ?? 0;
                locals.push({
                    ...loopVar,
                    ...loc,
                    scope: {
                        declaredAtLine,
                        scopeBlock: 'for-loop'
                    },
                    memoryType: 'stack',
                    usedInLambda: false
                });
            }
        }
        return locals;
    }
    getLocalVarType(statement) {
        if (statement.children?.unannType) {
            return this.extractType(statement.children.unannType[0]);
        }
        // java-parser 2.x wraps the type under localVariableType
        if (statement.children?.localVariableType) {
            const lvt = statement.children.localVariableType[0];
            if (lvt.children?.unannType) {
                return this.extractType(lvt.children.unannType[0]);
            }
        }
        if (statement.children?.varType) {
            return 'var'; // Inferred type
        }
        return 'unknown';
    }
    getLocalVarNames(statement) {
        if (!statement.children?.variableDeclaratorList)
            return [];
        const vdl = statement.children.variableDeclaratorList[0];
        if (!vdl?.children?.variableDeclarator)
            return [];
        return vdl.children.variableDeclarator.map((vd) => {
            return vd.children?.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image || 'unknown';
        });
    }
    extractEnhancedForVariable(statement) {
        if (!statement.children?.formalParameter)
            return null;
        const fp = statement.children.formalParameter[0];
        const type = this.getParameterType(fp);
        const name = this.getParameterName(fp);
        const loc = this.extractLocation(fp);
        const declaredAtLine = loc?.startLine ?? 0;
        return {
            name,
            dataType: type,
            ...loc,
            isVarInferred: false,
            isFinal: true, // Enhanced for loop variable is effectively final
            isEffectivelyFinal: true,
            initialValue: null,
            scope: { declaredAtLine, scopeBlock: 'for-loop' },
            memoryType: 'stack',
            usedInLambda: false
        };
    }
    isCustomType(type) {
        const primitives = ['int', 'long', 'short', 'byte', 'char', 'float', 'double', 'boolean', 'void', 'unknown'];
        const javaTypes = ['String', 'Integer', 'Long', 'Short', 'Byte', 'Character', 'Float', 'Double', 'Boolean',
            'Object', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Collection', 'Enum'];
        // Strip generics to get base type
        const baseType = type.replace(/<.*>/g, '').trim();
        return !primitives.includes(baseType) && !javaTypes.includes(baseType);
    }
    extractInitialValue(vd) {
        if (!vd?.children?.variableInitializer)
            return null;
        const vi = vd.children.variableInitializer[0];
        if (!vi?.children?.expression)
            return null;
        return this.extractExpressionValue(vi.children.expression[0]);
    }
    computeJVMDefault(dataType) {
        const baseType = dataType.replace(/<.*>/g, '').trim();
        switch (baseType) {
            case 'byte':
            case 'short':
            case 'int':
            case 'long':
                return 0;
            case 'float':
            case 'double':
                return 0.0;
            case 'boolean':
                return false;
            case 'char':
                return '\u0000';
            default:
                return null;
        }
    }
    hasGetterMethod(fieldName, className) {
        // Simple heuristic: look for get<FieldName>() method in the current class
        // In a full implementation, would scan the methods array or original source
        return false; // Will be set in postProcessFields
    }
    hasSetterMethod(fieldName, className) {
        // Similar to getter check
        return false;
    }
    generateGetterName(fieldName, accessModifier) {
        if (accessModifier === 'boolean' || fieldName.startsWith('is')) {
            return `is${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`;
        }
        return `get${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`;
    }
    generateSetterName(fieldName, accessModifier) {
        return `set${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`;
    }
    postProcessFields(fields, methods) {
        // Scan methods to detect getters and setters
        for (const field of fields) {
            const potentialGetter = this.generateGetterName(field.name, field.dataType);
            const potentialSetter = this.generateSetterName(field.name, field.dataType);
            for (const m of methods) {
                if (m.name === potentialGetter) {
                    field.encapsulation.hasGetter = true;
                    field.encapsulation.getterName = potentialGetter;
                }
                if (m.name === potentialSetter) {
                    field.encapsulation.hasSetter = true;
                    field.encapsulation.setterName = potentialSetter;
                }
            }
        }
    }
    extractThrowsClause(node) {
        const throwsList = [];
        // Check if method parent has throws
        if (node?.parent?.children?.methodDeclarator) {
            const md = node.parent.children.methodDeclarator[0];
            if (md.children?.throws) {
                const throwsNode = md.children.throws[0];
                if (throwsNode.children?.exceptionTypeList) {
                    const etl = throwsNode.children.exceptionTypeList[0];
                    if (etl.children?.exceptionType) {
                        for (const et of etl.children.exceptionType) {
                            throwsList.push(this.extractExceptionType(et));
                        }
                    }
                }
            }
        }
        return throwsList;
    }
    extractExceptionType(et) {
        if (et.children?.unannClassOrInterfaceType) {
            return this.extractClassName(et.children.unannClassOrInterfaceType[0]);
        }
        if (et.children?.unannType) {
            return this.extractType(et.children.unannType[0]);
        }
        return 'Exception';
    }
    extractChainedConstructorParams(eci) {
        // Extract simplified signature
        if (eci.children?.arguments) {
            const args = eci.children.arguments[0];
            if (args.children?.expressionList) {
                return '...';
            }
        }
        return '';
    }
    extractConstructorBody(node) {
        // Extract constructor body representation
        // Would need source code positions to extract actual code
        return '/* constructor body */';
    }
    determineMemoryLocation(modifiers) {
        if (modifiers.includes('static'))
            return 'method_area';
        return 'heap';
    }
    getSourceFileName(node) {
        // In java-parser, source file info may be available from the parser
        return null;
    }
    extractPackageInfoFromSource(sourceCode) {
        const pkgMatch = sourceCode.match(/^\s*package\s+([\w.]+)\s*;/);
        if (!pkgMatch)
            return null;
        const packageName = pkgMatch[1];
        const parts = packageName.split('.');
        const simpleName = parts[parts.length - 1];
        const parentPackage = parts.length > 1 ? parts.slice(0, parts.length - 1).join('.') : null;
        return {
            name: packageName,
            simpleName,
            parentPackage,
            subPackages: [],
            classes: [],
            interfaces: [],
            enums: [],
            annotations: [],
            isDefaultPackage: false,
            accessibleFrom: 'everywhere'
        };
    }
    getModifiers(node) {
        const modifiers = [];
        if (!node?.children)
            return modifiers;
        const modifierKeys = ['classModifier', 'interfaceModifier', 'enumModifier', 'annotationTypeModifier'];
        for (const key of modifierKeys) {
            if (node.children[key]) {
                for (const mod of node.children[key]) {
                    if (mod.children) {
                        if (mod.children.Public)
                            modifiers.push('public');
                        if (mod.children.Private)
                            modifiers.push('private');
                        if (mod.children.Protected)
                            modifiers.push('protected');
                        if (mod.children.Abstract)
                            modifiers.push('abstract');
                        if (mod.children.Static)
                            modifiers.push('static');
                        if (mod.children.Final)
                            modifiers.push('final');
                        if (mod.children.Strictfp)
                            modifiers.push('strictfp');
                        if (mod.children.Sealed)
                            modifiers.push('sealed');
                        if (mod.children.NonSealed)
                            modifiers.push('non-sealed');
                    }
                }
            }
        }
        return modifiers;
    }
    // ========== Behavioral Dependency Extraction ==========
    extractImports(cst) {
        const imports = [];
        if (!cst)
            return imports;
        const traverse = (node) => {
            if (!node)
                return;
            if (node.name === 'importDeclaration' && node.children) {
                const importInfo = this.parseImportNode(node);
                if (importInfo)
                    imports.push(importInfo);
            }
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            traverse(child);
                        }
                    }
                }
            }
        };
        traverse(cst);
        return imports;
    }
    parseImportNode(node) {
        if (!node?.children)
            return null;
        const loc = this.extractLocation(node);
        const line = loc?.startLine ?? 0;
        // java-parser 2.x CST: importDeclaration has Import, packageOrTypeName, Semicolon
        const packageOrTypeName = node.children.packageOrTypeName?.[0];
        if (!packageOrTypeName)
            return null;
        const name = this.getIdentifierFromNode(packageOrTypeName);
        if (!name)
            return null;
        // Check for wildcard (ends with .*)
        const isStatic = !!node.children.Static;
        const isWildcard = name.endsWith('.*');
        const cleanName = isWildcard ? name : name;
        const simpleName = isWildcard ? '*' : (cleanName.split('.').pop() || cleanName);
        return {
            qualifiedName: cleanName,
            simpleName,
            isStatic,
            isWildcard,
            line,
            ...loc
        };
    }
    getImportName(node) {
        if (!node?.children?.qualifiedName)
            return '';
        const qn = node.children.qualifiedName[0];
        return this.getIdentifierFromNode(qn) || '';
    }
    collectExternalDependencies(cls, imports, ownPackage) {
        const deps = new Set();
        // 1. From field types (excluding primitives and common Java types)
        for (const attr of cls.attributes) {
            if (this.isExternalType(attr.dataType, ownPackage)) {
                deps.add(attr.dataType);
            }
        }
        // 2. From method parameters and return types
        for (const method of cls.methods) {
            if (method.returnType && this.isExternalType(method.returnType, ownPackage)) {
                deps.add(method.returnType);
            }
            for (const param of method.parameters) {
                if (this.isExternalType(param.dataType, ownPackage)) {
                    deps.add(param.dataType);
                }
            }
        }
        // 3. From constructor parameters
        for (const ctor of cls.constructors) {
            for (const param of ctor.parameters) {
                if (this.isExternalType(param.dataType, ownPackage)) {
                    deps.add(param.dataType);
                }
            }
        }
        // 4. From method calls and object creations
        for (const method of cls.methods) {
            for (const call of method.calledMethods) {
                if (call.targetClass && this.isExternalType(call.targetClass, ownPackage)) {
                    deps.add(call.targetClass);
                }
            }
            for (const creation of method.createdObjects) {
                if (this.isExternalType(creation.className, ownPackage)) {
                    deps.add(creation.className);
                }
            }
        }
        // Also from constructors
        for (const ctor of cls.constructors) {
            for (const creation of ctor.createdObjects) {
                if (this.isExternalType(creation.className, ownPackage)) {
                    deps.add(creation.className);
                }
            }
        }
        return Array.from(deps);
    }
    isExternalType(typeName, ownPackage) {
        if (!typeName || typeName === 'void' || typeName === 'null')
            return false;
        // Strip generics
        const baseType = typeName.replace(/<.*>/g, '').trim();
        // Check if it's a primitive
        const primitives = ['int', 'long', 'short', 'byte', 'char', 'float', 'double', 'boolean'];
        if (primitives.includes(baseType))
            return false;
        // Check if it's from java.lang
        if (baseType.startsWith('java.lang.') || baseType === 'String' || baseType === 'Object') {
            return false;
        }
        // Check if it's from standard library (common packages)
        const standardPackages = ['java.util', 'java.io', 'java.net', 'java.sql', 'javax.', 'jakarta.'];
        const isStandard = standardPackages.some(p => baseType.startsWith(p));
        if (isStandard) {
            return true;
        }
        // If type has a dot and isn't in own package, it's external
        if (baseType.includes('.')) {
            const pkgPart = baseType.split('.').slice(0, -1).join('.');
            return pkgPart !== ownPackage;
        }
        // Simple name (no package) - assume internal for now
        return false;
    }
    buildMethodCallGraph(cls) {
        const graph = {};
        for (const method of cls.methods) {
            graph[method.name] = method.calledMethods;
        }
        for (const ctor of cls.constructors) {
            graph[ctor.name] = ctor.calledMethods;
        }
        return graph;
    }
    classifyClass(cls) {
        const annotationNames = cls.annotations.map(a => a.name);
        const stereotypes = [...annotationNames];
        let layer = 'unknown';
        let annotationScore = 0;
        let namingScore = 0;
        let packageScore = 0;
        // Annotation-based layer detection (Spring/Java EE conventions)
        if (annotationNames.includes('Service') || annotationNames.includes('Component')) {
            layer = 'service';
            annotationScore = 1.0;
        }
        else if (annotationNames.includes('Repository') || annotationNames.includes('Dao') || annotationNames.includes('DAO')) {
            layer = 'repository';
            annotationScore = 1.0;
        }
        else if (annotationNames.includes('Controller') || annotationNames.includes('RestController')) {
            layer = 'controller';
            annotationScore = 1.0;
        }
        else if (annotationNames.includes('Entity') || annotationNames.includes('Embeddable')) {
            layer = 'entity';
            annotationScore = 1.0;
        }
        else if (annotationNames.includes('Configuration') || annotationNames.includes('ConfigurationProperties')) {
            layer = 'config';
            annotationScore = 1.0;
        }
        else if (annotationNames.includes('Aspect')) {
            layer = 'aspect';
            annotationScore = 1.0;
        }
        else if (annotationNames.includes('View')) {
            layer = 'view';
            annotationScore = 0.9;
        }
        // Naming-based scoring
        if (layer === 'unknown' || namingScore === 0) {
            const name = cls.className;
            let namingLayer = null;
            if (name.endsWith('Service') || name.endsWith('Handler') || name.endsWith('Manager') || name.endsWith('Facade')) {
                namingLayer = 'service';
                namingScore = 0.8;
            }
            else if (name.endsWith('Repository') || name.endsWith('Dao') || name.endsWith('DAO') || name.endsWith('Persistence')) {
                namingLayer = 'repository';
                namingScore = 0.8;
            }
            else if (name.endsWith('Controller') || name.endsWith('RestController') || name.endsWith('Resource') || name.endsWith('Endpoint')) {
                namingLayer = 'controller';
                namingScore = 0.8;
            }
            else if (name.endsWith('Entity') || name.endsWith('Model') || name.endsWith('POJO')) {
                namingLayer = 'entity';
                namingScore = 0.7;
            }
            else if (name.endsWith('Dto') || name.endsWith('DTO') || name.endsWith('VO') || name.endsWith('Request') || name.endsWith('Response')) {
                namingLayer = 'dto';
                namingScore = 0.8;
            }
            else if (name.endsWith('Config') || name.endsWith('Configuration') || name.endsWith('Properties')) {
                namingLayer = 'config';
                namingScore = 0.8;
            }
            else if (name.endsWith('Util') || name.endsWith('Helper') || name.endsWith('Utils')) {
                namingLayer = 'utility';
                namingScore = 0.7;
            }
            else if (name.endsWith('View') || name.endsWith('Panel') || name.endsWith('Form') || name.endsWith('Dialog')) {
                namingLayer = 'view';
                namingScore = 0.7;
            }
            if (namingLayer && layer === 'unknown') {
                layer = namingLayer;
            }
        }
        // Package-based scoring
        if (cls.fullyQualifiedName) {
            const parts = cls.fullyQualifiedName.toLowerCase().split('.');
            let pkgLayer = null;
            if (parts.includes('controller') || parts.includes('controllers') || parts.includes('api') || parts.includes('resource') || parts.includes('resources')) {
                pkgLayer = 'controller';
                packageScore = 0.7;
            }
            else if (parts.includes('service') || parts.includes('services')) {
                pkgLayer = 'service';
                packageScore = 0.7;
            }
            else if (parts.includes('repository') || parts.includes('repositories') || parts.includes('dao') || parts.includes('db')) {
                pkgLayer = 'repository';
                packageScore = 0.7;
            }
            else if (parts.includes('entity') || parts.includes('entities') || parts.includes('model') || parts.includes('models') || parts.includes('domain')) {
                pkgLayer = 'entity';
                packageScore = 0.7;
            }
            else if (parts.includes('dto') || parts.includes('dtos') || parts.includes('request') || parts.includes('response')) {
                pkgLayer = 'dto';
                packageScore = 0.7;
            }
            else if (parts.includes('config') || parts.includes('configs') || parts.includes('configuration')) {
                pkgLayer = 'config';
                packageScore = 0.7;
            }
            else if (parts.includes('util') || parts.includes('utils') || parts.includes('helper') || parts.includes('helpers')) {
                pkgLayer = 'utility';
                packageScore = 0.6;
            }
            else if (parts.includes('aspect') || parts.includes('aspects')) {
                pkgLayer = 'aspect';
                packageScore = 0.7;
            }
            else if (parts.includes('view') || parts.includes('views') || parts.includes('ui') || parts.includes('gui')) {
                pkgLayer = 'view';
                packageScore = 0.7;
            }
            if (pkgLayer && layer === 'unknown') {
                layer = pkgLayer;
            }
        }
        // Compute confidence: highest single score, but if annotation matches, max confidence
        let confidenceScore = 0;
        if (annotationScore > 0) {
            confidenceScore = annotationScore;
        }
        else if (namingScore > 0 && packageScore > 0) {
            confidenceScore = Math.max(namingScore, packageScore) * 0.85;
        }
        else if (namingScore > 0) {
            confidenceScore = namingScore * 0.7;
        }
        else if (packageScore > 0) {
            confidenceScore = packageScore * 0.6;
        }
        const violationsDetected = [];
        // Simple cross-layer violations
        if (layer === 'controller' && cls.methods.some(m => m.calledMethods.some(c => c.targetClass && (c.targetClass.includes('Repository') || c.targetClass.includes('Dao'))))) {
            violationsDetected.push('Controller directly calls Repository/Dao - should go through Service');
        }
        if (layer === 'entity' && cls.methods.some(m => m.returnType.includes('Service') || m.returnType.includes('Controller'))) {
            violationsDetected.push('Entity depends on Service/Controller layer');
        }
        cls.detectedLayer = layer;
        cls.stereotypes = stereotypes;
        cls.layerClassification = {
            finalAssignedLayer: layer || 'unknown',
            confidenceScore: Math.round(confidenceScore * 100) / 100,
            heuristicsMatched: {
                annotationScore,
                namingScore,
                packageScore
            },
            violationsDetected
        };
    }
    extractLocation(nodeOrToken) {
        if (!nodeOrToken)
            return undefined;
        if (nodeOrToken.location) {
            return {
                startLine: nodeOrToken.location.startLine ?? undefined,
                startColumn: nodeOrToken.location.startColumn ?? undefined,
                endLine: nodeOrToken.location.endLine ?? undefined,
                endColumn: nodeOrToken.location.endColumn ?? undefined
            };
        }
        if (typeof nodeOrToken.startLine === 'number') {
            return {
                startLine: nodeOrToken.startLine ?? undefined,
                startColumn: nodeOrToken.startColumn ?? undefined,
                endLine: nodeOrToken.endLine ?? undefined,
                endColumn: nodeOrToken.endColumn ?? undefined
            };
        }
        return undefined;
    }
    extractComplexityMetrics(methodBody) {
        const metrics = {
            cyclomaticComplexity: 1,
            maxNestingDepth: 0,
            decisionPoints: []
        };
        if (!methodBody)
            return metrics;
        let currentDepth = 0;
        const getLine = (node) => {
            const loc = this.extractLocation(node);
            return loc?.startLine ?? 0;
        };
        const getConditionText = (node) => {
            if (!node?.children)
                return '';
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        if (child.image)
                            return child.image;
                        const text = this.extractSimpleName(child);
                        if (text)
                            return text;
                    }
                }
            }
            return '';
        };
        const traverse = (node, depth) => {
            if (!node)
                return;
            currentDepth = Math.max(currentDepth, depth);
            if (node.name === 'ifStatement') {
                metrics.cyclomaticComplexity++;
                const cond = this.extractConditionText(node);
                metrics.decisionPoints.push({
                    type: 'if', line: getLine(node), condition: cond, nestingDepth: depth
                });
                traverse(node.children?.statement?.[0], depth + 1);
                const elseStmt = node.children?.elseStatement?.[0];
                if (elseStmt) {
                    metrics.cyclomaticComplexity++;
                    metrics.decisionPoints.push({
                        type: 'else-if', line: getLine(elseStmt), condition: '', nestingDepth: depth
                    });
                    traverse(elseStmt, depth + 1);
                }
                return;
            }
            if (node.name === 'whileStatement') {
                metrics.cyclomaticComplexity++;
                metrics.decisionPoints.push({
                    type: 'while', line: getLine(node), condition: getConditionText(node), nestingDepth: depth
                });
                traverse(node.children?.statement?.[0], depth + 1);
                return;
            }
            if (node.name === 'basicForStatement' || node.name === 'enhancedForStatement') {
                metrics.cyclomaticComplexity++;
                metrics.decisionPoints.push({
                    type: 'for', line: getLine(node), nestingDepth: depth
                });
                const body = node.children?.statement?.[0];
                if (body)
                    traverse(body, depth + 1);
                return;
            }
            if (node.name === 'doStatement') {
                metrics.cyclomaticComplexity++;
                metrics.decisionPoints.push({
                    type: 'do-while', line: getLine(node), nestingDepth: depth
                });
                return;
            }
            if (node.name === 'switchStatement' || node.name === 'switchBlock') {
                metrics.decisionPoints.push({
                    type: 'switch', line: getLine(node), nestingDepth: depth
                });
                const groups = node.children?.switchGroup || [];
                for (const sg of groups) {
                    const labels = sg.children?.switchLabel || [];
                    for (const sl of labels) {
                        metrics.cyclomaticComplexity++;
                        metrics.decisionPoints.push({
                            type: 'case', line: getLine(sl), nestingDepth: depth + 1
                        });
                    }
                }
                return;
            }
            if (node.name === 'catchClause') {
                metrics.cyclomaticComplexity++;
                metrics.decisionPoints.push({
                    type: 'catch', line: getLine(node), condition: getConditionText(node), nestingDepth: depth
                });
                return;
            }
            if (node.name === 'ternaryExpression' || (node.children?.Question)) {
                metrics.cyclomaticComplexity++;
                metrics.decisionPoints.push({
                    type: 'ternary', line: getLine(node), nestingDepth: depth
                });
            }
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            if (child.image === '&&' || child.image === '||') {
                                metrics.cyclomaticComplexity++;
                                metrics.decisionPoints.push({
                                    type: child.image === '&&' ? 'conditional-and' : 'conditional-or',
                                    line: getLine(child),
                                    nestingDepth: depth
                                });
                            }
                            traverse(child, child.name === 'ifStatement' || child.name === 'whileStatement' || child.name === 'forStatement' ? depth : depth);
                        }
                    }
                }
            }
        };
        traverse(methodBody, 0);
        metrics.maxNestingDepth = currentDepth;
        return metrics;
    }
    extractConditionText(node) {
        if (!node?.children)
            return '';
        const paren = node.children.LParen?.[0] || node.children.LBrace?.[0];
        if (!paren)
            return '';
        // Walk siblings after LParen to capture condition
        const parts = [];
        const collect = (n) => {
            if (!n || n.name === 'RParen')
                return;
            if (n.image)
                parts.push(n.image);
            if (n.children) {
                for (const key of Object.keys(n.children)) {
                    if (Array.isArray(n.children[key])) {
                        for (const c of n.children[key])
                            collect(c);
                    }
                }
            }
        };
        // Traverse parent children after LParen
        const parentChildren = node.children;
        let capture = false;
        for (const key of Object.keys(parentChildren)) {
            if (Array.isArray(parentChildren[key])) {
                for (const c of parentChildren[key]) {
                    if (c === paren) {
                        capture = true;
                        continue;
                    }
                    if (capture && c.name === 'RParen') {
                        capture = false;
                        break;
                    }
                    if (capture)
                        collect(c);
                }
            }
        }
        return parts.join(' ').substring(0, 120);
    }
    calculateBusinessLogicScore(bodyText, linesOfCode, complexity) {
        let score = 0;
        const patterns = [
            /if\s*\(/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /switch\s*\(/g,
            /\|\|/g,
            /&&/g,
            /==/g,
            /!=/g,
            /<=?/g,
            />=?/g,
            /\+\+/g,
            /--/g,
            /\+=/g,
            /-=/g,
            /\*=/g,
            /\/=/g,
            /%=/g,
            /new\s+java\.sql\./g,
            /EntityManager/g,
            /CriteriaQuery/g,
            /Query\s*\(/g,
            /prepareStatement/g,
            /executeQuery/g,
            /executeUpdate/g
        ];
        for (const pattern of patterns) {
            const matches = bodyText.match(pattern);
            if (matches) {
                score += matches.length;
            }
        }
        if (linesOfCode > 10)
            score += 1;
        if (linesOfCode > 20)
            score += 2;
        if (complexity > 3)
            score += 2;
        return score;
    }
    extractAccessedFields(bodyNode, fieldNames) {
        const accessed = new Set();
        if (!bodyNode)
            return [];
        const traverse = (node) => {
            if (!node)
                return;
            if (node.name === 'primary') {
                const prefix = node.children?.primaryPrefix?.[0];
                const suffixes = node.children?.primarySuffix || [];
                if (prefix?.children?.This) {
                    for (const suffix of suffixes) {
                        if (suffix.children?.Identifier) {
                            const id = suffix.children.Identifier[0].image;
                            if (id)
                                accessed.add(id);
                        }
                    }
                }
            }
            if (node.name === 'Identifier' || node.image) {
                const name = node.image;
                if (name && fieldNames.has(name)) {
                    accessed.add(name);
                }
            }
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            traverse(child);
                        }
                    }
                }
            }
        };
        traverse(bodyNode);
        return Array.from(accessed);
    }
}
exports.JavaParser = JavaParser;
//# sourceMappingURL=javaParser.js.map