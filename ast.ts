import "./abstractTable.ts";
import { AbstractSymbol, AbstractTable } from "./abstractTable.ts";
import { ClassTable } from "./classTable.ts";
import { ErrorLogger } from "./errorLogger.ts";
import { FeatureEnvironment } from "./featureEnvironment.ts";
import { ScopedEnvironment } from "./scopedEnvironment.ts";
import { SourceLocation, Utilities } from "./util.ts";
import * as ASTConst from "./astConstants.ts";
import { ConstantGenerator, Sexpr, sexprToString } from "./cgen/cgenUtil.ts";

let labelCounter = 0;
function generateLabel(): string {
  return `$label${labelCounter++}`;
}

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

enum VarOrigin {
  CLASS,
  LET,
};

type VarOriginEnvironment = ScopedEnvironment<AbstractSymbol, VarOrigin>

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

  abstract semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void;

  abstract cgen(
    featEnv: FeatureEnvironment,
    constEnv: ConstEnv,
    varOrEnv: VarOriginEnvironment,
    currClsName: AbstractSymbol,
    beforeExprBlock: Sexpr[],
  ): Sexpr[];
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

  abstract semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void;
}

type ConstEnv = {
  intConstants: Map<AbstractSymbol, string>;
  strConstants: Map<AbstractSymbol, string>;
};
/**
 * Program is the root of the AST
 */
export class Program extends ASTNode {
  private clsTbl?: ClassTable;
  private featEnv?: FeatureEnvironment;
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

  public semant(): boolean {
    ErrorLogger.clear();
    const clsTbl = new ClassTable(this);
    if (ErrorLogger.anyError()) {
      ErrorLogger.error("Compilation halted due to static semantic errors");
      return false;
    }

    this.clsTbl = clsTbl;

    const featEnv = new FeatureEnvironment(clsTbl);
    if (ErrorLogger.anyError()) {
      ErrorLogger.error("Compilation halted due to static semantic errors");
      return false;
    }

    this.featEnv = featEnv;

    for (const cls of this.classes) {
      cls.semant(clsTbl, featEnv);
    }

    if (ErrorLogger.anyError()) {
      ErrorLogger.error("Compilation halted due to static semantic errors");
      return false;
    }

    return true;
  }

