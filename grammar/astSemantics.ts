import * as AST from "../ast.ts";
// @ts-types="./cool.ohm-bundle.d.ts"
import grammar from "./cool.ohm-bundle.js";
import { SourceLocation } from "../util.ts";
import { AbstractSymbol, AbstractTable } from "../abstractTable.ts";

const astSemantics = grammar.createSemantics();

astSemantics.addOperation<SourceLocation>("getLoc", {
  _terminal() {
    const sourceInfo = this.source;
    const locInfo = sourceInfo.getLineAndColumn();

    return new SourceLocation(
      "",
      locInfo.lineNum,
      locInfo.colNum,
    );
  },

  _nonterminal(..._children) {
    const sourceInfo = this.source;
    const locInfo = sourceInfo.getLineAndColumn();

    return new SourceLocation(
      "",
      locInfo.lineNum,
      locInfo.colNum,
    );
  },
});

astSemantics.addOperation<boolean>("booleanValue", {
  booleanLiteral(val) {
    return val.booleanValue();
  },
  false(_FALSE) {
    return false;
  },
  true(_TRUE) {
    return true;
  },
});

astSemantics.addOperation<AbstractSymbol>("getSymbol", {
  objectIdentifier(_lower, _rest) {
    return AbstractTable.idTable.add(this.sourceString);
  },
  typeIdentifier(_upper, _rest) {
    return AbstractTable.idTable.add(this.sourceString);
  },
  integerLiteral(_) {
    return AbstractTable.idTable.add(this.sourceString);
  },

  stringLiteral(_LQ, inside, _RQ) {
    const parsedInside = inside.children.map(c => c.parseChar()).join("")
    return AbstractTable.stringTable.add(parsedInside);
  },
});

astSemantics.addOperation<string>("parseChar", {
    stringChar_nonEscaped(val) {
        return val.sourceString;
    },

    stringChar_escaped(_BACKSLASH, val) {
        const char = val.sourceString;
        if (char === "b") return "\b";
        if (char === "t") return "\t";
        if (char === "n") return "\n";
        if (char === "f") return "\f";
        return char;
    },

    stringChar_lineContinuation(_BACKSLASH, lineCont) {
        return lineCont.sourceString
    }
})

