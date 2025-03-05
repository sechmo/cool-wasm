import { val } from "../astConstants.ts";

export type Sexpr = (Sexpr | string)[];

export const sexprToString = (s: Sexpr | string): string => {
  if (typeof s === "string") {
    return s;
  }

  return "(" +
    s.map((sub) => sexprToString(sub)).join(s.length > 4 ? "\n" : " ") + ")";
};

export class ConstantGenerator {
  private static strCount = 0;
  private static intCount = 0;

  public static stringConstantSexpr(s: string): { name: string; sexpr: Sexpr } {
    const vals = [];
    for (const c of s) {
      vals.push([c, c.charCodeAt(0)]);
    }
    const name = `$String.const.${this.strCount++}`;

    return {
      name: name,
      sexpr: [
        "global",
        name,
        ["export", `"${name}"`],
        ["ref", "$String"],
        ["global.get", "$String.vtable.canon"],
        ...vals.flatMap(([c, code]) => [`;; ${c}`, ["i32.const", `${code}`]]),
        ["array.new_fixed", "$charsArr", `${s.length}`],
        ["struct.new", "$String"],
      ],
    };
  }


  public static intConstantSexpr(i: number): { name: string; sexpr: Sexpr } {
    const name = `$Int.const.${this.intCount++}`;

    return {
      name: name,
      sexpr: [
        "global",
        name,
        ["export", `"${name}"`],
        ["ref", "$Int"],
        ["global.get", "$Int.vtable.canon"],
        ["i32.const", `${i}`],
        ["struct.new", "$Int"],
      ],
    };
  }

  public static falseConstName = "$Bool.const.False";
  public static trueConstName = "$Bool.const.True";

  public static booleanConstantsSexpr(): Sexpr[] {
    const falseConst = [
      "global",
      this.falseConstName,
      ["export", `"${this.falseConstName}"`],
      ["ref", "$Bool"],
      ["global.get", "$Bool.vtable.canon"],
      ["i32.const", "0"],
      ["struct.new", "$Bool"],
    ];


    const trueConst = [
      "global",
      this.trueConstName,
      ["export", `"${this.trueConstName}"`],
      ["ref", "$Bool"],
      ["global.get", "$Bool.vtable.canon"],
      ["i32.const", "0"],
      ["struct.new", "$Bool"],
    ];

    return [falseConst, trueConst]
  }
}
