import {WType} from "../wasm";
import {InternalError, TypeError} from "./error";
import {isArrayEqual} from "./utils";

const MACHINE_POINTER_LENGTH = 4;

export abstract class Symbol {
    public abstract isDefine(): boolean;
    public abstract getType(): Type;
}

export abstract class Type extends Symbol {

    public isExtern: boolean;
    public isStatic: boolean;
    public isConst: boolean;

    constructor() {
        super();
        this.isExtern = false;
        this.isStatic = false;
        this.isConst = false;
    }

    public equals(type: Type) {
        return this.constructor === type.constructor;
    }

    public abstract toWType(): WType;
    public abstract toString(): string;
    public abstract get length(): number;
    public abstract toMangledName(): string;

    public isDefine() {
        return false;
    }

    public getType(): Type {
        return this;
    }
}

export abstract class CompoundType extends Type {
    public elementType: Type;

    constructor(elementType: Type) {
        super();
        this.elementType = elementType;
    }

    get length() {
        return MACHINE_POINTER_LENGTH;
    }

    public equals(type: Type): boolean {
        return super.equals(type) &&
            type instanceof CompoundType &&
            this.elementType.equals(type.elementType);
    }
}

export class PointerType extends CompoundType {
    public toString() {
        return this.elementType.toString() + "*";
    }

    public toWType() {
        return WType.u32;
    }

    public toMangledName(): string {
        return "P" + this.elementType.toMangledName();
    }
}

export abstract class ReferenceType extends CompoundType {

    constructor(elementType: Type) {
        super(elementType);
        if (elementType instanceof ReferenceType) {
            throw new InternalError(`ref to ref is illegal`);
        }
    }
}

export class LeftReferenceType extends ReferenceType {
    public toString() {
        return this.elementType.toString() + "&";
    }

    public toWType() {
        return WType.u32;
    }

    public toMangledName(): string {
        return "R" + this.elementType.toMangledName();
    }
}

export class RightReferenceType extends ReferenceType {
    public toString() {
        return this.elementType.toString() + "&&";
    }

    public toWType() {
        return WType.u32;
    }

    public toMangledName(): string {
        return "r" + this.elementType.toMangledName();
    }
}

export abstract class PrimitiveType extends Type {
    public toString() {
        return this.constructor.name.replace("Type", "");
    }
}

export class VoidType extends PrimitiveType {
    get length(): number {
        return 1;
    }

    public toWType() {
        return WType.i32;
    }

    public toMangledName(): string {
        return "v";
    }
}

export class NullptrType extends PrimitiveType {
    get length(): number {
        return 1;
    }

    public toWType() {
        return WType.i32;
    }

    public toMangledName(): string {
        return "nullptr";
    }
}

export abstract class ArithmeticType extends PrimitiveType {
}

export abstract class IntegerType extends ArithmeticType {

}

export abstract class FloatingType extends ArithmeticType {
}

export abstract class SignedIntegerType extends IntegerType {

}

export abstract class UnsignedIntegerType extends IntegerType {

}

export class BoolType extends UnsignedIntegerType {
    get length(): number {
        return 1;
    }

    public toWType() {
        return WType.i8;
    }

    public toMangledName(): string {
        return "b";
    }
}

// HACK: Char = Signed Char
export class CharType extends SignedIntegerType {
    get length(): number {
        return 1;
    }

    public toWType() {
        return WType.i8;
    }

    public toMangledName(): string {
        return "c";
    }
}

export class Int16Type extends SignedIntegerType {
    get length(): number {
        return 2;
    }

    public toWType() {
        return WType.i16;
    }

    public toMangledName(): string {
        return "s";
    }
}

export class Int32Type extends SignedIntegerType {
    get length(): number {
        return 4;
    }

    public toWType() {
        return WType.i32;
    }

    public toMangledName(): string {
        return "i";
    }
}

export class Int64Type extends SignedIntegerType {
    get length(): number {
        return 8;
    }

    public toWType() {
        return WType.i64;
    }

    public toMangledName(): string {
        return "l";
    }
}

export class UnsignedCharType extends UnsignedIntegerType {
    get length(): number {
        return 1;
    }

    public toWType() {
        return WType.u8;
    }

    public toMangledName(): string {
        return "uc";
    }
}

export class UnsignedInt16Type extends UnsignedIntegerType {
    get length(): number {
        return 2;
    }

    public toWType() {
        return WType.u16;
    }

    public toMangledName(): string {
        return "us";
    }
}

export class UnsignedInt32Type extends UnsignedIntegerType {
    get length(): number {
        return 4;
    }

    public toWType() {
        return WType.u32;
    }

    public toMangledName(): string {
        return "ui";
    }
}

export class UnsignedInt64Type extends UnsignedIntegerType {
    get length(): number {
        return 8;
    }

    public toWType() {
        return WType.u64;
    }
    public toMangledName(): string {
        return "ul";
    }
}

export class FloatType extends FloatingType {
    get length(): number {
        return 4;
    }

    public toWType() {
        return WType.f32;
    }

    public toMangledName(): string {
        return "f";
    }
}

export class DoubleType extends FloatingType {
    get length(): number {
        return 8;
    }

    public toWType() {
        return WType.f64;
    }

    public toMangledName(): string {
        return "d";
    }
}

export class FunctionType extends Type {
    public name: string;
    public returnType: Type;
    public parameterTypes: Type[];
    public parameterNames: string[];
    public variableArguments: boolean;

    constructor(name: string, returnType: Type, parameterTypes: Type[],
                parameterNames: string[], variableArguments: boolean) {
        super();
        this.name = name;
        this.returnType = returnType;
        this.parameterTypes = parameterTypes;
        this.parameterNames = parameterNames;
        this.variableArguments = variableArguments;
    }

    get length(): number {
        return 0;
    }

    public equals(type: Type): boolean {
        return super.equals(type) &&
            type instanceof FunctionType &&
            this.returnType.equals(type.returnType) &&
            isArrayEqual(this.parameterTypes, type.parameterTypes);
    }

    public toString() {
        return "[Function]";
    }

    public toWType(): WType {
        throw new InternalError(`could not to Wtype of func`);
    }

    public toMangledName(): string {
        return this.parameterTypes.map((x) => x.toMangledName()).join(",");
    }
}

enum AccessControl {
    Public,
    Private,
    Protected,
}

export interface ClassField {
    name: string;
    type: Type;
    startOffset: number;
}

export class ClassType extends Type {

    public isUnion: boolean;
    public isComplete: boolean;
    public name: string;
    public fullName: string;
    public fileName: string;
    public fields: ClassField[];
    public fieldMap: Map<string, ClassField>;

    constructor(name: string, fullName: string, fileName: string, fields: ClassField[], isUnion: boolean) {
        super();
        this.name = name;
        this.fileName = fileName;
        this.fullName = fullName;
        this.fields = fields;
        this.isComplete = true;
        this.fieldMap = new Map<string, ClassField>();
        this.isUnion = isUnion;
    }

    public buildFieldMap() {
        this.fieldMap = new Map<string, ClassField>(
            this.fields.map( (x) => [x.name, x] as [string, ClassField]));
    }

    get length(): number {
        if ( this.isUnion ) {
            return Math.max(...this.fields
                .map((field) => field.type.length));
        } else {
            return this.fields
                .map((field) => field.type.length)
                .reduce((x, y) => x + y, 0);
        }
    }

    public toWType(): WType {
        throw new InternalError(`could not to Wtype of func`);
    }

    public toString() {
        return "[Class]";
    }

    public toMangledName() {
        return this.fullName;
    }

    public isDefine(): boolean {
        return this.isComplete;
    }
}

// export class MemberFunctionType extends FunctionType{
//     classType: Type;
//     isStatic: boolean;
//     isVirtual: boolean;
//     accessControl: AccessControl;
// }
//
// export class FieldType extends Type{
//     name: string;
//     type: Type;
//     isStatic: boolean;
//     accessControl: AccessControl;
//
// }
//
//
// export class ClassType extends Type{
//     name: string;
//     methods: MemberFunctionType[];
//     fields: FieldType[];
//     baseClasses: Type[];
//
//     requireVTable(): boolean{
//         return false;
//     }
//
// }

// class EnumType extends Type{
//
// }
//
// class UnionType extends Type{
//
// }
//

export class ArrayType extends Type {

    public elementType: Type;
    public size: number;

    constructor(elementType: Type, size: number) {
        super();
        this.elementType = elementType;
        this.size = size;
    }

    get length() {
        return this.elementType.length * this.size;
    }

    public equals(type: Type): boolean {
        return super.equals(type) &&
            type instanceof ArrayType &&
            this.elementType.equals(type.elementType) &&
            this.size === type.size;
    }

    public toString() {
        return this.elementType.toString() + `[${this.length}]`;
    }

    public toWType(): WType {
        throw new InternalError(`could not to Wtype of func`);
    }

    public toMangledName(): string {
        return this.elementType.toMangledName() + "[" + this.size + "]";
    }
}