astSemantics.addOperation<AST.ASTNode>("toAST", {
  Program(classes, _SEMIS) {
    return new AST.Program(
      this.getLoc(),
      classes.children.map((c) => {
        return c.toAST();
      }),
    );
  },

  ClassStatement_WithParent(
    _CLASS,
    className,
    _INHERITS,
    parentName,
    _LB,
    features,
    _SEMIS,
    _RB,
  ) {
    return new AST.ClassStatement(
      this.getLoc(),
      className.getSymbol(),
      parentName.getSymbol(),
      features.children.map((f) => f.toAST()),
    );
  },

  ClassStatement_WithoutParent(
    _CLASS,
    className,
    _LB,
    features,
    _SEMIS,
    _RB,
  ) {
    return new AST.ClassStatement(
      this.getLoc(),
      className.getSymbol(),
      null,
      features.children.map((f) => f.toAST()),
    );
  },
  Feature(feat) {
    return feat.toAST();
  },

  Attribute(name, _COLOR, tyepDecl, _ARROW, init) {
    const actualInit = init.sourceString === ""
      ? new AST.NoExpr(this.getLoc())
      : init.toAst();
    return new AST.Attribute(
      this.getLoc(),
      name.getSymbol(),
      tyepDecl.getSymbol(),
      actualInit,
    );
  },

  Method(methName, _LP, formals, _RP, _COLON, returnType, _LB, bodyExpr, _RB) {
    return new AST.Method(
      this.getLoc(),
      methName.getSymbol(),
      formals.asIteration().children.map((f) => f.toAST()),
      returnType.getSymbol(),
      bodyExpr.toAST(),
    );
  },

  Formal(name, _COLON, typeDecl) {
    return new AST.Formal(
      this.getLoc(),
      name.getSymbol(),
      typeDecl.getSymbol(),
    );
  },

  Expr(expr) {
    return expr.toAST();
  },

  ComparisonExpr_LessThan(lhs, _LT, rhs) {
    return new AST.LessThan(
      this.getLoc(),
      lhs.toAST(),
      rhs.toAST(),
    );
  },

  ComparisonExpr_LessThanOrEqual(lhs, _LT, rhs) {
    return new AST.LessThanOrEqual(
      this.getLoc(),
      lhs.toAST(),
      rhs.toAST(),
    );
  },

  ComparisonExpr_Equal(lhs, _LT, rhs) {
    return new AST.Equal(
      this.getLoc(),
      lhs.toAST(),
      rhs.toAST(),
    );
  },

  AdditiveExpr(expr) {
    return expr.toAST();
  },

  AdditiveExpr_Addition(lhs, _PLUS, rhs) {
    return new AST.Addition(
      this.getLoc(),
      lhs.toAST(),
      rhs.toAST(),
    );
  },

  AdditiveExpr_Subtraction(lhs, _MINUS, rhs) {
    return new AST.Subtraction(
      this.getLoc(),
      lhs.toAST(),
      rhs.toAST(),
    );
  },

  MultiplicativeExpression(expr) {
    return expr.toAST();
  },

  MultiplicativeExpression_Multiplication(lhs, _STAR, rhs) {
    return new AST.Multiplication(
      this.getLoc(),
      lhs.toAST(),
      rhs.toAST(),
    );
  },

  MultiplicativeExpression_Division(lhs, _STAR, rhs) {
    return new AST.Division(
      this.getLoc(),
      lhs.toAST(),
      rhs.toAST(),
    );
  },

  DispatchExpression(expr) {
    return expr.toAST();
  },

  DispatchExpression_Dynamic(caller, _DOT, methName, _LP, args, _RP) {
    return new AST.DynamicDispatch(
      this.getLoc(),
      caller.toAST(),
      methName.getSymbol(),
      args.asIteration().children.map((e) => e.toAST()),
    );
  },

  DispatchExpression_DynamicNoCaller(methName, _LP, args, _RP) {
    return new AST.DynamicDispatch(
      this.getLoc(),
      new AST.ObjectReference(
        this.getLoc(),
        AbstractTable.idTable.add("self"),
      ),
      methName.getSymbol(),
      args.asIteration().children.map((e) => e.toAST()),
    );
  },

  DispatchExpression_Static(
    caller,
    _AT,
    callType,
    _DOT,
    methName,
    _LP,
    args,
    _RP,
  ) {
    return new AST.StaticDispatch(
      this.getLoc(),
      caller.toAST(),
      callType.getSymbol(),
      methName.getSymbol(),
      args.asIteration().children.map((e) => e.toAST()),
    );
  },

  OtherExpression(expr) {
    return expr.toAST();
  },

  OtherExpression_parenthesized(_LP, expr, _RP) {
    return expr.toAST();
  },

  IfExpression(_IF, pred, _THEN, thenExpr, _ELSE, elseExpr, _FI) {
    return new AST.Conditional(
      this.getLoc(),
      pred.toAST(),
      thenExpr.toAST(),
      elseExpr.toAST(),
    );
  },

  CaseExpression(_CASE, expr, _OF, branches, _SEMIS, _ESAC) {
    return new AST.TypeCase(
      this.getLoc(),
      expr.toAST(),
      branches.children.map((c) => c.toAST()),
    );
  },

  Branch(name, _COLON, typeCheck, _RARROW, body) {
    return new AST.Branch(
      this.getLoc(),
      name.getSymbol(),
      typeCheck.getSymbol(),
      body.toAST(),
    );
  },

  LetExpression(_LET, letAux) {
    return letAux.toAST();
  },

  LetAux_finalWithInit(name, _COLON, typeDecl, _ARROW, init, _IN, body) {
    return new AST.Let(
      this.getLoc(),
      name.getSymbol(),
      typeDecl.getSymbol(),
      init.toAST(),
      body.toAST(),
    );
  },

  LetAux_finalWithoutInit(name, _COLON, typeDecl, _IN, body) {
    return new AST.Let(
      this.getLoc(),
      name.getSymbol(),
      typeDecl.getSymbol(),
      new AST.NoExpr(this.getLoc()),
      body.toAST(),
    );
  },

  LetAux_midWithInit(name, _COLON, typeDecl, _ARROW, init, _COMMA, otherLet) {
    return new AST.Let(
      this.getLoc(),
      name.getSymbol(),
      typeDecl.getSymbol(),
      init.toAST(),
      otherLet.toAST(),
    );
  },

  LetAux_midWithoutInit(name, _COLON, typeDecl, _COMMA, otherLet) {
    return new AST.Let(
      this.getLoc(),
      name.getSymbol(),
      typeDecl.getSymbol(),
      new AST.NoExpr(this.getLoc()),
      otherLet.toAST(),
    );
  },

  AssigmentExpression(name, _ARROW, expr) {
    return new AST.Assignment(
      this.getLoc(),
      name.getSymbol(),
      expr.toAST(),
    );
  },

  WhileExpression(_WHILE, pred, _LOOP, body, _POOL) {
    return new AST.Loop(
      this.getLoc(),
      pred.toAST(),
      body.toAST(),
    );
  },

  NewExpression(_NEW, typeName) {
    return new AST.New(this.getLoc(), typeName.getSymbol());
  },

  Negation(_NEG, expr) {
    return new AST.Negation(this.getLoc(), expr.toAST());
  },

  NotExpression(_NOT, expr) {
    return new AST.Complement(this.getLoc(), expr.toAST());
  },

  IsVoidExpression(_ISVOID, expr) {
    return new AST.IsVoid(this.getLoc(), expr.toAST());
  },

  BlockExpression(_LB, exprs, _SEMIS, _RB) {
    return new AST.Block(
      this.getLoc(),
      exprs.children.map((e) => e.toAST()),
    );
  },

  ObjectId(identifier) {
    return new AST.ObjectReference(
      this.getLoc(),
      identifier.getSymbol(),
    );
  },

  IntegerConst(val) {
    return new AST.IntegerConstant(
      this.getLoc(),
      val.getSymbol(),
    );
  },

  BooleanConst(val) {
    return new AST.BooleanConstant(
      this.getLoc(),
      val.booleanValue(),
    );
  },

  StringConst(val) {
    return new AST.StringConstant(
      this.getLoc(),
      val.getSymbol(),
    );
  },
});

export default astSemantics;
