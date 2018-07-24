/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 16/06/2018
 */
import {
    AbstractArrayDeclarator,
    AbstractDeclarator, AbstractFunctionDeclarator, AbstractPointerDeclarator,
    ArrayDeclarator,
    AssignmentExpression,
    Declaration,
    Declarator,
    EnumSpecifier,
    FunctionDeclarator,
    Identifier,
    IdentifierDeclarator,
    InitializerList,
    Node,
    ParameterList,
    Pointer,
    PointerDeclarator,
    SpecifierType,
    StructOrUnionSpecifier,
    TranslationUnit,
    TypedefName,
} from "../common/ast";
import {assertType, InternalError, LanguageError, SyntaxError} from "../common/error";
import {
    AddressType,
    ArrayType,
    ClassType,
    FunctionType,
    IntegerType, LeftReferenceType, PointerType,
    PrimitiveTypes, ReferenceType, Type, Variable,
} from "../common/type";
import {FunctionEntity} from "../common/type";
import {getPrimitiveTypeFromSpecifiers, isTypeQualifier, isTypeSpecifier} from "../common/utils";
import {WConst, WType} from "../wasm";
import {WExpression} from "../wasm/node";
import {WFunctionType} from "../wasm/section";
import {KeyWords} from "./constant";
import {CompileContext} from "./context";
import {doFunctionOverloadResolution} from "./cpp/overload";
import {declareFunction} from "./function";
import {FunctionLookUpResult} from "./scope";
import {recycleExpressionResult} from "./statement";

export function parseTypeFromSpecifiers(ctx: CompileContext, specifiers: SpecifierType[], nodeForError: Node): Type {
    let resultType: Type | null = null;
    const typeNodes = specifiers.filter((x) => typeof(x) !== "string");
    const stringNodes = specifiers.filter((x) => typeof(x) === "string") as string[];
    if (typeNodes.length !== 0) {
        if ( typeNodes.length !== 1) {
            throw new SyntaxError(`illegal syntax`, nodeForError);
        }
        const node = typeNodes[0];
        if ( node instanceof StructOrUnionSpecifier) {
            resultType = node.codegen(ctx) as Type;
        } else if ( node instanceof TypedefName) {
            resultType = node.codegen(ctx) as Type;
        } else if ( node instanceof EnumSpecifier) {
            resultType = node.codegen(ctx) as Type;
        } else {
            throw new InternalError(`unsupport type`);
        }
        // complex types
        // TODO::
    } else {
        // primitive types
        const typeNames = stringNodes.filter(isTypeSpecifier).sort();
        resultType = getPrimitiveTypeFromSpecifiers(typeNames);
    }
    if (resultType == null) {
        throw new SyntaxError("Illegal Return Type", nodeForError);
    }
    if (stringNodes.indexOf("const") !== -1) {
        resultType.isConst = true;
    }
    if (stringNodes.indexOf("extern") !== -1) {
        resultType.isExtern = true;
    }
    if (stringNodes.indexOf("static") !== -1) {
        resultType.isStatic = true;
    }
    return resultType;
}

export function parseDeclarator(ctx: CompileContext, node: Declarator, resultType: Type): [Type, string] {
    if (node === null) {
        return [resultType, ""];
    } else if (node instanceof IdentifierDeclarator) {
        if (KeyWords.includes(node.identifier.name)) {
            throw new SyntaxError(`variable name could not be '${node.identifier.name}'`, node);
        }
        return [resultType, node.identifier.name];
    } else if (node.declarator != null) {
        const newResultType = mergeTypeWithDeclarator(ctx, resultType, node);
        return parseDeclarator(ctx, node.declarator, newResultType);
    } else {
        throw new SyntaxError("UnsupportNodeType:" + node.constructor.name, node);
    }
}

