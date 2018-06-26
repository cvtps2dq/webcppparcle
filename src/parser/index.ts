import * as PegJs from 'pegjs'
import CGrammar from './c.lang';
import CPPGrammar from './c.lang';
import * as fs from 'fs';
import * as Long_ from 'long';
import * as CTree_ from '../common/ast';
import {TypeError, ParserError} from "../common/error"
import {Node, SpecifierType} from '../common/ast';

const storageClassSpecifierStringToEnum = [
    'typedef', 'extern', 'static', '_Thread_local', 'auto', 'register'
];

export function getStorageClassSpecifierFromSpecifiers(specifiers: SpecifierType[],
                                                       nodeForError: Node) {

    const storageClassSpecifiers = [];
    for (const specifier of specifiers) {
        if(typeof(specifier) == "string"){
            if (storageClassSpecifierStringToEnum.includes(specifier)) {
                storageClassSpecifiers.push(specifier);
            }
        }
    }

    // At most, one storage-class specifier may be given in the declaration specifiers in a declaration, except that
    // _Thread_local may appear with static or extern.
    if (!(storageClassSpecifiers.length < 2 || (storageClassSpecifiers.length === 2
        && storageClassSpecifiers.includes('_Thread_local')
        && (storageClassSpecifiers.includes('static')
            || storageClassSpecifiers.includes('extern'))))) {
        throw new TypeError('Multiple storage classes in declaration specifiers', nodeForError);
    }
    // _Thread_local shall not appear in the declaration specifiers of a function declaration.
    // TODO

    if (storageClassSpecifiers.includes('_Thread_local')) {
        throw new TypeError(`Unsupported: '_Thread_local' is not supported`,
            nodeForError);
    }
    if (storageClassSpecifiers.includes('register')) {
        throw new TypeError(`Unsupported: 'register' is not supported`,
            nodeForError);
    }

    return storageClassSpecifiers[0] || null;
}
const Ty_ = {
    getStorageClassSpecifierFromSpecifiers
};

function loadParser(source: string, query: any) {
    /** Inject into eval **/
    const Long = Long_;
    const Ty = Ty_;
    const AST = CTree_;

    // cache
    if(global['window'] === undefined && fs.existsSync('/tmp/' + query.parserName + '.js')){
        const code = fs.readFileSync('/tmp/' + query.parserName + '.js', 'utf8');
        const ret = eval(code);
        return ret;
    }
    source = source.replace(/&!'((\\.|[^'])*)'/g, (match,
                                                   rule) => `(expected:'${rule}'? {
        if (!expected) {${rule.includes('}') ? '/*{*/' : ''}
            error('Missing \\\'${rule}\\\'');
        }
        return expected;
    })`);
    query.output = 'source';
    query.cache = !!query.cache;
    query.optimize = query.optimize || 'speed';
    query.trace = !!query.trace;
    if (typeof query.allowedStartRules === 'string') {
        query.allowedStartRules = [query.allowedStartRules];
    }
    const code = PegJs.generate(source, query);
    if(global['window'] === undefined) {
        console.log('fuck');
        fs.writeFileSync('/tmp/' + query.parserName + '.js', code);
    }
    return eval(code as any);
}

const ConstantExpressionPegParser = loadParser(CGrammar, {parserName: 'ConstantExpression', allowedStartRules: 'ConstantExpression'});
const HeaderNamePegParser = loadParser(CGrammar, {parserName: 'HeaderName',allowedStartRules: 'HeaderName'});
const PreprocessingFilePegParser= loadParser(CGrammar, {parserName: 'PreprocessingFile',allowedStartRules: 'PreprocessingFile'});
const PreprocessingTokenPegParser= loadParser(CGrammar, {parserName: 'PreprocessingToken',allowedStartRules: 'PreprocessingToken'});
const TranslationUnitPegParser= loadParser(CGrammar, {parserName: 'TranslationUnitPegParser'});
const CPPTranslationUnitPegParser= loadParser(CPPGrammar, {parserName: 'CPPTranslationUnitPegParser'});

function wrapPegParser(parser: any) {
    return {
        parse(source: string, options: any) {
            try {
                return parser.parse(source, options);
            } catch (e) {
                if (e instanceof parser.SyntaxError) {
                    throw new ParserError(e);
                } else {
                    throw e;
                }
            }
        }
    };
}

export const ConstantExpressionParser = wrapPegParser(ConstantExpressionPegParser);
export const HeaderNameParser = wrapPegParser(HeaderNamePegParser);
export const PreprocessingFileParser = wrapPegParser(PreprocessingFilePegParser);
export const PreprocessingTokenParser = wrapPegParser(PreprocessingTokenPegParser);

export const CParser = wrapPegParser(TranslationUnitPegParser);
export const CPPParser = wrapPegParser(CPPTranslationUnitPegParser);