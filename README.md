# web-cpp
[![Build Status](https://www.travis-ci.org/zurl/web-cpp.svg?branch=master)](https://www.travis-ci.org/zurl/web-cpp)
[![Coverage Status](https://coveralls.io/repos/github/zurl/web-cpp/badge.svg)](https://coveralls.io/github/zurl/web-cpp)


a experimental c++ compiler in typescript

## usage

```shell
npm install
npm install -g typescript nyc mocha
npm run build
npm run test
```

## Notes

Name Mangling

global var: @var1
local var:  @foo@var1

# todolist

## C language

- [X] function call codegen / return codegen
- [X] & && | || >> <<
- [X] ++ --
- [X] \+ \- ! ~
- [X] += -= *= /= ...
- [X] vm
- [X] array
- [X] sizeof
- [X] typedef
- [ ] enum
- [X] union
- [X] js native function
- [X] string
- [X] var initilizer
- [X] data segment data
- [X] doConstant about < > <= >= == & && | || >> << ...
- [X] struct / class
- [X] cast ope (hard)
- [ ] const
- [X] void return type;
- [ ] non-return detect
- [X] function call parameter type conversion
- [ ] bit field of struct
- [X] var args
- [ ] switch case
- [X] do-while
- [X] break continue
- [ ] goto label
- [ ] js highlevel api
- [X] allocator
- [X] char * a = "123"
- [X] write, read
- [X] printf
- [ ] postfix ++ --
- [ ] #if #elif
- [ ] only export necessary scopeMap
## C++ Language

### reference
### operator overload
### function overload (mangled name)
### class
> member function
> virtual function
### exception
### template

