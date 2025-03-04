import wabt from 'wabt';

const wast = await Deno.readFile('fact.wat')
const wastT = new TextDecoder().decode(wast)

const wabtModule = await wabt();

const parsed = wabtModule.parseWat('fact.wat', wastT);
const { buffer } = parsed.toBinary({ log: true });

await Deno.writeFile('fact.wasm', buffer);
console.log('Wasm file generated!')