export const PrimitiveTypes = {
    void: new VoidType(),
    nullptr: new NullptrType(),
    bool: new BoolType(),
    char: new CharType(),
    uchar: new UnsignedCharType(),
    int16: new Int16Type(),
    uint16: new UnsignedInt16Type(),
    int32: new Int32Type(),
    uint32: new UnsignedInt32Type(),
    int64: new Int64Type(),
    uint64: new UnsignedInt64Type(),
    float: new FloatType(),
    double: new DoubleType(),
    __ccharptr: new PointerType(new CharType()),
    __charptr: new PointerType(new CharType()),
};
PrimitiveTypes.__ccharptr.isConst = true;

export const PrimitiveTypesNameMap = new Map<string[][], PrimitiveType>([
    [[["void"]], PrimitiveTypes.void],
    [[["bool"]], PrimitiveTypes.bool],
    [[["char"], ["signed", "char"].sort()], PrimitiveTypes.char],
    [[["unsigned", "char"].sort()], PrimitiveTypes.uchar],
    [[["short"], ["signed", "short"].sort(), ["short", "int"].sort(), ["signed", "short", "int"].sort()],
        PrimitiveTypes.int16],
    [[["unsigned", "short"].sort(), ["unsigned", "short", "int"].sort()], PrimitiveTypes.uint16],
    [[["int"], ["signed"], ["signed", "int"].sort()], PrimitiveTypes.int32],
    [[["unsigned"], ["unsigned", "int"].sort()], PrimitiveTypes.uint32],
    [[["long"], ["signed", "long"].sort(), ["long", "int"].sort(), ["signed", "long", "int"].sort()],
        PrimitiveTypes.int32],
    [[["unsigned", "long"].sort(), ["unsigned", "long", "int"].sort()], PrimitiveTypes.uint32],
    [[["long", "long"], ["signed", "long", "long"].sort(), ["long", "long", "int"].sort(),
        ["signed", "long", "long", "int"].sort()], PrimitiveTypes.int64],
    [[["unsigned", "long", "long"].sort(), ["unsigned", "long", "long", "int"].sort()],
        PrimitiveTypes.uint64],
    [[["float"]], PrimitiveTypes.float],
    [[["double"]], PrimitiveTypes.double],
    // [[['long', 'double'].sort()],                                               PrimitiveTypes.longDouble],
    // [[['_Bool']],                                                               PrimitiveTypes._Bool]
]);

export enum StackStorageType {
    int32,
    uint32,
    float32,
    float64,
}

export function getStackStorageType(rawType: Type): StackStorageType {
    if (rawType instanceof SignedIntegerType) {
        return StackStorageType.int32;
    } else if ( rawType instanceof UnsignedIntegerType) {
        return StackStorageType.uint32;
    } else if ( rawType instanceof FloatType) {
        return StackStorageType.float32;
    } else if ( rawType instanceof DoubleType) {
        return StackStorageType.float64;
    } else if ( rawType instanceof PointerType) {
        return StackStorageType.uint32;
    } else {
        throw new InternalError(`unsupport type stoarge type`);
    }
}

export enum AddressType {
    GLOBAL,
    LOCAL,
    STACK,
    MEMORY_DATA,
    MEMORY_BSS,
    MEMORY_EXTERN,
    RVALUE,
    CONSTANT,
    GLOBAL_SP,
}

export class Variable extends Symbol {
    public name: string;
    public fullName: string;
    public fileName: string;
    public type: Type;
    public addressType: AddressType;
    public location: number | string;

    constructor(name: string, fullName: string, fileName: string, type: Type,
                storageType: AddressType, location: number | string) {
        super();
        this.name = name;
        this.fullName = fullName;
        this.fileName = fileName;
        this.type = type;
        this.addressType = storageType;
        this.location = location;
    }

    public toString() {
        return `${this.name}:${this.type.toString()}`;
    }

    public isDefine() {
        return this.addressType !== AddressType.MEMORY_EXTERN;
    }

    public getType() {
        return this.type;
    }
}

export class FunctionEntity extends Symbol {
    public name: string;
    public fullName: string;
    public fileName: string;
    public type: FunctionType;

    public isLibCall: boolean;
    public hasDefine: boolean;
    public parametersSize: number;
    public $sp: number;

    constructor(name: string, fullName: string, fileName: string,
                type: FunctionType, isLibCall: boolean, isDefine: boolean) {
        super();
        this.name = name;
        this.fullName = fullName;
        this.fileName = fileName;
        this.type = type;
        this.isLibCall = isLibCall;
        this.hasDefine = isDefine;
        this.$sp = 0;
        this.parametersSize = type.parameterTypes
            .map((x) => x.length)
            .reduce((x, y) => x + y, 0);
    }

    public isDefine(): boolean {
        return this.hasDefine;
    }

    public getType() {
        return this.type;
    }
}
