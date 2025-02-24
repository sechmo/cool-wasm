// @ts-types="./grammar/cool.ohm-bundle.d.ts"
import grammar from "./grammar/cool.ohm-bundle.js";
import astSemantics from "./grammar/astSemantics.ts";


const parseFileToAST = (filePath: string) => {
  const contents = Deno.readTextFileSync(filePath);
  const match = grammar.match(contents);
  if (match.failed()) {
    throw match.message;
  }

  return astSemantics(match).toAST();
}


if (import.meta.main) {
  const filePath = "./test.cool";
  try {
    const ast = parseFileToAST(filePath);
    console.log(ast.dumpWithTypes(0));
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log(e.message);
    } else {
      console.log(e);
    }
  }
}
