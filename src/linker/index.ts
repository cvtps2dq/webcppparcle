/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 18/06/2018
 */
import {RawSourceMap, SourceMapGenerator} from "source-map";
import {CompiledObject} from "../codegen/context";
import {mergeScopeMap, Scope} from "../codegen/scope";
import {LinkerError} from "../common/error";
import {OpCode, OpCodeLimit} from "../common/instruction";
import {JsAPIDefine} from "../common/jsapi";
import {FunctionEntity, PrimitiveTypes, Type, Variable, VariableStorageType} from "../common/type";

interface LinkOptions {
    debugMode?: boolean;
}

export interface BinaryObject {
    code: DataView;
    codeSize: number;
    dataSize: number;
    bssSize: number;
    jsAPIList: JsAPIDefine[];
    labelMap?: Map<number, string>;
    sourceMap?: Map<number, [string, number]>;
    dataMap?: Map<number, Variable>;
    scopeMap?: Map<string, Scope>;
    metaInfo?: Map<string, [string, SourceMapGenerator]>;
}

function resolveSymbol(path: string,
                       scopeMap: Map<string, Scope>): Variable | FunctionEntity {
    const tokens = path.split("@");
    const scopeName = tokens.slice(0, tokens.length - 1).join("@");
    const name = tokens[tokens.length - 1];
    const scope = scopeMap.get(scopeName);
    if (scope === undefined) {
        throw new LinkerError(`undefined symbol ${name} at ${path}`);
    }
    const item = scope.getInCurrentScope(name);
    if (item === null) {
        throw new LinkerError(`undefined symbol ${name} at ${path}`);
    }
    if (item instanceof Type) {
        throw new LinkerError(`symbol ${name} is a type....`);
    }
    if (item instanceof Variable && item.storageType === VariableStorageType.MEMORY_EXTERN) {
        throw new LinkerError(`no definition for symbol ${name} at ${path}`);
    }
    if (item instanceof FunctionEntity && !item.isDefine()) {
        throw new LinkerError(`no implement of funcction ${item.name}`);
    }
    return item;
}

function shiftMemoryOffset(code: DataView, codeOffset: number, codeLength: number,
                           dataOffset: number, bssOffset: number) {
    let i = codeOffset;
    while (i < codeOffset + codeLength) {
        const op = code.getUint8(i);
        if ( op === OpCode.CALL) {
            const val = code.getUint32(i + 1);
            code.setUint32(i + 1,  val + codeOffset);
            i += 5;
        } else if ( op === OpCode.PDATA) {
            const val = code.getUint32(i + 1);
            code.setUint32(i + 1,  val + dataOffset);
            i += 5;
        } else if (op === OpCode.PBSS) {
            const val = code.getUint32(i + 1);
            code.setUint32(i + 1,  val + bssOffset);
            i += 5;
        } else if (op <= OpCodeLimit.L1) {
            i += 1;
        } else if (op <= OpCodeLimit.L5U) {
            i += 5;
        } else if (op <= OpCodeLimit.L5I) {
            i += 5;
        } else if (op === OpCode.PF64) {
            i += 9;
        } else {
            throw new LinkerError(`unknown ins`);
        }
    }
}

/**
 * The C/C++ Linker
 *
 * 1. compare the unresolved symbol;
 * 2. resolve unresolved function call (CALL)
 * 3. resolve unresolved variables (extern memory)
 * 4. adjust inner global memory reference (LM, LMP, SM, SMP)
 * 5. merge into one code buffer;
 * 6. select the code entry point: main
 *
 * @param {CompiledObject[]} inputs
 * @param jsAPIMap
 * @param {LinkOptions} linkOptions
 * @returns {BinaryObject}
 */
