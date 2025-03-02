import { AbstractSymbol } from "./abstractTable.ts";
import {
  Attribute,
  type Classes,
  ClassStatement,
  Formal,
  Method,
  NoExpr,
} from "./ast.ts";
import { SourceLocation } from "./util.ts";
import * as ASTConst from "./astConstants.ts";
import { ErrorLogger } from "./errorLogger.ts";

export class ClassTable {
  private childToParent: Map<AbstractSymbol, AbstractSymbol>;
  private nameToClassNode: Map<AbstractSymbol, ClassStatement>;

  constructor(clss: Classes) {
    this.childToParent = new Map();
    this.nameToClassNode = new Map();

    this.installBasicClasses();

    for (const cls of clss) {
      this.addClass(cls);
    }

    this.checkValidInheritance();
    if (ErrorLogger.anyError()) return;

    this.checkIsTree();
    if (ErrorLogger.anyError()) return;
  }

  private addClass(cls: ClassStatement): void {
    if (this.classExists(cls.name)) {
      ErrorLogger.semantError(
        cls.location,
        `Class ${cls.name.getString()} is already defined`,
      );
      return;
    }

    if (cls.name === ASTConst.SELF_TYPE) {
      ErrorLogger.semantError(
        cls.location,
        `"${ASTConst.SELF_TYPE.getString()}" cannot be used as a class name`,
      );
      return;
    }

    this.childToParent.set(cls.name, cls.parentName);
    this.nameToClassNode.set(cls.name, cls);
  }

  public classExists(clsName: AbstractSymbol): boolean {
    return this.childToParent.has(clsName);
  }

  private isSubclassNoSelfType(
    child: AbstractSymbol,
    parent: AbstractSymbol,
  ): boolean {
    let currCls = child;

    while (currCls !== ASTConst.Object_ && currCls !== parent) {
      currCls = this.parentCls(currCls);
    }

    return currCls === parent;
  }

  public isSubclass(
    child: AbstractSymbol,
    parent: AbstractSymbol,
    currCls: AbstractSymbol,
  ): boolean {
    if (child === ASTConst.SELF_TYPE && parent === ASTConst.SELF_TYPE) {
      return true;
    }

    if (parent === ASTConst.SELF_TYPE) return false;

    if (child === ASTConst.SELF_TYPE) {
      return this.isSubclassNoSelfType(currCls, parent);
    }

    return this.isSubclassNoSelfType(child, parent);
  }

  private leastUpperBoundNoSelfType(
    clsA: AbstractSymbol,
    clsB: AbstractSymbol,
  ): AbstractSymbol {
    let currBSuperCls = clsB;

    while (!this.isSubclassNoSelfType(clsA, currBSuperCls)) {
      currBSuperCls = this.parentCls(currBSuperCls);
    }

    return currBSuperCls;
  }

  public leastUpperBound(
    clsA: AbstractSymbol,
    clsB: AbstractSymbol,
    currCls: AbstractSymbol,
  ): AbstractSymbol {
    if (clsA === ASTConst.SELF_TYPE && clsB === ASTConst.SELF_TYPE) {
      return ASTConst.SELF_TYPE;
    }

    if (clsA === ASTConst.SELF_TYPE) {
      return this.leastUpperBoundNoSelfType(currCls, clsB);
    }
    if (clsB === ASTConst.SELF_TYPE) {
      return this.leastUpperBoundNoSelfType(currCls, clsA);
    }

    return this.leastUpperBoundNoSelfType(clsA, clsB);
  }

  private checkValidInheritance(): void {
    for (const [child, parent] of this.childToParent.entries()) {
      if (parent === ASTConst.Bool) {
        ErrorLogger.semantError(
          this.classNode(child).location,
          "cannot inherit from Bool",
        );
        continue;
      }

      if (parent === ASTConst.Int) {
        ErrorLogger.semantError(
          this.classNode(child).location,
          "cannot inherit from Int",
        );
        continue;
      }

      if (parent === ASTConst.Str) {
        ErrorLogger.semantError(
          this.classNode(child).location,
          "cannot inherit from Str",
        );
        continue;
      }

      if (parent === ASTConst.SELF_TYPE) {
        ErrorLogger.semantError(
          this.classNode(child).location,
          "cannot inherit from SELF_TYPE",
        );
        continue;
      }

      if (!this.classExists(parent)) {
        ErrorLogger.semantError(
          this.classNode(child).location,
          `cannot inherit from undefined class ${parent.getString()}`,
        );
        continue;
      }
    }
  }

