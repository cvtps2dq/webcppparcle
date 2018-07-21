/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 14/07/2018
 */
import {ExpressionResult, Node} from "../common/ast";
import {InternalError, SyntaxError, TypeError} from "../common/error";
import {
    AddressType,
    ArithmeticType,
    ArrayType, FloatingType, FloatType,
    IntegerType, LeftReferenceType,
    PointerType, PrimitiveTypes,
    Type,
} from "../common/type";
import {getTypeConvertOpe, WType} from "../wasm/constant";
import {WConst, WCovertOperation} from "../wasm/expression";
import {WExpression} from "../wasm/node";
import {WAddressHolder} from "./address";
import {CompileContext} from "./context";
import {FunctionLookUpResult} from "./scope";

export function doTypeTransfrom(type: Type): Type {
    // array to pointer transform
    if (type instanceof ArrayType) {
        type = new PointerType(type.elementType);
    }

    // func to pointer transform
    // TODO::

    return type;
}

export function doValueTransform(ctx: CompileContext, expr: ExpressionResult,
                                 node: Node, toReference = false): ExpressionResult {

    if ( !expr.isLeft && expr.type instanceof LeftReferenceType) {
        throw new InternalError(`LeftReferenceType could not be rvalue`);
    }

    // left value transform
    if (expr.isLeft) {
        expr.isLeft = false;
        if ( expr.expr instanceof FunctionLookUpResult) {
            throw new SyntaxError(`unsupport function name`, node);
        }

        if ( !(expr.expr instanceof WAddressHolder)) {
            throw new InternalError(`if( !(expr.expr instanceof WAddressHolder)) {`);
        }

        if ( expr.type instanceof ArrayType ) {
            if ( toReference ) {
                throw new SyntaxError(`no reference to array`, node);
            }
            expr.type = new PointerType(expr.type.elementType);
            expr.expr = expr.expr.createLoadAddress(ctx);
        } else if ( expr.type instanceof LeftReferenceType) {
            if ( toReference ) {
                expr.expr = expr.expr.createLoad(ctx, PrimitiveTypes.uint32);
            } else {
                expr.type = expr.type.elementType;
                expr.expr = new WAddressHolder(expr.expr.createLoad(ctx, PrimitiveTypes.uint32),
                    AddressType.RVALUE, node.location).createLoad(ctx, expr.type);
            }
        } else {
            if ( toReference ) {
                expr.type = new LeftReferenceType(expr.type);
                expr.expr = expr.expr.createLoadAddress(ctx);
            } else {
                expr.expr = expr.expr.createLoad(ctx, expr.type);
            }
        }
    }

    // array to pointer transform
    if (expr.type instanceof ArrayType) {
        expr.type = new PointerType(expr.type.elementType);
    }

    // func to pointer transform
    // TODO::

    return expr;
}

export function doConversion(ctx: CompileContext, dstType: Type, src: ExpressionResult,
                             node: Node, force: boolean = false): WExpression {

    src = doValueTransform(ctx, src, node, dstType instanceof LeftReferenceType);

    if ( src.expr instanceof FunctionLookUpResult) {
        throw new SyntaxError(`unsupport function name`, node);
    }

    if ( dstType instanceof LeftReferenceType && src.type instanceof LeftReferenceType) {
        if( dstType.equals(src.type)){
            return src.expr;
        }
    }

    // arithmetic conversion
    if (dstType instanceof ArithmeticType && src.type instanceof ArithmeticType) {
        const srcWType = src.type.toWType();
        const dstWType = dstType.toWType();
        const ope = getTypeConvertOpe(srcWType, dstWType);
        if ( ope !== null ) {
            return new WCovertOperation(srcWType, dstWType, src.expr, ope, src.expr.location);
        } else {
            return src.expr;
        }
    }

    // pointer conversion

    if (dstType instanceof PointerType && src.type instanceof PointerType) {
        const dstElem = dstType.elementType;
        const srcElem = src.type.elementType;
        if ( dstElem.equals(PrimitiveTypes.void) || srcElem.equals(dstElem)) {
            return src.expr;
        }
    }

    // 0 to pointer

    if (dstType instanceof PointerType && src.type instanceof IntegerType) {
        src.expr = src.expr.fold();
        if ( src.expr instanceof WConst && parseInt(src.expr.constant) === 0) {
            return src.expr;
        }
    }

    if (force) {
        // [Force] Integer to Pointer
        if ((dstType instanceof PointerType || dstType instanceof IntegerType)
            && (src.type instanceof PointerType || src.type instanceof IntegerType)) {
            return src.expr;
        }

        // any pointer to any pointer
        if (dstType instanceof PointerType && src.type instanceof PointerType) {
            return src.expr;
        }
    }

    throw new TypeError(`unsupport convert from ${src.type} to ${dstType}`, node);
}

export function getInStackSize(size: number): number {
    if ( size % 4 === 0) { return size; }
    return size + 4 - (size % 4);
}

export function doValuePromote(ctx: CompileContext, src: ExpressionResult, node: Node): ExpressionResult {
    src = doValueTransform(ctx, src, node);
    if ( src.type instanceof IntegerType && src.type.length < 4 ) {
        src.type = PrimitiveTypes.int32;
    }
    if ( src.type instanceof FloatType ) {
        src.expr = doConversion(ctx, PrimitiveTypes.double, src, node);
        src.type = PrimitiveTypes.double;
    }
    return src;
}
