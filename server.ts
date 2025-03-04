import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { renderFile } from "https://deno.land/x/eta@v1.12.3/mod.ts";

// Configure Eta
const eta = {
  views: Deno.cwd(),
};

// Create Oak application
const app = new Application();
const router = new Router();

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
    defaultCode: `Class Main inherits A2I {
	main (): Object {
		(new IO).out_string(i2a(fact(a2i((new IO).in_string()))).concat("\n"));
	};

	fact (i: Int): Int {
		let fact: Int <- 1 in {
			while ( not (i = 0)) loop
				{
					fact <- fact * i;
					i <- i - 1;
				}
			pool;
			fact;
		}
	};
};`,
  }, eta) ?? "";
  ctx.response.type = "text/html";
});

// Use router
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
const port = 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });
