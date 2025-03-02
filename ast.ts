import "./abstractTable.ts";
import { AbstractSymbol } from "./abstractTable.ts";
import { SourceLocation, Utilities } from "./util.ts";

/**
 * Callback type for AST traversal
 */
export type ASTVisitorCallback = (node: ASTNode) => void;

/**
 * Base abstract class for all AST nodes
 */
export abstract class ASTNode {
  constructor(public location: SourceLocation) {}

  /**
   * Creates a string representation of the AST node with type information
   */
  abstract dumpWithTypes(n: number): string;

  /**
   * Dumps the line number information
   */
  protected dumpLine(n: number): string {
    return `${Utilities.pad(n)}#${this.location.lineNumber}\n`;
  }

  /**
   * Traverses this node and all its child nodes, calling the callback on each
   * @param callback Function to call on each visited node
   */
  abstract forEach(callback: ASTVisitorCallback): void;
}

/**
 * Base abstract class for all expressions
 */
export abstract class Expr extends ASTNode {
  private type: AbstractSymbol | null = null;

  getType(): AbstractSymbol | null {
    return this.type;
  }

  setType(type: AbstractSymbol): Expr {
    this.type = type;
    return this;
  }

  /**
   * Dumps the type information for this expression
   */
  protected dumpType(n: number): string {
    if (this.type !== null) {
      return `${Utilities.pad(n)}: ${this.type.getString()}\n`;
    } else {
      return `${Utilities.pad(n)}: _no_type\n`;
    }
  }

  /**
   * Base implementation for expressions
   * Subclasses will override this when they have child nodes
   */
  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
  }
}

/**
 * Base abstract class for all features (methods and attributes)
 */
export abstract class Feature extends ASTNode {
  /**
   * Base implementation for features
   * Subclasses will override this when they have child nodes
   */
  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
  }
}

/**
 * Program is the root of the AST
 */
export class Program extends ASTNode {
  constructor(location: SourceLocation, public classes: Classes) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_program\n`;

    for (const cls of this.classes) {
      result += cls.dumpWithTypes(n + 2);
    }

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    for (const cls of this.classes) {
      cls.forEach(callback);
    }
  }
}

export type Classes = ClassStatement[];

/**
 * Represents a class definition in the program
 */
export class ClassStatement extends ASTNode {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public parentName: AbstractSymbol,
    public features: Features,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_class\n`;
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;

    if (this.parentName) {
      result += `${Utilities.pad(n + 2)}${this.parentName.getString()}\n`;
    } else {
      result += `${Utilities.pad(n + 2)}Object\n`; // Default parent
    }

    result += `${Utilities.pad(n + 2)}"${
      Utilities.printEscapedString(this.location.filename)
    }"\n`;
    result += `${Utilities.pad(n + 2)}(\n`;

    for (const feature of this.features) {
      result += feature.dumpWithTypes(n + 2);
    }

    result += `${Utilities.pad(n + 2)})\n`;

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    for (const feature of this.features) {
      feature.forEach(callback);
    }
  }
}

export type Features = Feature[];

/**
 * Represents a method definition in a class
 */
export class Method extends Feature {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public formals: Formals,
    public returnType: AbstractSymbol,
    public body: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_method\n`;
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;

    for (const formal of this.formals) {
      result += formal.dumpWithTypes(n + 2);
    }

    result += `${Utilities.pad(n + 2)}${this.returnType.getString()}\n`;
    result += this.body.dumpWithTypes(n + 2);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    for (const formal of this.formals) {
      formal.forEach(callback);
    }
    this.body.forEach(callback);
  }
}

export type Formals = Formal[];

/**
 * Represents a formal parameter in a method definition
 */
export class Formal extends ASTNode {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public typeDecl: AbstractSymbol,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_formal\n`;
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;
    result += `${Utilities.pad(n + 2)}${this.typeDecl.getString()}\n`;

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    // No child nodes to traverse
  }
}

/**
 * Represents an attribute definition in a class
 */
export class Attribute extends Feature {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public typeDecl: AbstractSymbol,
    public init: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_attr\n`;
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;
    result += `${Utilities.pad(n + 2)}${this.typeDecl.getString()}\n`;
    result += this.init.dumpWithTypes(n + 2);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.init.forEach(callback);
  }
}

export type Expressions = Expr[];

/**
 * Represents a case branch in a typcase expression
 */
export class Branch extends ASTNode {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public typeDecl: AbstractSymbol,
    public expr: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_branch\n`;
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;
    result += `${Utilities.pad(n + 2)}${this.typeDecl.getString()}\n`;
    result += this.expr.dumpWithTypes(n + 2);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.expr.forEach(callback);
  }
}

export type Cases = Branch[];

/**
 * Represents a no-expression node
 */
export class NoExpr extends Expr {
  constructor(location: SourceLocation) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_no_expr\n`;
    result += this.dumpType(n);

    return result;
  }

  // No child nodes to traverse, so use base implementation
}

/**
 * Represents a block of expressions
 */
export class Block extends Expr {
  constructor(location: SourceLocation, public expressions: Expressions) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_block\n`;

    for (const expr of this.expressions) {
      result += expr.dumpWithTypes(n + 2);
    }

    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    for (const expr of this.expressions) {
      expr.forEach(callback);
    }
  }
}

/**
 * Represents an assignment expression
 */
export class Assignment extends Expr {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public expr: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_assign\n`;
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;
    result += this.expr.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.expr.forEach(callback);
  }
}

/**
 * Represents a static method dispatch
 */
export class StaticDispatch extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr,
    public typeName: AbstractSymbol,
    public name: AbstractSymbol,
    public args: Expressions,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_static_dispatch\n`;
    result += this.expr.dumpWithTypes(n + 2);
    result += `${Utilities.pad(n + 2)}${this.typeName.getString()}\n`;
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;
    result += `${Utilities.pad(n + 2)}(\n`;

    for (const arg of this.args) {
      result += arg.dumpWithTypes(n + 2);
    }

    result += `${Utilities.pad(n + 2)})\n`;
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.expr.forEach(callback);
    for (const arg of this.args) {
      arg.forEach(callback);
    }
  }
}

/**
 * Represents a dynamic method dispatch
 */
export class DynamicDispatch extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr,
    public name: AbstractSymbol,
    public args: Expressions,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_dispatch\n`;
    result += this.expr.dumpWithTypes(n + 2);
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;
    result += `${Utilities.pad(n + 2)}(\n`;

    for (const arg of this.args) {
      result += arg.dumpWithTypes(n + 2);
    }

    result += `${Utilities.pad(n + 2)})\n`;
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.expr.forEach(callback);
    for (const arg of this.args) {
      arg.forEach(callback);
    }
  }
}

/**
 * Represents a conditional expression
 */
export class Conditional extends Expr {
  constructor(
    location: SourceLocation,
    public predicate: Expr,
    public thenExpr: Expr,
    public elseExpr: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_cond\n`;
    result += this.predicate.dumpWithTypes(n + 2);
    result += this.thenExpr.dumpWithTypes(n + 2);
    result += this.elseExpr.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.predicate.forEach(callback);
    this.thenExpr.forEach(callback);
    this.elseExpr.forEach(callback);
  }
}

/**
 * Represents a loop expression
 */
export class Loop extends Expr {
  constructor(
    location: SourceLocation,
    public predicate: Expr,
    public body: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_loop\n`;
    result += this.predicate.dumpWithTypes(n + 2);
    result += this.body.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.predicate.forEach(callback);
    this.body.forEach(callback);
  }
}

/**
 * Represents a typecase expression
 */
export class TypeCase extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr,
    public cases: Cases,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_typcase\n`;
    result += this.expr.dumpWithTypes(n + 2);

    for (const branch of this.cases) {
      result += branch.dumpWithTypes(n + 2);
    }

    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.expr.forEach(callback);
    for (const branch of this.cases) {
      branch.forEach(callback);
    }
  }
}

/**
 * Represents a let expression
 */
export class Let extends Expr {
  constructor(
    location: SourceLocation,
    public identifier: AbstractSymbol,
    public typeDecl: AbstractSymbol,
    public init: Expr,
    public body: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_let\n`;
    result += `${Utilities.pad(n + 2)}${this.identifier.getString()}\n`;
    result += `${Utilities.pad(n + 2)}${this.typeDecl.getString()}\n`;
    result += this.init.dumpWithTypes(n + 2);
    result += this.body.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.init.forEach(callback);
    this.body.forEach(callback);
  }
}

/**
 * Represents an addition expression
 */
export class Addition extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_plus\n`;
    result += this.e1.dumpWithTypes(n + 2);
    result += this.e2.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.e1.forEach(callback);
    this.e2.forEach(callback);
  }
}