export function link(inputs: CompiledObject[],
                     jsAPIMap: {[key: string]: JsAPIDefine},
                     linkOptions: LinkOptions = {}): BinaryObject {

    // prepare js api
    const jsApiLocMap = new Map<string, number>();
    const jsAPIList = [];
    for (const key of Object.keys(jsAPIMap)) {
        jsApiLocMap.set("@root@" + key, jsAPIList.length);
        jsAPIList.push(jsAPIMap[key]);
    }

    // merge Scope
    const scopeMaps = inputs.map((input) => input.scopeMap);
    const newScope = mergeScopeMap(scopeMaps);

    // merge code
    const [globalCodeSizeRaw, codeSize, dataSize, bssSize] = inputs
        .map((input) => [input.globalAssembly.size, input.assembly.size, input.dataSize, input.bssSize])
        .reduce((x, y) => x.map((_, i) => x[i] + y[i]));

    const globalCodeSize = globalCodeSizeRaw + 6; // 6 for CALL MAIN; END

    const codeBuffer = new ArrayBuffer(globalCodeSize + codeSize + dataSize);
    const code = new DataView(codeBuffer);
    const codeArray = new Uint8Array(codeBuffer);

    const bssLocMap = new Map<string, number>();
    const dataLocMap = new Map<string, number>();
    const codeLocMap = new Map<string, number>();
    const labelMap = new Map<number, string>();
    const sourceMap = new Map<number, [string, number]>();
    const dataMap = new Map<number, Variable>();
    const metaInfo = new Map<string, [string, SourceMapGenerator]>();

    let globalCodeNow = 0;
    let codeNow = globalCodeSize;
    let dataNow = globalCodeSize + codeSize;
    let bssNow = globalCodeSize + codeSize + dataSize;

    // 1. compute offset
    for (const input of inputs) {
        if ( dataLocMap.get(input.fileName) !== undefined) {
            throw new LinkerError(`duplicated file name ${input.fileName}`);
        }
        dataLocMap.set(input.fileName, dataNow);
        codeLocMap.set(input.fileName, codeNow);
        bssLocMap.set(input.fileName, bssNow);
        metaInfo.set(input.fileName, [input.source, input.sourceMap]);
        codeNow += input.assembly.size;
        dataNow += input.dataSize;
        bssNow += input.bssSize;
    }

    globalCodeNow = 0;
    dataNow = globalCodeSize + codeSize;
    bssNow = globalCodeSize + codeSize + dataSize;

    // 2. link global assembly
    for (const input of inputs) {
        if (linkOptions.debugMode) {
            for (const item of input.globalAssembly.sourceMap) {
                sourceMap.set(item[0] + globalCodeNow, [input.fileName, item[1]]);
            }
        }
        codeArray.set(new Uint8Array(input.globalAssembly.code.buffer
            .slice(0, input.globalAssembly.size)), globalCodeNow);
        for (const tuple of input.globalAssembly.unresolvedSymbols) {
            const symbol = resolveSymbol(tuple[1], newScope);
            if (symbol instanceof FunctionEntity) {
                if (symbol.isLibCall) {
                    const loc = jsApiLocMap.get(symbol.fullName);
                    if ( loc === undefined) {
                        throw new LinkerError(`no __libcall impl => ${symbol.fullName}`);
                    }
                    code.setUint32(codeNow + tuple[0] + 1, loc);
                } else {
                    code.setUint32(globalCodeNow + tuple[0] + 1, symbol.location as number
                        + (codeLocMap.get(symbol.fileName) as number) - codeNow);
                }
            } else if (symbol.storageType === VariableStorageType.MEMORY_DATA) {
                code.setUint32(globalCodeNow + tuple[0] + 1, symbol.location as number
                    + (dataLocMap.get(symbol.fileName) as number) - dataNow);
            } else if (symbol.storageType === VariableStorageType.MEMORY_BSS) {
                code.setUint8(globalCodeNow + tuple[0], OpCode.PBSS);
                code.setUint32(globalCodeNow + tuple[0] + 1, symbol.location as number
                    + (bssLocMap.get(symbol.fileName) as number) - bssNow);
            } else {
                throw new LinkerError(`unknown symbol storage type`);
            }
        }
        shiftMemoryOffset(code, globalCodeNow, input.globalAssembly.size, dataNow, bssNow);
        globalCodeNow += input.globalAssembly.size;
        dataNow += input.dataSize;
        bssNow += input.bssSize;
    }

    codeNow = globalCodeSize;
    dataNow = globalCodeSize + codeSize;
    bssNow = globalCodeSize + codeSize + dataSize;

    // 3. link function assembly
    for (const input of inputs) {
        if (linkOptions.debugMode) {
            for (const item of input.assembly.sourceMap) {
                sourceMap.set(item[0] + codeNow, [input.fileName, item[1]]);
            }
        }
        for (const item of input.labels) {
            labelMap.set(codeNow + item[0], item[1]);
        }
        codeArray.set(new Uint8Array(input.assembly.code.buffer
            .slice(0, input.assembly.size)), codeNow);
        for (const tuple of input.assembly.unresolvedSymbols) {
            const symbol = resolveSymbol(tuple[1], newScope);
            if (symbol instanceof FunctionEntity) {
                if (symbol.isLibCall) {
                    const loc = jsApiLocMap.get(symbol.fullName);
                    if ( loc === undefined) {
                        throw new LinkerError(`no __libcall impl at ${symbol.fullName}`);
                    }
                    code.setUint32(codeNow + tuple[0] + 1, loc);
                } else {
                    code.setUint32(codeNow + tuple[0] + 1, symbol.location as number
                        + (codeLocMap.get(symbol.fileName) as number) - codeNow);
                }
             } else if (symbol.storageType === VariableStorageType.MEMORY_DATA) {
                code.setUint32(codeNow + tuple[0] + 1, symbol.location as number
                    + (dataLocMap.get(symbol.fileName) as number) - dataNow);
            } else if (symbol.storageType === VariableStorageType.MEMORY_BSS) {
                code.setUint8(codeNow + tuple[0], OpCode.PBSS);
                code.setUint32(codeNow + tuple[0] + 1, symbol.location as number
                    + (bssLocMap.get(symbol.fileName) as number) - bssNow);
            } else {
                throw new LinkerError(`; unknown; symbol; storage; type`);
            }
        }
        shiftMemoryOffset(code, codeNow, input.assembly.size, dataNow, bssNow);
        // merge data
        codeArray.set(new Uint8Array(input.data.buffer
            .slice(0, input.dataSize)), dataNow);
        codeNow += input.assembly.size;
        dataNow += input.dataSize;
        bssNow += input.bssSize;
    }

    // 4. resolve string constant & generate debug info

    const rootMap = newScope.get("@root")!.map;
    for (const key of rootMap.keys()) {
        const item = rootMap.get(key)!;
        if ( item instanceof Variable) {
            const loc = item.location as number + (dataLocMap.get(item.fileName) as number);
            if (linkOptions.debugMode) {
                dataMap.set(loc, item);
            }
            if ( item.type.equals(PrimitiveTypes.__charptr) || item.type.equals(PrimitiveTypes.__ccharptr)) {
                code.setUint32(loc, code.getUint32(loc) +  (dataLocMap.get(item.fileName)!));
            }
        }
    }

    // 5. inject bootstrap instruction;

    const entry = resolveSymbol("@root@main", newScope);
    const entryLoc = (codeLocMap.get(entry.fileName) as number) + (entry.location as number);
    // CALL main
    // END
    code.setUint8(globalCodeSize - 6, OpCode.CALL);
    code.setUint32(globalCodeSize - 5, entryLoc);
    code.setUint8(globalCodeSize - 1, OpCode.END);

    return {
        jsAPIList,
        code,
        labelMap,
        sourceMap,
        codeSize: globalCodeSize + codeSize,
        dataSize,
        bssSize,
        dataMap,
        scopeMap: newScope,
        metaInfo,
    };
}
