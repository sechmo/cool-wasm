import binaryen from "binaryen";

export function convertWatToWasm(wat: string): Uint8Array {
	const myModule = binaryen.parseText(wat);

	myModule.optimize();
	myModule.setFeatures(
		binaryen.Features.BulkMemory |
		binaryen.Features.GC |
		binaryen.Features.ReferenceTypes |
		binaryen.Features.ExceptionHandling |
		binaryen.Features.Multivalue,
	);

	console.log(myModule.emitText());
	const wasm = myModule.emitBinary();

	return wasm;
}