export function mergeTypeWithDeclarator(ctx: CompileContext, type: Type,
                                        declarator: Declarator | AbstractDeclarator): Type {
    if (declarator instanceof FunctionDeclarator || declarator instanceof AbstractFunctionDeclarator) {
        assertType(declarator.parameters, ParameterList);
        const [parameterTypes, parameterNames, variableArguments]
            = (declarator.parameters as ParameterList).codegen(ctx);
        return new FunctionType("", type, parameterTypes, parameterNames, variableArguments);
    } else if (declarator instanceof PointerDeclarator || declarator instanceof AbstractPointerDeclarator) {
        let pointer = declarator.pointer as Pointer | null;
        let result = type;
        while (pointer != null) {
            if ( result instanceof ReferenceType) {
                throw new SyntaxError(`there is no pointer/reference of reference`, declarator);
            }
            if ( pointer.type === "*" ) {
                result = new PointerType(result);
            } else if ( pointer.type === "&" ) {
                if ( !ctx.isCpp() ) {
                    throw new LanguageError(`reference is only supported in c++`, declarator);
                }
                result = new LeftReferenceType(result);
            } else if ( pointer.type === "&&" ) {
                throw new SyntaxError(`unsupport right value reference`, declarator);
            }
            pointer = pointer.pointer;
        }
        return result;
    } else if (declarator instanceof ArrayDeclarator || declarator instanceof AbstractArrayDeclarator) {
        if ( type instanceof ReferenceType) {
            throw new SyntaxError(`there is no array of reference`, declarator);
        }
        const length = declarator.length.codegen(ctx);
        if (!(length.expr instanceof WExpression)) {
            throw new SyntaxError("illegal length type", declarator);
        }
        length.expr = length.expr.fold();
        if (!(length.expr instanceof WConst)) {
            throw new SyntaxError("var length array is not support currently", declarator);
        }
        if (!(length.type instanceof IntegerType)) {
            throw new SyntaxError("length of array must be integer", declarator);
        }
        if (declarator.qualifiers.length !== 0) {
            ctx.raiseWarning("unsupport array qualifier");
        }
        return new ArrayType(type, parseInt(length.expr.constant));
    } else {
        throw new SyntaxError("UnsupportDeclaratorType:" + declarator.constructor.name,
            declarator);
    }
}

TranslationUnit.prototype.codegen = function(ctx: CompileContext) {
    this.body.map((item) => item.codegen(ctx));
};

export function lookupPreviousDeclaration(ctx: CompileContext, type: Type, name: string, node: Node)
    : Variable | "pass" | "none" {
    const oldItem = ctx.scopeManager.lookupFullName(ctx.scopeManager.getFullName(name));
    let lastItem: Variable | "none" = "none";
    if ( oldItem !== null ) {
        if ( oldItem instanceof FunctionLookUpResult ) {
            if ( !(type instanceof FunctionType)) {
                throw new SyntaxError(`conflict declaration of ${name}`, node);
            }
            const t0 = oldItem.functions.filter((func) =>
                func.type.parameterTypes.length === type.parameterTypes.length)
                .filter((func) => func.type.parameterTypes.every(
                    (x, i) => x.equals(type.parameterTypes[i]),
                ));
            if ( t0.length !== 0 ) {
                return "pass";
            }
        } else if ( oldItem instanceof Type ) {
            throw new SyntaxError(`redefine of typename ${name}`, node);
        } else {
            if (oldItem.isDefine() && !type.isExtern) {
                throw new SyntaxError(`redefine of variable ${name}`, node);
            } else if (oldItem.isDefine() && type.isExtern) {
                return "pass";
            } else if (!oldItem.isDefine() && type.isExtern) {
                return "pass";
            } else {
                lastItem = oldItem;
            }
        }
    }
    return lastItem;
}

