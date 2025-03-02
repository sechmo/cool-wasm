import { AbstractSymbol } from "./abstractTable.ts";
import { Attribute, ClassStatement, Method } from "./ast.ts";
import { ClassTable } from "./classTable.ts";
import * as ASTConst from "./astConstants.ts";
import { ErrorLogger } from "./errorLogger.ts";
import { ScopedEnvironment } from "./scopedEnvironment.ts";

export type MethodSignature = {
  arguments: Array<{ type: AbstractSymbol; name: AbstractSymbol }>;
  returnType: AbstractSymbol;
};

type ClassSignatures = Map<AbstractSymbol, MethodSignature>;
type ClassMethodNodes = Map<AbstractSymbol, Method>;
type ClassAttributeTypes = Map<AbstractSymbol, AbstractSymbol>;
type ClassAttributeNodes = Map<AbstractSymbol, Attribute>;

export class FeatureEnvironment {
  private methodSignatures: Map<AbstractSymbol, ClassSignatures>;
  private methodNodes: Map<AbstractSymbol, ClassMethodNodes>;

  private attributeTypes: Map<AbstractSymbol, ClassAttributeTypes>;
  private attributeNodes: Map<AbstractSymbol, ClassAttributeNodes>;

  constructor(private clsTbl: ClassTable) {
    this.methodSignatures = new Map();
    this.methodNodes = new Map();

    this.attributeTypes = new Map();
    this.attributeNodes = new Map();

    for (const cls of this.clsTbl.allClassNodes()) {
      this.addClass(cls);
    }
  }

  private addClass(cls: ClassStatement): void {
    if (cls.name !== ASTConst.Object_) {
      // fist add the parents recursively
      if (!this.methodSignatures.has(cls.parentName)) {
        this.addClass(this.clsTbl.classNode(cls.parentName));
      }
    }

    // recursion base case (already processed)
    if (this.methodSignatures.has(cls.name)) return;

    const signatures: ClassSignatures = new Map();
    const attributeTypes: ClassAttributeTypes = new Map();

    this.methodSignatures.set(cls.name, signatures);
    this.attributeTypes.set(cls.name, attributeTypes);

    for (const feat of cls.features) {
      if (feat instanceof Attribute) {
        this.addAttribute(feat, attributeTypes, cls.parentName);
      } else if (feat instanceof Method) {
        this.addMethod(feat, signatures, cls.parentName);
      }
    }

    if (cls.name === ASTConst.Object_) {
      return;
    }

    // propagate inherited attributes
    for (
      const [attrName, attrType] of this.attributeTypes.get(cls.parentName)!
        .entries()
    ) {
      attributeTypes.set(attrName, attrType); // cannot be overrided, always ingerited directly
    }

    // propagate inherited methods
    for (
      const [methName, methSig] of this.methodSignatures.get(cls.parentName)!
        .entries()
    ) {
      if (signatures.has(methName)) continue; // do not propagate if overrided

      signatures.set(methName, methSig);
    }
  }

  private addAttribute(
    attr: Attribute,
    attrTypes: ClassAttributeTypes,
    parent: AbstractSymbol,
  ): void {
    // check attribute is not an override from parent class
    if (
      parent != ASTConst.No_class &&
      this.attributeTypes.get(parent)?.has(attr.name)
    ) {
      ErrorLogger.semantError(
        attr.location,
        `cannot override attribute ${attr.name.getString()} from parent class ${parent.getString()}`,
      );
      return;
    }

    if (attr.name === ASTConst.self) {
      ErrorLogger.semantError(
        attr.location,
        `invalid attribute name ${ASTConst.self.getString()}`,
      );
      return;
    }

    if (attrTypes.has(attr.name)) {
      ErrorLogger.semantError(
        attr.location,
        `duplicate attribute name ${attr.name.getString()}`,
      );
      return;
    }

    attrTypes.set(attr.name, attr.typeDecl);
  }