  public cgen(): string {
    const headers = [
      ["import", `"cool"`, `"abortTag"`, ["tag", "$abortTag", [
        "param",
        "i32",
      ]]],
      [
        "import",
        `"cool"`,
        `"outStringHelper"`,
        ["func", "$outStringHelper", ["param", ["ref", "null", "$String"]], ["param", [
          "ref",
          "$String.helper.length.signature",
        ]], ["param", ["ref", "$String.helper.charAt.signature"]]],
      ],
      [
        "import",
        `"cool"`,
        `"outIntHelper"`,
        ["func", "$outIntHelper", ["param", "i32"]],
      ],
    ];
    const { typeDefBlock, programBlock: initializationBlock } = this.featEnv!
      .cgenTypeDefs();

    const constants: Sexpr[] = [];
    // create and register all constants
    const strToConstName = new Map<AbstractSymbol, string>();

    AbstractTable.stringTable.foreach((sym) => {
      const { name, sexpr } = ConstantGenerator.stringConstantSexpr(
        sym.toString(),
      );
      strToConstName.set(sym, name);
      constants.push(sexpr);
    });

    const intToConstName = new Map<AbstractSymbol, string>();

    AbstractTable.intTable.foreach((sym) => {
      const { name, sexpr } = ConstantGenerator.intConstantSexpr(
        Number.parseInt(sym.toString()),
      );
      intToConstName.set(sym, name);
      constants.push(sexpr);
    });

    const constEnv: ConstEnv = {
      strConstants: strToConstName,
      intConstants: intToConstName,
    };

    const classesCode = this.classes.flatMap((c) =>
      c.cgen(this.featEnv!, constEnv)
    );

    const module: Sexpr = [
      "module",
      ...headers,
      typeDefBlock,
      ...initializationBlock,
      ...constants,
      ...classesCode,
    ];
    return sexprToString(module);
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

  public semant(clsTbl: ClassTable, featEnv: FeatureEnvironment): void {
    const attrEnv = featEnv.classAttributeEnvironment(this.name);

    for (const feat of this.features) {
      feat.semant(clsTbl, attrEnv, featEnv, this.name);
    }
  }

  public cgen(featEnv: FeatureEnvironment, constEnv: ConstEnv): Sexpr[] {
    const cgenClassName = `$${this.name}`;
    const beforeClassBlock: Sexpr[] = [];


    const varOrEnv: VarOriginEnvironment = new ScopedEnvironment();
    varOrEnv.enterNewScope()

    featEnv.classAllAttrs(this.name).forEach(({name}) => { varOrEnv.add(name, VarOrigin.CLASS)})

    const attributeInits = this.features.filter((f) => f instanceof Attribute)
      .map((a) => {
        const attrType = featEnv.classAttrType(this.name, a.name, this.name);
        const attrName = `$${a.name}`;
        // const localDeclare = ["local", localName, ["ref", "null", `$${a.typeDecl}`]]
        const initExpr = a.cgen(featEnv,  constEnv, varOrEnv, this.name, beforeClassBlock);

        return { id: attrType.id, attrName, initExpr };
      }).toSorted(({ id: id0 }, { id: id1 }) => id0 - id1);

    const initName = `${cgenClassName}.init`;

    const initFunc = [
      "func",
      initName,
      ["param", "$self", ["ref", cgenClassName]],
      ["local.get", "$self"],
      ["call", `$${this.parentName}.init`],
      // ...attributeInits.map(ai => ai.localDeclare),
      ...attributeInits.flatMap(
        (ai) => [["local.get", "$self"], ...ai.initExpr, [
          "struct.set",
          `${cgenClassName}`,
          ai.attrName,
        ]],
      ),
    ];

    const newFunc = [
      "func",
      `${cgenClassName}.new`,
      ["export", `"${cgenClassName}.new"`],
      ["result", ["ref", cgenClassName]],
      ["local", "$self", ["ref", cgenClassName]],
      ["global.get", `${cgenClassName}.vtable.canon`],
      ...featEnv.classAllAttrs(this.name).flatMap((
        { name: attrName, signature: at },
      ) => [`;; ${attrName}`, ["ref.null", `$${at.type}`]]), // initialize struct with nulls
      ["struct.new", cgenClassName],
      ["local.tee", "$self"],
      ["call", initName],
      ["local.get", "$self"],
    ];


    const methodImplementations = this.features.filter((f) =>
      f instanceof Method
    ).flatMap((m) => m.cgen(featEnv, constEnv, varOrEnv, this.name));

    varOrEnv.exitLastScope();

    return [
      initFunc,
      newFunc,
      ...methodImplementations,
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    objEnv.enterNewScope();

    objEnv.add(ASTConst.self, ASTConst.SELF_TYPE);
    for (const formal of this.formals) {
      objEnv.add(formal.name, formal.typeDecl);
    }

    this.body.semant(clsTbl, objEnv, featEnv, currClsName);
    objEnv.exitLastScope();

    if (
      !clsTbl.isSubclass(this.body.getType()!, this.returnType, currClsName)
    ) {
      ErrorLogger.semantError(
        this.location,
        `invalid method body return type ${this.body.getType()!} ` +
          `is not a subtype of ${this.returnType}`,
      );
    }
  }

  cgen(
    featEnv: FeatureEnvironment,
    constEnv: ConstEnv,
    varOrEnv: VarOriginEnvironment,
    currClsName: AbstractSymbol,
  ): Sexpr[] {
    const signature = featEnv.classMethodSignature(
      currClsName,
      this.name,
      currClsName,
    );
    const beforeBlock: Sexpr[] = [];

    const bodyCgenExprs = this.body.cgen(featEnv, constEnv, varOrEnv, currClsName, beforeBlock);
    console.error("in method", bodyCgenExprs)


    const method = [
      "func",
      signature.cgen.implementation,
      ["type", signature.cgen.signature],
      ["param", "$self", ["ref", "null", `$${currClsName}`]],
      ...signature.arguments.map(
        (arg) => ["param", `$${arg.name}`, ["ref", `$${arg.type}`]],
      ),
      ["result", ["ref", "null", `$${signature.returnType}`]],
      ...bodyCgenExprs,
    ];

    console.error("final method", method);

    return [...beforeBlock, method];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    objEnv.enterNewScope();
    objEnv.add(ASTConst.self, ASTConst.SELF_TYPE);
    this.init.semant(clsTbl, objEnv, featEnv, currClsName);
    objEnv.exitLastScope();

    if (this.init instanceof NoExpr) {
      return;
    }

    if (!clsTbl.isSubclass(this.init.getType()!, this.typeDecl, currClsName)) {
      ErrorLogger.semantError(
        this.location,
        `invalid init expression of type ${this.init.getType()!} ` +
          `is not a subtype of ${this.typeDecl}`,
      );
    }
  }

  cgen(
    featEnv: FeatureEnvironment,
    constEnv: ConstEnv,
    varOrEnv: VarOriginEnvironment,
    currClsName: AbstractSymbol,
    beforeBlock: Sexpr[],
  ): Sexpr[] {
    const nameCgen = `$${this.typeDecl}`;
    if (this.init instanceof NoExpr) {
      return [["ref.null", nameCgen]];
    }

    return this.init.cgen(featEnv, constEnv, varOrEnv, currClsName, beforeBlock);
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

  override semant(
    _clsTbl: ClassTable,
    _objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    _featEnv: FeatureEnvironment,
    _currClsName: AbstractSymbol,
  ): void {
    this.setType(ASTConst.No_type);
  }


  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    throw "Invalid cgen call: this should not happen";
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

  override forEach(callback: ASTVisitorCallback): void {
    callback(this);
    for (const expr of this.expressions) {
      expr.forEach(callback);
    }
  }

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    let returnType = ASTConst.No_type;

    for (const expr of this.expressions) {
      expr.semant(clsTbl, objEnv, featEnv, currClsName);
      returnType = expr.getType()!;
    }

    this.setType(returnType);
  }


  override cgen(
    featEnv: FeatureEnvironment,
    constEnv: ConstEnv,
    varOrEnv: VarOriginEnvironment,
    currClsName: AbstractSymbol,
    beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenExprs = []
    for (const expr of this.expressions) {
      cgenExprs.push(...expr.cgen(featEnv, constEnv, varOrEnv, currClsName, beforeExprBlock));
      cgenExprs.push(["drop"]) // ignore that value
    }

    cgenExprs.pop() // keep last value, remove last drop
    return cgenExprs
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    if (this.name === ASTConst.self) {
      ErrorLogger.semantError(
        this.location,
        `invalid reserved attribute name ${ASTConst.self}`,
      );
      this.setType(ASTConst.err_type);
      return;
    }

    const expectedType = objEnv.get(this.name);
    if (expectedType === undefined) {
      ErrorLogger.semantError(
        this.location,
        `invalid assignment to undefined variable ${this.name}`,
      );
      this.setType(ASTConst.err_type);
      return;
    }

    this.expr.semant(clsTbl, objEnv, featEnv, currClsName);

    if (!clsTbl.isSubclass(this.expr.getType()!, expectedType, currClsName)) {
      ErrorLogger.semantError(
        this.location,
        `invalid assignment expression of type ${this.expr.getType()} ` +
          `on variable of type ${expectedType}`,
      );
      this.setType(ASTConst.err_type);
      return;
    }

    this.setType(this.expr.getType()!);
  }
  override cgen(
    featEnv: FeatureEnvironment,
    constEnv: ConstEnv,
    varOrEnv: VarOriginEnvironment,
    currClsName: AbstractSymbol,
    beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenExpr = this.expr.cgen(featEnv, constEnv, varOrEnv,  currClsName, beforeExprBlock,);

    return [...cgenExpr, ["local.get", "$"]]
  }
}

/**
 * Represents a static method dispatch
 */
export class StaticDispatch extends Expr {
  constructor(
    location: SourceLocation,
    public callerExpr: Expr,
    public typeName: AbstractSymbol,
    public name: AbstractSymbol,
    public args: Expressions,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_static_dispatch\n`;
    result += this.callerExpr.dumpWithTypes(n + 2);
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
    this.callerExpr.forEach(callback);
    for (const arg of this.args) {
      arg.forEach(callback);
    }
  }

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.callerExpr.semant(clsTbl, objEnv, featEnv, currClsName);

    if (this.typeName === ASTConst.SELF_TYPE) {
      ErrorLogger.semantError(
        this.location,
        `invalid static dispatch: cannot dispatch from type ${ASTConst.SELF_TYPE}`,
      );
      this.setType(ASTConst.err_type);
      return;
    }

    if (
      !clsTbl.isSubclass(this.callerExpr.getType()!, this.typeName, currClsName)
    ) {
      ErrorLogger.semantError(
        this.location,
        `invalid static dispatch: caller of type ${this.callerExpr
          .getType()!} ` +
          `is not a subclass of ${this.typeName}`,
      );
    }

    if (!featEnv.classHasMethod(this.typeName, this.name, currClsName)) {
      ErrorLogger.semantError(
        this.location,
        `invalid method call on undefined method ${this.name} ` +
          `for class ${this.typeName}`,
      );
      this.setType(ASTConst.err_type);
      return;
    }

    const signature = featEnv.classMethodSignature(
      this.typeName,
      this.name,
      currClsName,
    );

    this.setType(
      signature.returnType === ASTConst.SELF_TYPE
        ? this.callerExpr.getType()! // notice we use the caller type
        : signature.returnType,
    );

    if (this.args.length !== signature.arguments.length) {
      ErrorLogger.semantError(
        this.location,
        `invalid method ${this.typeName}.${this.name} call: ` +
          `expected ${signature.arguments.length} argument${
            signature.arguments.length == 1 ? "" : "s"
          } ` + `but got ${this.args.length}`,
      );
      return;
    }

    for (let i = 0; i < this.args.length; i++) {
      const argExpr = this.args[i];
      argExpr.semant(clsTbl, objEnv, featEnv, currClsName);

      if (
        !clsTbl.isSubclass(
          argExpr.getType()!,
          signature.arguments[i].type,
          currClsName,
        )
      ) {
        ErrorLogger.semantError(
          argExpr.location,
          `invalid argument #${i}[${signature.arguments[i].name}]: ` +
            `expected expression of type ${signature.arguments[i].type} but ` +
            `got an expression of type ${argExpr.getType()}`,
        );
      }
    }
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenArgs = this.args.flatMap((a) => a.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock));
    const cgenCaller = this.callerExpr.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [...cgenCaller, ...cgenArgs, ["call", `$${this.typeName}.${this.name}`]]
  }
}

