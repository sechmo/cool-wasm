import { SourceLocation } from "./util.ts";

export class ErrorLogger {
    private static errCount = 0;
    static semantError(loc: SourceLocation, msg: string): void {
        console.error(`${loc.filename}:${loc.lineNumber}: ${msg}`)
        ErrorLogger.errCount++;
    }

    static anyError(): boolean {
        return ErrorLogger.errCount > 0;
    }
}