/**
 * Represents a subtraction expression
 */
export class Subtraction extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_sub\n`;
    result += this.e1.dumpWithTypes(n + 2);
    result += this.e2.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.e1.forEach(callback);
    this.e2.forEach(callback);
  }
}

/**
 * Represents a multiplication expression
 */
export class Multiplication extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_mul\n`;
    result += this.e1.dumpWithTypes(n + 2);
    result += this.e2.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.e1.forEach(callback);
    this.e2.forEach(callback);
  }
}

/**
 * Represents a division expression
 */
export class Division extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_divide\n`;
    result += this.e1.dumpWithTypes(n + 2);
    result += this.e2.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.e1.forEach(callback);
    this.e2.forEach(callback);
  }
}

/**
 * Represents a negation expression
 */
export class Negation extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_neg\n`;
    result += this.expr.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.expr.forEach(callback);
  }
}

/**
 * Represents a less than comparison
 */
export class LessThan extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_lt\n`;
    result += this.e1.dumpWithTypes(n + 2);
    result += this.e2.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.e1.forEach(callback);
    this.e2.forEach(callback);
  }
}

/**
 * Represents an equality comparison
 */
export class Equal extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_eq\n`;
    result += this.e1.dumpWithTypes(n + 2);
    result += this.e2.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.e1.forEach(callback);
    this.e2.forEach(callback);
  }
}

/**
 * Represents a less than or equal comparison
 */
export class LessThanOrEqual extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_leq\n`;
    result += this.e1.dumpWithTypes(n + 2);
    result += this.e2.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.e1.forEach(callback);
    this.e2.forEach(callback);
  }
}

/**
 * Represents a logical complement expression
 */
export class Complement extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_comp\n`;
    result += this.expr.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.expr.forEach(callback);
  }
}

/**
 * Represents an integer constant
 */
export class IntegerConstant extends Expr {
  constructor(
    location: SourceLocation,
    public token: AbstractSymbol,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_int\n`;
    result += `${Utilities.pad(n + 2)}${this.token.getString()}\n`;
    result += this.dumpType(n);

    return result;
  }

  // No child nodes to traverse, so use base implementation
}

/**
 * Represents a boolean constant
 */
export class BooleanConstant extends Expr {
  constructor(
    location: SourceLocation,
    public value: boolean,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_bool\n`;
    result += `${Utilities.pad(n + 2)}${this.value ? 1 : 0}\n`;
    result += this.dumpType(n);

    return result;
  }

  // No child nodes to traverse, so use base implementation
}

/**
 * Represents a string constant
 */
export class StringConstant extends Expr {
  constructor(
    location: SourceLocation,
    public token: AbstractSymbol,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_string\n`;
    result += `${Utilities.pad(n + 2)}"${
      Utilities.printEscapedString(this.token.getString())
    }"\n`;
    result += this.dumpType(n);

    return result;
  }

  // No child nodes to traverse, so use base implementation
}

/**
 * Represents a new object instantiation
 */
export class New extends Expr {
  constructor(
    location: SourceLocation,
    public typeName: AbstractSymbol,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_new\n`;
    result += `${Utilities.pad(n + 2)}${this.typeName.getString()}\n`;
    result += this.dumpType(n);

    return result;
  }

  // No child nodes to traverse, so use base implementation
}

/**
 * Represents a void check expression
 */
export class IsVoid extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_isvoid\n`;
    result += this.expr.dumpWithTypes(n + 2);
    result += this.dumpType(n);

    return result;
  }

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    this.expr.forEach(callback);
  }
}

/**
 * Represents an object reference
 */
export class ObjectReference extends Expr {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_object\n`;
    result += `${Utilities.pad(n + 2)}${this.name.getString()}\n`;
    result += this.dumpType(n);

    return result;
  }

  // No child nodes to traverse, so use base implementation
}
