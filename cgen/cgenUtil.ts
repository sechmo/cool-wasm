export type Sexpr = (Sexpr | string)[]

export const sexprToString = (s: Sexpr | string): string => {
  if (typeof s === "string") {
    return s;
  } 

  return "(" +s.map(sub => sexprToString(sub)).join(s.length > 4 ? "\n" : " ") + ")"
}
