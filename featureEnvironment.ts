import { AbstractSymbol, AbstractTable } from "./abstractTable.ts";
import { Attribute, ClassStatement, Method } from "./ast.ts";
import { ClassTable } from "./classTable.ts";
import * as ASTConst from "./astConstants.ts";
import { ErrorLogger } from "./errorLogger.ts";
import { ScopedEnvironment } from "./scopedEnvironment.ts";
import { ConstantGenerator, Sexpr } from "./cgen/cgenUtil.ts";

enum MethodOrigin {
  NEW,
  INHERITED,
  OVERRIDEN,
}
export type MethodSignature = {
  arguments: Array<{ type: AbstractSymbol; name: AbstractSymbol }>;
  returnType: AbstractSymbol;
  origin: MethodOrigin;
  id: number;
  cgen: {
    signature: string;
    implementation: string;
    genericCaller: string;
  };
};

export type AttributeType = {
  type: AbstractSymbol;
  id: number;
};

type ClassSignatures = Map<AbstractSymbol, MethodSignature>;
type ClassMethodNodes = Map<AbstractSymbol, Method>;
type ClassAttributeTypes = Map<AbstractSymbol, AttributeType>;
type ClassAttributeNodes = Map<AbstractSymbol, Attribute>;

export class FeatureEnvironment {
  private methodSignatures: Map<AbstractSymbol, ClassSignatures>;
  private methodNodes: Map<AbstractSymbol, ClassMethodNodes>;

  private attributeTypes: Map<AbstractSymbol, ClassAttributeTypes>;
  private attributeNodes: Map<AbstractSymbol, ClassAttributeNodes>;

  private methodCount: number = 0;
  private attributeCount: number = 0;

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
        this.addMethod(feat, signatures, cls.name, cls.parentName);
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

      const childSig: MethodSignature = {
        arguments: methSig.arguments,
        returnType: methSig.returnType,
        origin: MethodOrigin.INHERITED,
        cgen: {
          signature: methSig.cgen.signature,
          implementation: methSig.cgen.implementation,
          genericCaller: methSig.cgen.genericCaller,
        },
        id: methSig.id,
      };

