import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { renderFile } from "https://deno.land/x/eta@v1.12.3/mod.ts";
// @ts-types="./grammar/cool.ohm-bundle.d.ts"
import grammar from "./grammar/cool.ohm-bundle.js";
import { basename } from "@std/path";
import astSemantics from "./grammar/astSemantics.ts";
import { ASTNode, Program } from "./ast.ts";
import { convertWatToWasm } from "./wat2wast.ts";
import { ErrorLogger } from "./errorLogger.ts";

// Configure Eta
const eta = {
  views: Deno.cwd(),
};

// Create Oak application
const app = new Application();
const router = new Router();

const parseFileToAST = (code: string) => {
  const match = grammar.match(code);
  if (match.failed()) {
    throw match.message;
  }

  const fileBasename = basename("<code>");

  const ast = astSemantics(match).toAST() as ASTNode;

  ast.forEach((n) => {
    n.location.filename = fileBasename;
  });

  return ast;
};

// Serve static files
app.use(async (ctx, next) => {
  try {
    await ctx.send({
      root: `${Deno.cwd()}/static`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

// Routes
router.get("/", async (ctx) => {
  ctx.response.body = await renderFile("views/index.eta", {
    title: "Cool Code Editor",
    editorTitle: "Cool Editor",
    fileName: "main.cl",
    defaultCode: `class Main {
  main(): Int {
    42
  };
};`,
  }, eta) ?? "";
  ctx.response.type = "text/html";
});

router.post("/parse", async (ctx) => {
  const body = await ctx.request.body().value;
  const { code } = JSON.parse(body);
  if (!code) {
    ctx.response.status = 400;
    ctx.response.body = "No code provided";
    return;
  }
  try {
    const ast = parseFileToAST(code) as Program;
    ast.semant();
    const codeGen = ast.cgen();
    const wasm = convertWatToWasm(codeGen);
    ctx.response.body = wasm;
    ctx.response.type = "application/wasm";
  } catch (e) {
    const error = (e as Error)
    ctx.response.status = 400;
    ctx.response.body = error.message ? ErrorLogger.fullErrorMsg() : error;
    ctx.response.type = "text/plain";
  }
});

router.post("/wat", async (ctx) => {
  const body = await ctx.request.body().value;
  const { code } = JSON.parse(body);
  if (!code) {
    ctx.response.status = 400;
    ctx.response.body = "No code provided";
    return;
  }
  try {
    const ast = parseFileToAST(code) as Program;
    ast.semant();
    const codeGen = ast.cgen();
    ctx.response.body = codeGen;
    ctx.response.type = "text/plain";
  } catch (e) {
    const error = (e as Error)
    ctx.response.status = 400;
    ctx.response.body = error.message ? ErrorLogger.fullErrorMsg() : error;
    ctx.response.type = "text/plain";
  }
});



// Use router
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
const port = 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });
