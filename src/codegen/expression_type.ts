import {
    AssignmentExpression, BinaryExpression, CallExpression,
    FloatingConstant,
    Identifier,
    IntegerConstant,
    ParenthesisExpression, UnaryExpression
} from "../common/ast";
import {CompileContext} from "./context";
import {
    ArithmeticType,
    FloatType,
    FunctionType, Int64Type,
    IntegerType,
    LeftReferenceType,
    PointerType,
    PrimitiveTypes,
    Type, UnsignedInt64Type, UnsignedIntegerType
} from "../common/type";
import {InternalError, TypeError} from "../common/error";

/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 23/06/2018
 */

ParenthesisExpression.prototype.deduceType = function(ctx: CompileContext): Type{
    return this.expression.deduceType(ctx);
};

AssignmentExpression.prototype.deduceType = function(ctx: CompileContext): Type{
    return this.left.deduceType(ctx);
};

IntegerConstant.prototype.deduceType = function(ctx: CompileContext): Type{
    return this.codegen(ctx).type;
};

FloatingConstant.prototype.deduceType = function(ctx: CompileContext): Type{
    return this.codegen(ctx).type;
};

Identifier.prototype.deduceType = function(ctx: CompileContext): Type{
    return this.codegen(ctx).type;
};

BinaryExpression.prototype.deduceType = function(ctx: CompileContext): Type{
    const left = this.left.deduceType(ctx);
    const right = this.right.deduceType(ctx);
    if("+-*%/".indexOf(this.operator) != -1){
        if (left instanceof ArithmeticType && right instanceof ArithmeticType) {
            if(left instanceof FloatType || right instanceof FloatType) return PrimitiveTypes.double;
            if(left instanceof Int64Type || right instanceof Int64Type)return PrimitiveTypes.int64;
            if(left instanceof UnsignedInt64Type || right instanceof UnsignedInt64Type)return PrimitiveTypes.uint64;
            if(left instanceof UnsignedIntegerType && right instanceof UnsignedIntegerType)return PrimitiveTypes.uint32;
            return PrimitiveTypes.int32;
        }
        else if( left instanceof PointerType || right instanceof PointerType){
            if(left instanceof PointerType && right instanceof PointerType)
                throw new TypeError(`could not apply ope on two pointer`, this);
            if(left instanceof PointerType){
                if(!(right instanceof IntegerType))throw new TypeError(`could not apply ${right.toString()} to pointer`, this);
                return right;
            }
            else if(right instanceof PointerType){
                if(!(left instanceof IntegerType))throw new TypeError(`could not apply ${left.toString()} to pointer`, this);
                if(this.operator == "-") throw new TypeError(`could - a pointer`, this);
                return left;
            }
            else {
                new TypeError(`bad operator on pointer`, this);
            }
        }
        else{
            new TypeError(`could not apply ${this.operator} on ${left.toString()} and ${right.toString()}`, this);
        }
    }
    throw new InternalError(`no impl at BinaryExpression()`);
    // TODO:: veryhard;
};

UnaryExpression.prototype.deduceType = function(ctx: CompileContext): Type{
    const itemType = this.operand.deduceType(ctx);
    if( this.operator === "*" ){
        if( itemType instanceof PointerType ) return itemType.elementType;
        else if( itemType instanceof LeftReferenceType
        && itemType.elementType instanceof PointerType) return itemType.elementType.elementType;
        else throw new TypeError(`could not apply * on ${itemType.toString()}`, this);
    }
    else if( this.operator === "&"){
        return new PointerType(itemType);
    }
    else throw new InternalError(`no imple at UnaryExpression().deduce`);
};

CallExpression.prototype.deduceType = function(ctx: CompileContext): Type {
    const calleeType = this.callee.deduceType(ctx);
    if(!(calleeType instanceof FunctionType)){
        throw new TypeError(`the callee is not function`, this);
    }
    return calleeType.returnType;
};

export function expression_type(){
    const a = 1;
    return "";
}