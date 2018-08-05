import {SourceMapGenerator} from "source-map";
import {WFunction} from "../wasm";
import {WMemoryLocation} from "../wasm/expression";
import {WStatement} from "../wasm/node";
import {WFunctionType} from "../wasm/section";
import {Type} from "./type";

/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 15/07/2018
 */

export interface ExportSymbol {
    name: string;
    type: Type;
    form: WMemoryLocation;
    location: number;
}

export interface ImportSymbol {
    name: string;
    type: WFunctionType;
}

export interface CompiledObject {
    fileName: string;
    dataSize: number;
    globalStatements: WStatement[];
    functions: WFunction[];
    imports: ImportSymbol[];
    exports: ExportSymbol[];
    data: ArrayBuffer;
    requiredWASMFuncTypes: Set<string>;

    // debug only
    source?: string;
    sourceMap?: SourceMapGenerator;
}

export interface SourceMap {
    source: string[];
    sourceMap: SourceMapGenerator;
    lastLine: number;
}

export interface BinaryObject {
    fileName: string;
    entry: string;
    binary: ArrayBuffer;
    heapStart: number;

    // debug only
    sourceMap?: Map<string, SourceMap>;

}
