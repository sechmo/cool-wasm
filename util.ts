/**
 * Utility class for string padding and formatting
 */
export class Utilities {
  static pad(n: number): string {
    return ' '.repeat(n);
  }
  
  static printEscapedString(str: string): string {
    return str.replace(/\\/g, '\\\\')
              .replace(/\n/g, '\\n')
              .replace(/\t/g, '\\t')
              .replace(/\"/g, '\\"');
  }
}

/**
 * Represents a location in source code
 */
export class SourceLocation {
  constructor(
    public filename: string,
    public lineNumber: number,
    public columnNumber: number = 0
  ) {}
  
  toString(): string {
    return `${this.filename}:${this.lineNumber}:${this.columnNumber}`;
  }
}