Declaration.prototype.codegen = function(ctx: CompileContext) {
    const baseType = parseTypeFromSpecifiers(ctx, this.specifiers, this);
    const isTypedef = this.specifiers.includes("typedef");
    for (const declarator of this.initDeclarators) {
        const [type, name] = parseDeclarator(ctx, declarator.declarator, baseType);
        if ( type instanceof ClassType && !type.isComplete) {
            throw new SyntaxError(`cannot instancelize incomplete type`, this);
        }
        if (name.charAt(0) === "#") {
            throw new SyntaxError(`illegal operator name`, this);
        }

        // oldItemLookup
        const lastItem = lookupPreviousDeclaration(ctx, type, name, this);

        if ( lastItem === "pass" ) {
            continue;
        }

        // typedef
        if ( isTypedef ) {
            if ( lastItem !== null ) {
                throw new SyntaxError(`confliction of typename ${name}`, this);
            }
            ctx.scopeManager.declare(name, type, this);
            continue;
        }

        // function
        if ( type instanceof FunctionType ) {
            declareFunction(ctx, type, name, this.specifiers.includes("__libcall"), this);
            continue;
        }

        // variable
        let storageType = AddressType.STACK;
        let location: number | string = 0;
        if (ctx.scopeManager.isRoot() || type.isStatic || name.includes("::")) {
            if (type.isExtern) {
                storageType = AddressType.MEMORY_EXTERN;
                location = ctx.scopeManager.getFullName(name);
            } else if (declarator.initializer !== null) {
                storageType = AddressType.MEMORY_DATA;
                location = ctx.memory.allocData(type.length);
            } else {
                storageType = AddressType.MEMORY_BSS;
                location = ctx.memory.allocBss(type.length);
            }
        } else {
            if (type.isExtern) {
                throw new SyntaxError("local variable could not be extern:  " + name, this);
            }
            // TODO:: support static function variable;
            storageType = AddressType.STACK;
            location = ctx.memory.allocStack(type.length);
        }

        if ( lastItem !== "none") {
            lastItem.addressType = storageType;
            lastItem.location = location;
        } else if ( type.isExtern ) {
            ctx.scopeManager.declare(name, new Variable(
                name, ctx.scopeManager.getFullName(name), ctx.fileName,
                type, storageType, location,
            ), this);
        } else {
            ctx.scopeManager.define(name, new Variable(
                name, ctx.scopeManager.getFullName(name), ctx.fileName,
                type, storageType, location,
            ), this);
        }

        if (declarator.initializer != null) {
            if ( declarator.initializer instanceof InitializerList ) {
                throw new InternalError("InitializerList not support");
            }
            const expr = new AssignmentExpression(this.location, "=",
                new Identifier(this.location, name),
                declarator.initializer);
            expr.isInitExpr = true;
            recycleExpressionResult(ctx, this, expr.codegen(ctx));
        }
    }
};

export function parseAbstractDeclarator(ctx: CompileContext, node: AbstractDeclarator, resultType: Type): Type {
    if (node.declarator === null) {
        return mergeTypeWithDeclarator(ctx, resultType, node);
    } else {
        const newResultType = mergeTypeWithDeclarator(ctx, resultType, node);
        return parseAbstractDeclarator(ctx, node.declarator, newResultType);
    }
}

TypedefName.prototype.codegen = function(ctx: CompileContext) {
    const item = this.identifier.name.slice(0, 2) === "::" ?
        ctx.scopeManager.lookupFullName(this.identifier.name) :
        ctx.scopeManager.lookupShortName(this.identifier.name);
    if ( item && item instanceof Type) {
        return item;
    }
    throw new SyntaxError(`${this.identifier.name} is not a type`, this);
};

EnumSpecifier.prototype.codegen = function(ctx: CompileContext) {
    if ( this.enumerators != null ) {
        let now = -1, val = 0;
        for (const enumerator of this.enumerators) {
            now ++;
            if (enumerator.value === null) {
                val = now;
            } else {
                const expr = enumerator.value.codegen(ctx);
                if (!(expr.expr instanceof WExpression)) {
                    throw new SyntaxError("illegal enumrator type", this);
                }
                expr.expr = expr.expr.fold();
                if ( !(expr.expr instanceof WConst) ||
                    !(expr.type instanceof IntegerType) ) {
                    throw new SyntaxError(`enum value must be integer`, this);
                }
                val = parseInt(expr.expr.constant);
            }
            ctx.scopeManager.declare(enumerator.identifier.name, new Variable(
                enumerator.identifier.name, ctx.scopeManager.getFullName(enumerator.identifier.name),
                ctx.fileName, PrimitiveTypes.int32,
                AddressType.CONSTANT, val,
            ), this);
        }
    }
    if ( this.identifier != null ) {
        ctx.scopeManager.declare(this.identifier.name, PrimitiveTypes.int32, this);
    }
    return PrimitiveTypes.int32;
};

export function declaration() {
    return;
}