      signatures.set(methName, childSig);
    }
  }

  private attributeCounter(): number {
    return this.attributeCount++;
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

    attrTypes.set(attr.name, {
      type: attr.typeDecl,
      id: this.attributeCounter(),
    });
  }

  private methodCounter(): number {
    return this.methodCount++;
  }

  private addMethod(
    meth: Method,
    signatures: ClassSignatures,
    currCls: AbstractSymbol,
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

    // const methSig = {
    //   arguments: methArgs,
    //   returnType: meth.returnType,
    // };

    const [valid, signature] = this.checkMethodOverride(
      meth,
      methArgs,
      meth.returnType,
      currCls,
      parent,
    );

    // if (this.checkMethodOverride(meth, methSig, parent)) {
    if (valid) {
      signatures.set(meth.name, signature);
    }
  }

  private checkMethodOverride(
    meth: Method,
    args: MethodSignature["arguments"],
    retType: AbstractSymbol,
    currCls: AbstractSymbol,
    parent: AbstractSymbol,
  ): [boolean, MethodSignature] {
    if (!this.methodSignatures.get(parent)?.has(meth.name)) {
      const sig: MethodSignature = {
        arguments: args,
        returnType: retType,
        origin: MethodOrigin.NEW,
        id: this.methodCounter(),
        cgen: {
          signature: `$${currCls}.${meth.name}.signature`,
          implementation: `$${currCls}.${meth.name}.implementation`,
          genericCaller: `$${currCls}.${meth.name}.generic`,
        },
      };
      // not an override
      return [true, sig];
    }

    // its an override

    const parentSig = this.methodSignatures.get(parent)?.get(
      meth.name,
    ) as MethodSignature;

    const sig: MethodSignature = {
      arguments: args,
      returnType: retType,
      origin: MethodOrigin.OVERRIDEN,
      id: parentSig.id,
      cgen: {
        signature: parentSig.cgen.signature,
        implementation: `$${currCls}.${meth.name}.implementation`,
        genericCaller: parentSig.cgen.genericCaller,
      },
    };

    // check signatures are equal

    if (sig.arguments.length != parentSig.arguments.length) {
      ErrorLogger.semantError(
        meth.location,
        `invalid method override, method ${meth.name.getString} signature in parent class ` +
          `${parent.getString()} has ${parentSig.arguments.length} arguments but only ` +
          `${sig.arguments.length} found`,
      );
      return [false, sig];
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

    return [!anyErr, sig];
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
      attrEnv.add(attrName, attrType.type);
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

  public cgenTypeDefs(): { typeDefBlock: Sexpr; programBlock: Sexpr } {
    const typeDefBlock: Sexpr = ["rec"];
    const programBlock: Sexpr = [];
    const priority = (c: AbstractSymbol) => {
      if (c === ASTConst.Object_) return 0;
      if (c === ASTConst.Str) return 1; // needed so the vtabl for string is generated before
      if (c === ASTConst.IO) return 2;
      if (c === ASTConst.Int) return 3;
      if (c === ASTConst.Bool) return 4;

      return 5
    }
    const clsNames = [...this.clsTbl.allClassNodes()].map(c => c.name).toSorted((cls0, cls1) => priority(cls0) - priority(cls1))

    for (const cls of clsNames) {
      this.cgenClass(cls, typeDefBlock, programBlock);
    }

    programBlock.push([
      "func",
      "$Object.abort.implementation",
      ["type", "$Object.abort.signature"],
      ["param", "$o", ["ref", "$Object"]],
      ["result", ["ref", "$Object"]],
      ["i32.const", "-1"],
      ["throw", "$abortTag"],
    ]);

    programBlock.push([
      "func",
      "$String.length.implementation",
      ["type", "$String.length.signature"],
      ["param", "$s", ["ref", "$String"]],
      ["result", ["ref", "$Int"]],
      ["global.get", "$Int.vtable.canon",],
      ["local.get", "$s"],
      ["struct.get", "$String", "$chars"],
      ["array.len"],
      ["struct.new", "$Int"],
    ]);

    programBlock.push([
      "func",
      "$String.substr.implementation",
      ["type", "$String.substr.signature"],
      ["param", "$s", ["ref", "$String"]],
      ["param", "$aInt", ["ref", "$Int"]],
      ["param", "$bInt", ["ref", "$Int"]],
      ["result", ["ref", "$String"]],

      ["local", "$diff", "i32"],
      ["local", "$res", ["ref", "$charsArr"]],

      ["local.get", "$bInt"],
      ["struct.get", "$Int", "$_val"],
      ["local.get", "$aInt"],
      ["struct.get", "$Int", "$_val"],
      ["i32.sub"],
      ["i32.const", "1"],
      ["i32.add"],
      ["local.tee", "$diff"],
      ["i32.const", "0"],
      ["i32.lt_s"],
      ["if", ["then", ["i32.const", "0"], ["local.set", "$diff"]]],
      ["local.get", "$diff"],
      ["array.new_default", "$charsArr"],

      ["local.tee", "$res"], // destination
      ["i32.const", "0"], // destination offset

      ["local.get", "$s"],
      ["struct.get", "$String", "$chars"], // origin
      ["local.get", "$aInt"],
      ["struct.get", "$Int", "$_val"], // origin offset

      ["local.get", "$diff"], // size
      ["array.copy", "$charsArr", "$charsArr"],
      ["global.get", "$String.vtable.canon",],
      ["local.get", "$res"],
      ["struct.new", "$String"],
    ]);

    programBlock.push([
      "func",
      "$String.concat.implementation",
      ["type", "$String.concat.signature"],
      ["param", "$s0", ["ref", "$String"]],
      ["param", "$s1", ["ref", "$String"]],
      ["result", ["ref", "$String"]],
      ["unreachable"],
    ]);

    programBlock.push([
      "func",
      "$IO.out_string.implementation",
      ["type", "$IO.out_string.signature"],
      ["param", ["ref", "$IO"]],
      ["param", "$arg", ["ref", "$String"]],
      ["result", ["ref", "$IO"]],
      ["unreachable"],
    ]);

    programBlock.push([
      "func",
      "$IO.out_int.implementation",
      ["type", "$IO.out_int.signature"],
      ["param", ["ref", "$IO"]],
      ["param", "$arg", ["ref", "$Int"]],
      ["result", ["ref", "$IO"]],
      ["unreachable"],
    ]);


    programBlock.push([
      "func",
      "$IO.in_string.implementation",
      ["type", "$IO.in_string.signature"],
      ["param", ["ref", "$IO"]],
      ["result", ["ref", "$String"]],
      ["unreachable"],
    ]);


    programBlock.push([
      "func",
      "$IO.in_int.implementation",
      ["type", "$IO.in_int.signature"],
      ["param", ["ref", "$IO"]],
      ["result", ["ref", "$Int"]],
      ["unreachable"],
    ]);

    return { typeDefBlock: typeDefBlock, programBlock: programBlock };
  }

  private cgenClass(
    clsName: AbstractSymbol,
    typeDefBlock: Sexpr,
    programBlock: Sexpr,
  ): void {
    // generate method signatures and vtable
    const classTypeNameCgen = `$${clsName}`;
    const vtableTypeName = `$${clsName}#vtable`;

    const sortedMethods = [...this.methodSignatures.get(clsName)!.entries()]
      .toSorted(([_0, s0], [_1, s1]) => s0.id - s1.id);

    // const vtableMethodsSorted = vtableMethodsUnsorted.toSorted((a, b) =>
    //   a[0] - b[0]
    // ).map((v) => v[1]);
    const vtableDefMethodsSorted: Sexpr = sortedMethods.map((
      [methName, signature],
    ) => ["field", `$${methName}`, [
      "ref",
      signature.cgen.signature,
    ]]);


    sortedMethods.filter(([_, s]) => s.origin === MethodOrigin.NEW)
      .forEach(([methName, signature]) => {
        const retType = signature.returnType === ASTConst.SELF_TYPE
          ? classTypeNameCgen
          : `$${signature.returnType}`;

        const argumentsSignature = signature.arguments.map((
          { type, name },
        ) => ["param", `$${name}`, ["ref", `$${type}`]]);

        const methSigWASM = [
          "type",
          signature.cgen.signature,
          [
            "func",
            ["param", ["ref", classTypeNameCgen]],
            ...argumentsSignature,
            [
              "result",
              ["ref", retType],
            ],
          ],
        ];

        typeDefBlock.push(methSigWASM);

        // when we find a new method we generate the generic caller function

        programBlock.push(
          [
            "func",
            signature.cgen.genericCaller,
            ["param", "$v", ["ref", classTypeNameCgen]],
            ...argumentsSignature,
            ["result", ["ref", retType]],
            ["local.get", "$v"],
            ...signature.arguments.map(({ name }) => ["local.get", `$${name}`]),
            ["local.get", "$v"],
            ["struct.get", classTypeNameCgen, "$vt"],
            ["struct.get", vtableTypeName, `$${methName}`],
            ["call_ref", signature.cgen.signature],
          ],
        );
    });

    const parentName = this.clsTbl.parentCls(clsName);

    /// add vtable def
    let vtableTypeDef;
    if (clsName === ASTConst.Object_) {
      vtableTypeDef = ["type", vtableTypeName, ["sub", [
        "struct",
        ...vtableDefMethodsSorted,
      ]]];
    } else {
      vtableTypeDef = ["type", vtableTypeName, ["sub", `$${parentName}#vtable`, [
        "struct",
        ...vtableDefMethodsSorted,
      ]]];
    }

    typeDefBlock.push(vtableTypeDef);

    const canonVtableMethodRefs: Sexpr = sortedMethods.map(([methName, signature]) => {
      let methImplName = signature.cgen.implementation
      if (methName === ASTConst.type_name || methName === ASTConst.copy) {
        methImplName  = `${classTypeNameCgen}.${methName}.implementation`
      }

      return ["ref.func", methImplName]
    }
    )

    const vtableCanon = 
      ["global", `${classTypeNameCgen}.vtable.canon`, ["ref", vtableTypeName],
        ...canonVtableMethodRefs, 
      ["struct.new", vtableTypeName]
      ]
    if (clsName === ASTConst.Str) {
      programBlock.unshift(vtableCanon)

    } else {
      programBlock.push(vtableCanon)

    }

    
    // const structAttributesUnsorted: [number, Sexpr][] = [];
    // for (
    //   const [attrName, attrType] of this.attributeTypes.get(clsName)!.entries()
    // ) {
    //   const field = ["field", `$${attrName}`, ["ref", `$${attrType.type}`]];
    //   structAttributesUnsorted.push([attrType.id, field]);
    // }

    // const structAttributesSorted = structAttributesUnsorted.toSorted((a, b) =>
    //   a[0] - b[0]
    // ).map((v) => v[1]);

    const sortedAttributes = [...this.attributeTypes.get(clsName)!.entries()]
      .toSorted(([_0, { id: id0 }], [_1, { id: id1 }]) => id0 - id1);

    // built-it classes attributes
    if (clsName === ASTConst.Int || clsName === ASTConst.Bool) {
      // structAttributesSorted.push(["field", `$val`, "i32"]);
      sortedAttributes.push([ASTConst.val, { type: ASTConst.i32, id: -1 }]);
    }

    if (clsName === ASTConst.Str) {
      typeDefBlock.push(["type", "$charsArr", ["array", ["mut", "i8"]]]); // for concat and substr we need mutable arrays
      // structAttributesSorted.push(["field", "$chars", ["ref", "$charsArr"]]);
      sortedAttributes.push([ASTConst.chars, {
        type: AbstractTable.idTable.add("charsArr"),
        id: -1,
      }]);
    }

    const structAttributesSorted: Sexpr = sortedAttributes.map((
      [n, { type }],
    ) => [
      "field",
      `$${n}`,
      type === ASTConst.i32 ? `${ASTConst.i32}` : ["ref", `$${type}`],
    ]);

    // add class, without attributes for now
    let clsStruct: Sexpr = [];
    if (clsName === ASTConst.Object_) {
      clsStruct = ["type", classTypeNameCgen, ["sub", ["struct", [
        "field",
        "$vt",
        ["ref", vtableTypeName],
      ], ...structAttributesSorted]]];
    } else {
      clsStruct = ["type", classTypeNameCgen, ["sub", `$${parentName}`, [
        "struct",
        ["field", "$vt", ["ref", vtableTypeName]],
        ...structAttributesSorted,
      ]]];
    }

    typeDefBlock.push(clsStruct);

    // add copy method
    const copyImplementation = [
      "func",
      `${classTypeNameCgen}.copy.implementation`,
      ["type", "$Object.copy.signature"],
      ["param", "$o", ["ref", "$Object"]],
      ["result", ["ref", "$Object"]],
      ["local", "$c", ["ref", classTypeNameCgen]],
      ["local.get", "$o"],
      ["ref.cast", ["ref", classTypeNameCgen]],
      ["local.set", "$c"],
      ["local.get", "$c"],
      ["struct.get", classTypeNameCgen, "$vt"],
      ...sortedAttributes.flatMap((
        [name, _],
      ) => [["local.get", "$c"], [
        "struct.get",
        classTypeNameCgen,
        `$${name}`,
      ]]),
      ["struct.new", classTypeNameCgen],
    ];

    programBlock.push(copyImplementation);

    // add type name implementation

    const {name: strConstName, sexpr: strConstExpr } = ConstantGenerator.stringConstantSexpr(clsName.toString())

    programBlock.push(strConstExpr);
    const typeNameImplementation = [
      "func",
      `${classTypeNameCgen}.type_name.implementation`,
      ["type", "$Object.type_name.signature"],
      ["param", "$o", ["ref", "$Object"]],
      ["result", ["ref", "$String"]],
      ["global.get", strConstName]
    ]

    programBlock.push(typeNameImplementation);
  }
}
