export class AbstractSymbol {
    constructor(public readonly sym: string, public readonly idx: number) { }

    getString(): string {
        return this.sym;
    }
}

export class AbstractTable {
    static stringTable = new AbstractTable();
    static idTable = new AbstractTable();
    static intTable = new AbstractTable();

    private tbl: AbstractSymbol[];
    constructor() {
        this.tbl = [];
    }

    add(val: string): AbstractSymbol {

        for (const as of this.tbl) {
            if (as.sym === val) {
                return as;
            }
        }

        const as = new AbstractSymbol(val, this.tbl.length);
        this.tbl.push(as);
        return as;
    } 

}