/**
 * Represents a dynamic method dispatch
 */
export class DynamicDispatch extends Expr {
  constructor(
    location: SourceLocation,
    public callerExpr: Expr,
    public name: AbstractSymbol,
    public args: Expressions,
  ) {
    super(location);
  }

  dumpWithTypes(n: number): string {
    let result = this.dumpLine(n);
    result += `${Utilities.pad(n)}_dispatch\n`;
    result += this.callerExpr.dumpWithTypes(n + 2);
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
    this.callerExpr.forEach(callback);
    for (const arg of this.args) {
      arg.forEach(callback);
    }
  }

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.callerExpr.semant(clsTbl, objEnv, featEnv, currClsName);
    if (
      !featEnv.classHasMethod(
        this.callerExpr.getType()!,
        this.name,
        currClsName,
      )
    ) {
      ErrorLogger.semantError(
        this.location,
        `invalid method call on undefined method ${this.name} ` +
          `for class ${this.callerExpr.getType()}`,
      );
      this.setType(ASTConst.err_type);
      return;
    }

    const signature = featEnv.classMethodSignature(
      this.callerExpr.getType()!,
      this.name,
      currClsName,
    );

    this.setType(
      signature.returnType === ASTConst.SELF_TYPE
        ? this.callerExpr.getType()!
        : signature.returnType,
    );