  private addMethod(
    meth: Method,
    signatures: ClassSignatures,
    parent: AbstractSymbol,
  ): void {
    const methArgs: MethodSignature["arguments"] = [];
    const seenFormalNames = new Set<AbstractSymbol>();

    if (signatures.has(meth.name)) {
      ErrorLogger.semantError(
        meth.location,
        `duplicated method ${meth.name.getString()}`,
      );
      return;
    }

    for (const formal of meth.formals) {
      if (formal.typeDecl === ASTConst.SELF_TYPE) {
        ErrorLogger.semantError(
          formal.location,
          `argument ${formal.name.getString()} is declared as invalid argument type ${ASTConst.SELF_TYPE.getString()}`,
        );
        continue;
      }

      if (!this.clsTbl.classExists(formal.typeDecl)) {
        ErrorLogger.semantError(
          formal.location,
          `argument ${formal.name.getString()} is declared with undefined argument type ${formal.typeDecl.getString()}`,
        );
        continue;
      }

      if (formal.name === ASTConst.self) {
        ErrorLogger.semantError(
          formal.location,
          `invalid argument name ${formal.name.getString()}`,
        );
        continue;
      }

      if (seenFormalNames.has(formal.name)) {
        ErrorLogger.semantError(
          formal.location,
          `duplicated argument name ${formal.name.getString()}`,
        );
        continue;
      }

      seenFormalNames.add(formal.name);

      methArgs.push({ type: formal.typeDecl, name: formal.name });
    }

    if (
      !this.clsTbl.classExists(meth.returnType) &&
      meth.returnType !== ASTConst.SELF_TYPE
    ) {
      ErrorLogger.semantError(
        meth.location,
        `undefined return type ${meth.returnType.getString()}`,
      );

      return;
    }

    const methSig = {
      arguments: methArgs,
      returnType: meth.returnType,
    };

    if (this.checkMethodOverride(meth, methSig, parent)) {
      signatures.set(meth.name, methSig);
    }
  }

  private checkMethodOverride(
    meth: Method,
    sig: MethodSignature,
    parent: AbstractSymbol,
  ): boolean {
    if (!this.methodSignatures.get(parent)?.has(meth.name)) {
      // not an override
      return true;
    }

    const parentSig = this.methodSignatures.get(parent)?.get(
      meth.name,
    ) as MethodSignature;

    // check signatures are equal

    if (sig.arguments.length != parentSig.arguments.length) {
      ErrorLogger.semantError(
        meth.location,
        `invalid method override, method ${meth.name.getString} signature in parent class ` +
          `${parent.getString()} has ${parentSig.arguments.length} arguments but only ` +
          `${sig.arguments.length} found`,
      );
      return false;
    }

    let anyErr = false;
    for (let i = 0; i < sig.arguments.length; i++) {
      const arg = sig.arguments[i];
      const parentArg = parentSig.arguments[i];

      if (arg.type !== parentArg.type) {
        ErrorLogger.semantError(
          meth.location,
          `invalid method override, arg #${i}[${parentArg.name.getString()}] of parent class ` +
            `${parent.getString()} expects type ${parentArg.type.getString()} while ` +
            `arg#${i}[${arg.name.getString}] has type ${arg.type.getString()}`,
        );

        anyErr = true;
      }
    }

    return !anyErr;
  }

  public classAttributeEnvironment(
    clsName: AbstractSymbol,
  ): ScopedEnvironment<AbstractSymbol, AbstractSymbol> {
    if (!this.attributeTypes.has(clsName)) {
      throw `invalid class attribute environment retrieval: class ${clsName} is not installed`;
    }

    const attrEnv = new ScopedEnvironment<AbstractSymbol, AbstractSymbol>();
    attrEnv.enterNewScope();

    for (
      const [attrName, attrType] of this.attributeTypes.get(clsName)!.entries()
    ) {
      attrEnv.add(attrName, attrType);
    }

    return attrEnv;
  }

  public classHasMethod(
    clsName: AbstractSymbol,
    methName: AbstractSymbol,
    currClsName: AbstractSymbol,
  ): boolean {
    if (clsName === ASTConst.SELF_TYPE) {
      return this.classHasMethod(currClsName, methName, currClsName);
    }

    if (!this.methodSignatures.has(clsName)) {
      throw `invalid classHasMethod check: class ${clsName} is not installed`;
    }

    return this.methodSignatures.get(clsName)!.has(methName);
  }

  public classGetMethodSignature(
    clsName: AbstractSymbol,
    methName: AbstractSymbol,
    currClsName: AbstractSymbol,
  ): MethodSignature {
    if (clsName === ASTConst.SELF_TYPE) {
      return this.classGetMethodSignature(currClsName, methName, currClsName);
    }

    return this.methodSignatures.get(clsName)!.get(methName)!;
  }

}
