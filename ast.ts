import "./abstractTable.ts";
import { AbstractSymbol } from "./abstractTable.ts";
import { SourceLocation, Utilities } from "./util.ts";

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
}

/**
 * Base abstract class for all features (methods and attributes)
 */
export abstract class Feature extends ASTNode {
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
}

export type Classes = ClassStatement[];

/**
 * Represents a class definition in the program
 */
export class ClassStatement extends ASTNode {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public parentName: AbstractSymbol | null,
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
    
    result += `${Utilities.pad(n + 2)}"${Utilities.printEscapedString(this.location.filename)}"\n`;
    result += `${Utilities.pad(n + 2)}(\n`;
    
    for (const feature of this.features) {
      result += feature.dumpWithTypes(n + 2);
    }
    
    result += `${Utilities.pad(n + 2)})\n`;
    
    return result;
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
    public body: Expr
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
}

export type Formals = Formal[];

/**
 * Represents a formal parameter in a method definition
 */
export class Formal extends ASTNode {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public typeDecl: AbstractSymbol
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
}

/**
 * Represents an attribute definition in a class
 */
export class Attribute extends Feature {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public typeDecl: AbstractSymbol,
    public init: Expr
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
    public expr: Expr
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
}

/**
 * Represents an assignment expression
 */
export class Assignment extends Expr {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol,
    public expr: Expr
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
    public args: Expressions
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
}

/**
 * Represents a dynamic method dispatch
 */
export class DynamicDispatch extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr,
    public name: AbstractSymbol,
    public args: Expressions
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
}

/**
 * Represents a conditional expression
 */
export class Conditional extends Expr {
  constructor(
    location: SourceLocation,
    public predicate: Expr,
    public thenExpr: Expr,
    public elseExpr: Expr
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
}

/**
 * Represents a loop expression
 */
export class Loop extends Expr {
  constructor(
    location: SourceLocation,
    public predicate: Expr,
    public body: Expr
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
}

/**
 * Represents a typecase expression
 */
export class TypeCase extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr,
    public cases: Cases
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
    public body: Expr
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
}

/**
 * Represents an addition expression
 */
export class Addition extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr
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
}

/**
 * Represents a subtraction expression
 */
export class Subtraction extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr
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
}

/**
 * Represents a multiplication expression
 */
export class Multiplication extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr
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
}

/**
 * Represents a division expression
 */
export class Division extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr
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
}

/**
 * Represents a negation expression
 */
export class Negation extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr
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
}

/**
 * Represents a less than comparison
 */
export class LessThan extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr
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
}

/**
 * Represents an equality comparison
 */
export class Equal extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr
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
}

/**
 * Represents a less than or equal comparison
 */
export class LessThanOrEqual extends Expr {
  constructor(
    location: SourceLocation,
    public e1: Expr,
    public e2: Expr
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
}

/**
 * Represents a logical complement expression
 */
export class Complement extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr
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
}

/**
 * Represents an integer constant
 */
export class IntegerConstant extends Expr {
  constructor(
    location: SourceLocation,
    public token: AbstractSymbol
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
}

/**
 * Represents a boolean constant
 */
export class BooleanConstant extends Expr {
  constructor(
    location: SourceLocation,
    public value: boolean
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
}

/**
 * Represents a string constant
 */
export class StringConstant extends Expr {
  constructor(
    location: SourceLocation,
    public token: AbstractSymbol
  ) {
    super(location);
  }
  
  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_string\n`;
    result += `${Utilities.pad(n + 2)}"${Utilities.printEscapedString(this.token.getString())}"\n`;
    result += this.dumpType(n);
    
    return result;
  }
}

/**
 * Represents a new object instantiation
 */
export class New extends Expr {
  constructor(
    location: SourceLocation,
    public typeName: AbstractSymbol
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
}

/**
 * Represents a void check expression
 */
export class IsVoid extends Expr {
  constructor(
    location: SourceLocation,
    public expr: Expr
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
}

/**
 * Represents an object reference
 */
export class ObjectReference extends Expr {
  constructor(
    location: SourceLocation,
    public name: AbstractSymbol
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
}