  private checkIsTree(): void {
    const seenClasses = new Set<AbstractSymbol>();

    for (const cls of this.childToParent.keys()) {
      seenClasses.clear();

      let currCls = cls;
      while (currCls != ASTConst.Object_) {
        seenClasses.add(currCls);
        currCls = this.parentCls(currCls);

        if (seenClasses.has(currCls)) {
          ErrorLogger.semantError(
            this.classNode(cls).location,
            `class ${cls.getString()}: cyclic class inheritance with class (${currCls.getString()})`,
          );
          break;
        }
      }
    }
  }

  private parentCls(clsName: AbstractSymbol): AbstractSymbol {
    const parent = this.childToParent.get(clsName);
    if (parent !== undefined) return parent;
    throw `class with name ${clsName} does not exists`;
  }

  public classNode(clsName: AbstractSymbol): ClassStatement {
    const node = this.nameToClassNode.get(clsName);
    if (node !== undefined) return node;

    throw `class with name ${clsName} does not exists`;
  }

  private installBasicClasses(): void {
    const loc = new SourceLocation("<basic classes>", 0, 0);

    const ObjCls = new ClassStatement(
      loc,
      ASTConst.Object_,
      ASTConst.No_class,
      [
        new Method(
          loc,
          ASTConst.cool_abort,
          [],
          ASTConst.Object_,
          new NoExpr(loc),
        ),
        new Method(loc, ASTConst.type_name, [], ASTConst.Str, new NoExpr(loc)),
        new Method(loc, ASTConst.copy, [], ASTConst.SELF_TYPE, new NoExpr(loc)),
      ],
    );

    const IOCls = new ClassStatement(
      loc,
      ASTConst.IO,
      ASTConst.Object_,
      [
        new Method(
          loc,
          ASTConst.out_string,
          [new Formal(loc, ASTConst.arg, ASTConst.Str)],
          ASTConst.SELF_TYPE,
          new NoExpr(loc),
        ),
        new Method(
          loc,
          ASTConst.out_int,
          [new Formal(loc, ASTConst.arg, ASTConst.Int)],
          ASTConst.SELF_TYPE,
          new NoExpr(loc),
        ),
        new Method(loc, ASTConst.in_string, [], ASTConst.Str, new NoExpr(loc)),
        new Method(loc, ASTConst.in_int, [], ASTConst.Int, new NoExpr(loc)),
      ],
    );

    const IntCls = new ClassStatement(
      loc,
      ASTConst.Int,
      ASTConst.Object_,
      [
        new Attribute(loc, ASTConst.val, ASTConst.prim_slot, new NoExpr(loc)),
      ],
    );

    const BoolCls = new ClassStatement(
      loc,
      ASTConst.Bool,
      ASTConst.Object_,
      [
        new Attribute(loc, ASTConst.val, ASTConst.prim_slot, new NoExpr(loc)),
      ],
    );

    const StrCls = new ClassStatement(
      loc,
      ASTConst.Str,
      ASTConst.Object_,
      [
        new Attribute(loc, ASTConst.val, ASTConst.Int, new NoExpr(loc)),
        new Attribute(
          loc,
          ASTConst.str_field,
          ASTConst.prim_slot,
          new NoExpr(loc),
        ),
        new Method(loc, ASTConst.length, [], ASTConst.Int, new NoExpr(loc)),
        new Method(
          loc,
          ASTConst.concat,
          [new Formal(loc, ASTConst.arg, ASTConst.Str)],
          ASTConst.Str,
          new NoExpr(loc),
        ),
        new Method(
          loc,
          ASTConst.substr,
          [
            new Formal(loc, ASTConst.arg, ASTConst.Int),
            new Formal(loc, ASTConst.arg2, ASTConst.Int),
          ],
          ASTConst.Str,
          new NoExpr(loc),
        ),
      ],
    );

    this.addClass(ObjCls);
    this.addClass(IOCls);
    this.addClass(IntCls);
    this.addClass(BoolCls);
    this.addClass(StrCls);
  }
}