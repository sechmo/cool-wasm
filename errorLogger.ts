import { SourceLocation } from "./util.ts";

export class ErrorLogger {
  private static errCount = 0;
  private static errorMsgs: string[] = [];
  static semantError(loc: SourceLocation, msg: string): void {
    const actualMsg = `${loc.filename}:${loc.lineNumber}: ${msg}`
    console.error(actualMsg);
    this.errorMsgs.push(actualMsg);
    ErrorLogger.errCount++;
  }

  static error(msg: string): void {
    console.error(msg);
    this.errorMsgs.push(msg);
  }

  static anyError(): boolean {
    return ErrorLogger.errCount > 0;
  }

  static fullErrorMsg(): string {
    return this.errorMsgs.join("\n");
  }

  static clear(): void {
    this.errorMsgs = [];
    this.errCount = 0;
  }
}
