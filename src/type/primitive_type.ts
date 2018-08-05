import {WType} from "../wasm";
import {PointerType} from "./compound_type";
import {Type} from "./index";

/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 05/08/2018
 */

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
    public compatWith(type: Type): boolean {
        return type instanceof ArithmeticType;
    }
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

export const PrimitiveTypesNameMap = new Map<string[][], () => PrimitiveType>([
    [[["void"]], () => new VoidType()],
    [[["bool"]], () => new BoolType()],
    [[["char"], ["signed", "char"].sort()], () => new CharType()],
    [[["unsigned", "char"].sort()], () => new UnsignedCharType()],
    [[["short"], ["signed", "short"].sort(), ["short", "int"].sort(), ["signed", "short", "int"].sort()],
        () => new Int16Type()],
    [[["unsigned", "short"].sort(), ["unsigned", "short", "int"].sort()], () => new UnsignedInt16Type()],
    [[["int"], ["signed"], ["signed", "int"].sort()], () => new Int32Type()],
    [[["unsigned"], ["unsigned", "int"].sort()], () => new UnsignedInt32Type()],
    [[["long"], ["signed", "long"].sort(), ["long", "int"].sort(), ["signed", "long", "int"].sort()],
        () => new Int32Type()],
    [[["unsigned", "long"].sort(), ["unsigned", "long", "int"].sort()], () => new UnsignedInt32Type()],
    [[["long", "long"], ["signed", "long", "long"].sort(), ["long", "long", "int"].sort(),
        ["signed", "long", "long", "int"].sort()], () => new Int64Type()],
    [[["unsigned", "long", "long"].sort(), ["unsigned", "long", "long", "int"].sort()],
        () => new UnsignedInt64Type()],
    [[["float"]], () => new FloatType()],
    [[["double"]], () => new DoubleType()],
    // [[['long', 'double'].sort()],                                               PrimitiveTypes.longDouble],
    [[["bool"]], () => PrimitiveTypes.bool],
]);