    if (this.args.length !== signature.arguments.length) {
      ErrorLogger.semantError(
        this.location,
        `invalid method ${this.callerExpr.getType()}.${this.name} call: ` +
          `expected ${signature.arguments.length} argument${
            signature.arguments.length == 1 ? "" : "s"
          } ` + `but got ${this.args.length}`,
      );
      return;
    }

    for (let i = 0; i < this.args.length; i++) {
      const argExpr = this.args[i];
      argExpr.semant(clsTbl, objEnv, featEnv, currClsName);

      if (
        !clsTbl.isSubclass(
          argExpr.getType()!,
          signature.arguments[i].type,
          currClsName,
        )
      ) {
        ErrorLogger.semantError(
          argExpr.location,
          `invalid argument #${i}[${signature.arguments[i].name}]: ` +
            `expected expression of type ${signature.arguments[i].type} but ` +
            `got an expression of type ${argExpr.getType()}`,
        );
      }
    }
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenArgs = this.args.flatMap((a) => a.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock));
    const cgenCaller = this.callerExpr.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [...cgenCaller, ...cgenArgs, ["call", `$${this.callerExpr.getType()}.${this.name}`]]
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.predicate.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.predicate.getType() !== ASTConst.Bool) {
      ErrorLogger.semantError(
        this.location,
        `predicate should be of type ${ASTConst.Bool} but there ` +
          `is an expression of type ${this.predicate.getType()} instead`,
      );
    }

    this.thenExpr.semant(clsTbl, objEnv, featEnv, currClsName);
    this.elseExpr.semant(clsTbl, objEnv, featEnv, currClsName);

    this.setType(
      clsTbl.leastUpperBound(
        this.thenExpr.getType()!,
        this.elseExpr.getType()!,
        currClsName,
      ),
    );
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const thenBlock = this.thenExpr.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const elseBlock = this.elseExpr.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [
      ...this.predicate.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock),
      ["if", ["result", "i32"], ["local.get", "$"], ["then", ...thenBlock], ["else", ...elseBlock], ["end"]],
    ]
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.predicate.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.predicate.getType() !== ASTConst.Bool) {
      ErrorLogger.semantError(
        this.location,
        `predicate should be of type ${ASTConst.Bool} but there ` +
          `is an expression of type ${this.predicate.getType()} instead`,
      );
    }

    this.body.semant(clsTbl, objEnv, featEnv, currClsName);
    this.setType(ASTConst.Object_);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const bodyBlock = this.body.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const loopLabel = generateLabel();
    const endLabel = generateLabel();
    return [
      ["loop", loopLabel],
      ...this.predicate.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock),
      ["if", ["local.get", "$t0"], ["then", loopLabel], ["else", endLabel]],
      ...bodyBlock,
      ["br", loopLabel],
      ["label", endLabel],
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.expr.semant(clsTbl, objEnv, featEnv, currClsName);

    let first = true;
    let returnType = ASTConst.No_type;
    const seenTypes = new Set<AbstractSymbol>();

    for (const branch of this.cases) {
      if (seenTypes.has(branch.typeDecl)) {
        ErrorLogger.semantError(
          branch.location,
          `duplicate type case check for type ${branch.typeDecl}`,
        );
        continue;
      }

      seenTypes.add(branch.typeDecl);

      objEnv.enterNewScope();
      objEnv.add(branch.name, branch.typeDecl);

      branch.expr.semant(clsTbl, objEnv, featEnv, currClsName);

      objEnv.exitLastScope();

      if (first) {
        first = false;
        returnType = branch.expr.getType()!;
      } else {
        returnType = clsTbl.leastUpperBound(
          returnType,
          branch.expr.getType()!,
          currClsName,
        );
      }
    }

    this.setType(returnType);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    throw "this should not happen";
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    if (this.identifier === ASTConst.self) {
      ErrorLogger.semantError(
        this.location,
        `invalid reserved variable name in let: ${ASTConst.self}`,
      );
      this.setType(ASTConst.err_type);
      return;
    }

    this.init.semant(clsTbl, objEnv, featEnv, currClsName);
    if (
      !(this.init instanceof NoExpr ||
        clsTbl.isSubclass(this.init.getType()!, this.typeDecl, currClsName))
    ) {
      ErrorLogger.semantError(
        this.location,
        `invalid initialization expression of type ${this.init.getType()} ` +
          `for variable ${this.identifier} of type ${this.typeDecl}`,
      );

      this.setType(ASTConst.err_type);
      return;
    }

    objEnv.enterNewScope();
    objEnv.add(this.identifier, this.typeDecl);

    this.body.semant(clsTbl, objEnv, featEnv, currClsName);

    objEnv.exitLastScope();

    this.setType(this.body.getType()!);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenInit = this.init.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const cgenBody = this.body.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [...cgenInit, ...cgenBody];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.e1.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e1.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the left ` +
          `hand side of addition but found expression of type ${this.e1.getType()} instead`,
      );
    }

    this.e2.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e2.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the right ` +
          `hand side of addition but found expression of type ${this.e2.getType()} instead`,
      );
    }

    this.setType(ASTConst.Int);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenE1 = this.e1.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const cgenE2 = this.e2.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [...cgenE1,
      ["call", "$Int.helper.toI32"],
      ...cgenE2, 
      ["call", "$Int.helper.toI32"],
      ["i32.add"]
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.e1.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e1.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the left ` +
          `hand side of subtraction but found expression of type ${this.e1.getType()} instead`,
      );
    }

    this.e2.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e2.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the right ` +
          `hand side of subtraction but found expression of type ${this.e2.getType()} instead`,
      );
    }

    this.setType(ASTConst.Int);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenE1 = this.e1.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const cgenE2 = this.e2.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [
      ...cgenE1,
      ["call", "$Int.helper.toI32"],
      ...cgenE2,
      ["call", "$Int.helper.toI32"],
      ["i32.sub"]
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.e1.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e1.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the left ` +
          `hand side of multiplication but found expression of type ${this.e1.getType()} instead`,
      );
    }

    this.e2.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e2.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the right ` +
          `hand side of multiplication but found expression of type ${this.e2.getType()} instead`,
      );
    }

    this.setType(ASTConst.Int);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenE1 = this.e1.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const cgenE2 = this.e2.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [
      ...cgenE1,
      ["call", "$Int.helper.toI32"],
      ...cgenE2,
      ["call", "$Int.helper.toI32"],
      ["i32.mul"]
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.e1.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e1.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the left ` +
          `hand side of division but found expression of type ${this.e1.getType()} instead`,
      );
    }

    this.e2.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e2.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the right ` +
          `hand side of division but found expression of type ${this.e2.getType()} instead`,
      );
    }

    this.setType(ASTConst.Int);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenE1 = this.e1.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const cgenE2 = this.e2.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [
      ...cgenE1,
      ["call", "$Int.helper.toI32"],
      ...cgenE2,
      ["call", "$Int.helper.toI32"],
      ["i32.div_s"]
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.expr.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.expr.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on negation ` +
          `but found expression of type ${this.expr.getType()} instead`,
      );
    }

    this.setType(ASTConst.Int);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenExpr = this.expr.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [
      ...cgenExpr,
      ["call", "$Int.helper.toI32"],
      ["i32.const", "0"],
      ["i32.sub"]
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.e1.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e1.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the left ` +
          `hand side of less than but found expression of type ${this.e1.getType()} instead`,
      );
    }

    this.e2.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e2.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the right ` +
          `hand side of less than but found expression of type ${this.e2.getType()} instead`,
      );
    }

    this.setType(ASTConst.Bool);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenE1 = this.e1.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const cgenE2 = this.e2.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [
      ...cgenE1,
      ["call", "$Int.helper.toI32"],
      ...cgenE2,
      ["call", "$Int.helper.toI32"],
      ["i32.lt_s"],
      ["call", "$Bool.helper.fromI32"]
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.e1.semant(clsTbl, objEnv, featEnv, currClsName);
    this.e2.semant(clsTbl, objEnv, featEnv, currClsName);
    if (
      (this.e1.getType() === ASTConst.Int ||
        this.e1.getType() === ASTConst.Str ||
        this.e1.getType() === ASTConst.Bool ||
        this.e2.getType() === ASTConst.Int ||
        this.e2.getType() === ASTConst.Str ||
        this.e2.getType() === ASTConst.Bool) &&
      this.e1.getType() !== this.e2.getType()
    ) {
      ErrorLogger.semantError(
        this.location,
        `invalid equality comparison left hand side expresssion of type ` +
          `${this.e1.getType()} cannot be compared with expression of type ${this.e2.getType()}`,
      );
    }

    this.setType(ASTConst.Bool);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    throw "this should not happen";
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.e1.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e1.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the left ` +
          `hand side of less than or equal but found expression of type ${this.e1.getType()} instead`,
      );
    }

    this.e2.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.e2.getType() !== ASTConst.Int) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Int} on the right ` +
          `hand side of less than or equal but found expression of type ${this.e2.getType()} instead`,
      );
    }

    this.setType(ASTConst.Bool);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenE1 = this.e1.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    const cgenE2 = this.e2.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [
      ...cgenE1,
      ["call", "$Int.helper.toI32"],
      ...cgenE2,
      ["call", "$Int.helper.toI32"],
      ["i32.le_s"],
      ["call", "$Bool.helper.fromI32"]
    ];
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.expr.semant(clsTbl, objEnv, featEnv, currClsName);
    if (this.expr.getType() !== ASTConst.Bool) {
      ErrorLogger.semantError(
        this.location,
        `expected expression of type ${ASTConst.Bool} on not ` +
          `but found expression of type ${this.expr.getType()} instead`,
      );
    }

    this.setType(ASTConst.Bool);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const cgenExpr = this.expr.cgen(_featEnv, _constEnv, _varOrEnv, _currClsName, _beforeExprBlock);
    return [
      ...cgenExpr,
      ["call", "$Int.helper.toI32"],
      ["i32.eqz"],
      ["call", "$Bool.helper.fromI32"]
    ];
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

  override semant(
    _clsTbl: ClassTable,
    _objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    _featEnv: FeatureEnvironment,
    _currClsName: AbstractSymbol,
  ): void {
    this.setType(ASTConst.Int);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const constantName = constEnv.intConstants.get(this.token)!
    return [["global.get", constantName]]
  }
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

  override semant(
    _clsTbl: ClassTable,
    _objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    _featEnv: FeatureEnvironment,
    _currClsName: AbstractSymbol,
  ): void {
    this.setType(ASTConst.Bool);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    return [["i32.const", this.value ? "1" : "0"]]
  }
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

  override semant(
    _clsTbl: ClassTable,
    _objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    _featEnv: FeatureEnvironment,
    _currClsName: AbstractSymbol,
  ): void {
    this.setType(ASTConst.Str);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const constantName = constEnv.strConstants.get(this.token)!
    return [["global.get", constantName]]
  }
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

  override semant(
    clsTbl: ClassTable,
    _objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    _featEnv: FeatureEnvironment,
    _currClsName: AbstractSymbol,
  ): void {
    if (
      !(this.typeName === ASTConst.SELF_TYPE ||
        clsTbl.classExists(this.typeName))
    ) {
      ErrorLogger.semantError(
        this.location,
        `cannot create an object of undefined type ${this.typeName}`,
      );
      this.setType(ASTConst.err_type);
      return;
    }

    this.setType(this.typeName);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    throw "this should not happen";
  }
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

  override semant(
    clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    featEnv: FeatureEnvironment,
    currClsName: AbstractSymbol,
  ): void {
    this.expr.semant(clsTbl, objEnv, featEnv, currClsName);
    this.setType(ASTConst.Bool);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    _varOrEnv: VarOriginEnvironment,
    _currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    throw "this should not happen";
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

  override semant(
    _clsTbl: ClassTable,
    objEnv: ScopedEnvironment<AbstractSymbol, AbstractSymbol>,
    _featEnv: FeatureEnvironment,
    _currClsName: AbstractSymbol,
  ): void {
    const typeFromEnv = objEnv.get(this.name);
    if (typeFromEnv === undefined) {
      ErrorLogger.semantError(this.location, `undefined variable ${this.name}`);
      this.setType(ASTConst.err_type);
      return;
    }

    this.setType(typeFromEnv);
  }
  override cgen(
    _featEnv: FeatureEnvironment,
    _constEnv: ConstEnv,
    varOrEnv: VarOriginEnvironment,
    currClsName: AbstractSymbol,
    _beforeExprBlock: Sexpr[],
  ): Sexpr[] {
    const origin = varOrEnv.get(this.name)
    if (origin === VarOrigin.CLASS) {
      return [
        ["local.get", "$self"],
        ["struct.get", `$${currClsName}`, `$${this.name}`]
      ];
    }
    return [["local.get", `$${this.name}`]];
  }
}
