/* tslint:disable */
export const Headers = new Map<string, string>([["string.h","void strcpy(const char *dst, const char *src);"],["assert.h","#ifndef _ASSERT_H\n#define _ASSERT_H\n\n#ifdef NDEBUG\n#define assert(EX)\n#else\n#define assert(EX) (void)((EX) || (__assert (#EX, __FILE__, __LINE__),0))\n#endif\n\nvoid __assert (const char *msg, const char *file, int line);\n\n#endif"]]);
export const Impls = new Map<string, string>([["assert.cpp","#include <stdio.h>\n#include <stdlib.h>\n\nvoid __assert (const char *msg, const char *file, int line){\n    printf(\"assert failed in %s#%d: %s\", file, line, msg);\n    exit(255);\n}"],["string.cpp","void strcpy(const char *dst, const char *src){\n    while( *dst++ = *src++ );\n}"]]);
