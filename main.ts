// const abortTag = new WebAssembly.Tag({ parameters: ["i32"] });

// const importObject = {
//   cool: {
//     abortTag: abortTag,
//     outStringHelper: (strRef, lenFun, charAtFun) => {
//       const len = lenFun(strRef);
//       let jsStr = "";
//       for (let i = 0; i < len; i++) {
//         jsStr += String.fromCharCode(charAtFun(strRef, i));
//       }

//       console.log('>>>>', jsStr);
//     },
//     outIntHelper: (valAsNumber) => {
//       console.log('>>>>', valAsNumber)
//     }
//   },
//   console,
// };

// // const rawModule = Deno.readFileSync("./test.wasm");
// const rawModule = Deno.readFileSync("./static/genTest.wasm");
// const wasmModule = new WebAssembly.Module(rawModule);
// const wasmInstance = new WebAssembly.Instance(wasmModule, importObject);

// console.log(
//   Deno.inspect(wasmInstance.exports, {
//     depth: 20,
//     iterableLimit: 10000,
//     colors: true,
//   }),
// );



// const obj = wasmInstance.exports.new__Object();
// const str = wasmInstance.exports.new__String();

// const strToJs = (s) => {
//   let str = "";
//   const len = wasmInstance.exports.String__length(s);
//   for (let i = 0; i < len; i++) {
//     str += String.fromCharCode(wasmInstance.exports.String_at_util(s, i));
//   }
//   return str;
// };

// class Object_ {
//   type_name(): string {
//     return "Object";
//   }
// }

// class String_ extends Object_ {
//   override type_name(): string {
//     return "String";
//   }
// }

// console.log(`Obj: `, obj);
// console.log(`test Obj: ${wasmInstance.exports.objType(obj)}`);
// console.log(`test Str: ${wasmInstance.exports.objType(str)}`);
// console.log(`string length: ${wasmInstance.exports.String__length(str)}`);
// console.log(`string: ${strToJs(str)}`);
// console.log(
//   ` obj type name ${strToJs(wasmInstance.exports.Object__type_name(obj))}`,
// );
// console.log(
//   ` str type name ${strToJs(wasmInstance.exports.Object__type_name(str))}`,
// );
// console.log(
//   ` str type name static as obj ${
//     strToJs(wasmInstance.exports.Object__type_name__implementation(str))
//   }`,
// );
// console.log(
//   `obj type name substr ${strToJs(wasmInstance.exports.String__substr(
//     wasmInstance.exports.Object__type_name(obj), 2, 5
//   ))}`,
// );

// const getString = wasmInstance.exports.getString;
// const getElement = wasmInstance.exports.getElement;
// const getLength = wasmInstance.exports.getLength;
// const isString = wasmInstance.exports.isString;
// const throwIfNotString = wasmInstance.exports.throwIfNotString;

// const strRef = getString();
// const len = getLength(strRef);

// for (let i = 0; i < len; i++) {
//   const el = getElement(strRef, i)
//   console.log(`Char at #${i}: ${el} - ${String.fromCharCode(el)}`);
// }

// console.log(`is string? ${isString(strRef)}`)
// try {
//   const res = throwIfNotString(strRef)
//   console.log(`res ${res}`)

// }
// catch (e) {
//   if (e.is(abortTag)) {
//     console.log(` arg #0: ${e.getArg(abortTag,0)}`)
//   }
// }


// @ts-types="./grammar/cool.ohm-bundle.d.ts"
import grammar from "./grammar/cool.ohm-bundle.js";
import { basename } from "@std/path";
import astSemantics from "./grammar/astSemantics.ts";
import { ASTNode, Program } from "./ast.ts";

const parseFileToAST = (filePath: string) => {
  const contents = Deno.readTextFileSync(filePath);
  const match = grammar.match(contents);
  if (match.failed()) {
    throw match.message;
  }

  const fileBasename = basename(filePath);

  const ast = astSemantics(match).toAST() as ASTNode;

  ast.forEach((n) => {
    n.location.filename = fileBasename;
  });

  return ast;
};

if (import.meta.main) {
  const filePath = "./test.cool";
  try {
    const ast = parseFileToAST(filePath) as Program;
    ast.semant();
    const code = ast.cgen();
    console.log(code);
    // console.log(ast.dumpWithTypes(0));
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log(e.message);
    } else {
      console.log(e);
    }
  }
}

