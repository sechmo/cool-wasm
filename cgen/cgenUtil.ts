import { val } from "../astConstants.ts";

export type Sexpr = (Sexpr | string)[];

export const sexprToString = (s: Sexpr | string): string => {
  if (typeof s === "string") {
    return s;
  }

  return "(" + s.map((sub) =>
    sexprToString(sub)
  ).join(s.length > 4 ? "\n" : " ") + ")";
};

export class ConstantGenerator {
  private static strCount = 0;
  private static intCount = 0;

  public static stringConstantSexpr(s: string): {name: string, sexpr: Sexpr } {
    const vals = [];
    for (const c of s) {
      vals.push([c,c.charCodeAt(0)]);
    }
    const name = `$String.const.${this.strCount++}`;

    return {
      name: name, sexpr: [
        "global",
        name,
        ["export", `"${name}"`],
        ["ref", "$String"],
        ["global.get", "$String.vtable.canon",],
        ...vals.flatMap(([c,code]) => [`;; ${c}`, ["i32.const", `${code}`, ] ]),
        ["array.new_fixed", "$charsArr", `${s.length}`],
        ["struct.new", "$String"]
      ]
    };
  }
}
