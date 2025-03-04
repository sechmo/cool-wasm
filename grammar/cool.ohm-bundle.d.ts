// AUTOGENERATED FILE
// This file was generated from cool.ohm by `ohm generateBundles`.

import {
  BaseActionDict,
  Grammar,
  IterationNode,
  Node,
  NonterminalNode,
  Semantics,
  TerminalNode
} from 'ohm-js';

export interface CoolActionDict<T> extends BaseActionDict<T> {
  Program?: (this: NonterminalNode, arg0: IterationNode, arg1: IterationNode) => T;
  ClassStatement_WithParent?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: NonterminalNode, arg3: NonterminalNode, arg4: TerminalNode, arg5: IterationNode, arg6: IterationNode, arg7: TerminalNode) => T;
  ClassStatement_WithoutParent?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: IterationNode, arg4: IterationNode, arg5: TerminalNode) => T;
  ClassStatement?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Feature?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Attribute_WithInit?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode) => T;
  Attribute_WithoutInit?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  Attribute?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Method?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: TerminalNode, arg5: NonterminalNode, arg6: TerminalNode, arg7: NonterminalNode, arg8: TerminalNode) => T;
  Formal?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  Expr?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  AssigmentExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  NotExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  ComparisonExpr_LessThan?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  ComparisonExpr_LessThanOrEqual?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  ComparisonExpr_Equal?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  ComparisonExpr?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  AdditiveExpr_Addition?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  AdditiveExpr_Subtraction?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  AdditiveExpr?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MultiplicativeExpression_Multiplication?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MultiplicativeExpression_Division?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MultiplicativeExpression?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  UnaryExpr?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  IsVoidExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  Negation?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  DispatchExpression_Dynamic?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: TerminalNode) => T;
  DispatchExpression_DynamicNoCaller?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode) => T;
  DispatchExpression_Static?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: TerminalNode, arg6: NonterminalNode, arg7: TerminalNode) => T;
  DispatchExpression?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  OtherExpression_parenthesized?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  OtherExpression?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ObjectId?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  BooleanConst?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  StringConst?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  IntegerConst?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  IfExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: NonterminalNode, arg3: NonterminalNode, arg4: NonterminalNode, arg5: NonterminalNode, arg6: NonterminalNode) => T;
  WhileExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: NonterminalNode, arg3: NonterminalNode, arg4: NonterminalNode) => T;
  BlockExpression?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: IterationNode, arg3: TerminalNode) => T;
  LetExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  LetAux_finalWithInit?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: NonterminalNode, arg6: NonterminalNode) => T;
  LetAux_finalWithoutInit?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: NonterminalNode, arg4: NonterminalNode) => T;
  LetAux_midWithInit?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: TerminalNode, arg6: NonterminalNode) => T;
  LetAux_midWithoutInit?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode) => T;
  LetAux?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  CaseExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: NonterminalNode, arg3: IterationNode, arg4: IterationNode, arg5: NonterminalNode) => T;
  Branch?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode) => T;
  NewExpression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  space_comment?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  space?: (this: NonterminalNode, arg0: NonterminalNode | TerminalNode) => T;
  comment?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  singlelineComment?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode) => T;
  multilineCommentChar?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  multilineComment?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  booleanLiteral?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  integerLiteral?: (this: NonterminalNode, arg0: IterationNode) => T;
  stringLiteral?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  stringSingleChar?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  stringChar_nonEscaped?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  stringChar_escaped?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  stringChar_lineContinuation?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  stringChar?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  lineTerminator?: (this: NonterminalNode, arg0: TerminalNode) => T;
  objectIdentifier?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode) => T;
  typeIdentifier?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode) => T;
  identifierPart?: (this: NonterminalNode, arg0: NonterminalNode | TerminalNode) => T;
  keyword?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  class?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  else?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  false?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  fi?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  if?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  in?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  inherits?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  isvoid?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  let?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  loop?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  pool?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  then?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  while?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  case?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  esac?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  new?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  of?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  not?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  true?: (this: NonterminalNode, arg0: NonterminalNode) => T;
}

export interface CoolSemantics extends Semantics {
  addOperation<T>(name: string, actionDict: CoolActionDict<T>): this;
  extendOperation<T>(name: string, actionDict: CoolActionDict<T>): this;
  addAttribute<T>(name: string, actionDict: CoolActionDict<T>): this;
  extendAttribute<T>(name: string, actionDict: CoolActionDict<T>): this;
}

export interface CoolGrammar extends Grammar {
  createSemantics(): CoolSemantics;
  extendSemantics(superSemantics: CoolSemantics): CoolSemantics;
}

declare const grammar: CoolGrammar;
export default grammar;

