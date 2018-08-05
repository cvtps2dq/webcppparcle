
const {PrimitiveTypes} = require("../../dist/type/primitive_type");
const {ClassType} = require("../../dist/type/class_type");
const {FunctionType} = require("../../dist/type/function_type");
const {AddressType, Variable, FunctionEntity} = require("../../dist/common/symbol");
const {ScopeManager} = require("../../dist/codegen/scope");
const {assert} = require("chai");

function arrayEqual(x, y){
    const sx = x.sort();
    const sy = y.sort();
    assert.equal(x.length, y.length);
    for(let i = 0; i < x.length; i++){
        assert.equal(sx[i], sy[i]);
    }
}

describe('c++ scope test', function () {
    it('should works', function () {
        const func = new FunctionEntity('', 'foo@i', '', new FunctionType('', '', []));
        const var_type = PrimitiveTypes.int32;
        const var_decl = new Variable('', '', '', var_type, AddressType.MEMORY_EXTERN, '');
        const var_def = new Variable('', '', '', var_type, AddressType.MEMORY_DATA, '');
        const type = new ClassType();

        const m = new ScopeManager(true);

        // foo(i)
        m.declare("foo@i", func);
        m.define("foo@i", func);
        m.enterScope("foo@i");
        m.declare("a", var_decl);
        assert.equal(m.lookupShortName("a"), var_decl);
        assert.equal(m.lookupShortName("::a"), var_decl);
        assert.equal(m.lookupShortName("foo@i::a"), var_decl);
        assert.equal(m.lookupShortName("::foo@i::a"), var_decl);
        assert.equal(m.lookupFullName("::foo@i::a"), var_decl);
        m.define("a", var_def);
        m.declare("a", var_decl);
        assert.equal(m.lookupShortName("a"), var_def);
        assert.equal(m.lookupShortName("::a"), var_def);
        assert.equal(m.lookupShortName("foo@i::a"), var_def);
        assert.equal(m.lookupShortName("::foo@i::a"), var_def);
        assert.equal(m.lookupFullName("a"), null);
        assert.equal(m.lookupFullName("::a"), null);
        assert.equal(m.lookupFullName("::foo@i::a"), var_def);
        m.exitScope();
        m.declare("foo@i", func);

        // class a
        m.enterScope("ns");
        m.enterScope("A");
        m.define("foo@i,i", func);
        assert.equal(m.lookupShortName("foo").functions[0], func);
        assert.equal(m.lookupShortName("A::foo").functions[0], func);
        assert.equal(m.lookupShortName("ns::A::foo").functions[0], func);
        assert.equal(m.lookupFullName("foo"), null);
        assert.equal(m.lookupFullName("::A::foo"), null);
        assert.equal(m.lookupFullName("::ns::A::foo").functions[0], func);
        m.exitScope();
        m.exitScope();

        // overload
        const f1 = new FunctionEntity('', 'foo@i', '', new FunctionType('', '', []));
        const f2 = new FunctionEntity('', 'foo@j', '', new FunctionType('', '', []));
        const f3 = new FunctionEntity('', 'foo@k', '', new FunctionType('', '', []));
        const f4 = new FunctionEntity('', 'foo@l', '', new FunctionType('', '', []));
        const f5 = new FunctionEntity('', 'foo@i', '', new FunctionType('', '', []));
        m.enterScope("us");
        m.declare("foo@i", f1);
        m.enterScope("A");
        m.declare("foo@j", f2);
        m.declare("foo@k", f3);
        m.enterScope("subA");
        m.declare("foo@l", f4);
        m.declare("foo@i", f5);
        arrayEqual(m.lookupShortName("foo").functions.map(x=>x.fullName),
                    [f2,f3,f4,f5].map(x=>x.fullName));
        arrayEqual(m.lookupShortName("subA::foo").functions.map(x=>x.fullName),
            [f4,f5].map(x=>x.fullName));
        arrayEqual(m.lookupShortName("A::subA::foo").functions.map(x=>x.fullName),
            [f4,f5].map(x=>x.fullName));
        arrayEqual(m.lookupShortName("A::foo").functions.map(x=>x.fullName),
            [f2,f3].map(x=>x.fullName));
        arrayEqual(m.lookupFullName("::us::A::subA::foo").functions.map(x=>x.fullName),
            [f4, f5].map(x=>x.fullName));
        m.exitScope();
        m.exitScope();
        m.exitScope();
    });
});