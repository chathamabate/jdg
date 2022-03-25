const {Token, TokenType, JQLScanner} = require("./jql_scanner");
const {Cons, Empty, TrySuccess, TryFailure, Iter} = require("./utils");

class Program {
    constructor(stmts) {
        this.stmts = stmts;
    }

    toString() {
        return this.stmts.join("\n");
    }
}

class Statment {
    constructor(exp) {
        this.exp = exp;
    }

    toString() {
        return "do " + this.exp;
    }
}

class VarDefine {
    constructor(ts, name, exp) {
        this.ts = ts;
        this.name = name;
        this.exp = exp;
    }

    toString() {
        return `define ${this.ts} ${this.name} as ${this.exp}`;
    }
}

class Match {
    constructor(pivot, cases) {
        this.pivot = pivot; // Can be null.

        // The last element in cases represents the defualt case.
        this.cases = cases; // [[test, exp].... [exp]]
    }

    toString() {
        case_strs = this.cases
            .map(
                (c, i, arr) => 
                    i == arr.length - 1 
                    ? "default " + c[0]
                    : c[0] + " -> " + c[1]
            ).join("\n");

        return "match " + 
            (this.pivot == null ? "" : this.pivot) +
            "\n" + case_strs; 
    }
}

class Map {
    constructor(args, vdfs, exp) {
        this.args = args; //[[TS, Name]...]
        this.vdfs = vdfs; // Extra Variable Defines.
        this.exp = exp;
    }

    toString() {
        type_strs = this.args.map(
            (a) => a[0] + " " + a[1]
        ).join(", ");

        def_strs = this.vdfs.join("\n");

        return `(${type_strs}) -> \n${def_strs}\n${this.exp}`;
    }
}

class Or {
    constructor(ands) {
        this.ands = ands;
    }

    toString() {
        return this.ands.join(" or "); 
    }
}

class And {
    constructor(nots) {
        this.nots = nots;
    }

    toString() {
        return this.nots.join(" and ");
    }
}

class Not {
    constructor(compare) {
        this.compare = compare;
    }

    toString() {
        return "not " + this.compare;
    }
}

class Comparison {
    constructor(sum1, cmp, sum2) {
        this.sum1 = sum1;
        this.cmp = cmp; // Should be a Token.
        this.sum2 = sum2;
    }

    toString() {
        return `${this.sum1} ${this.cmp.lex} ${this.sum2}`;
    }
}

class Summation {
    // prods should be in the form...
    // [prod, Token.T_PLS | Token.T_MIN, prod ...]
    constructor(prods) {
        this.prods = prods;
    }

    toString() {
        return this.prods.map(
            (p, i) =>
                i % 2 == 1 ? p.lex : p
        ).join(" ");
    }
}

class Product {
    // negs should be in the form...
    // [neg, TokenType.TIM | TokenType.DIV | TokenType.MOD, neg ...]
    constructor(negs) {
        this.negs = negs;
    }


    toString() {
        return this.prods.map(
            (p, i) =>
                i % 2 == 1 ? p.lex : p
        ).join(" ");
    }
}

class Negation {
    constructor(term) {
        this.term = term;
    }

    toString() {
        return "-" + this.term;
    }
}

class Index {
    constructor(adr, iexp) {
        this.adr = adr;
        this.iexp = iexp;
    }

    toString() {
        return `${this.adr}[${this.iexp}]`;
    }
}

class Application {
    constructor(adr, args) {
        this.adr = adr;
        this.args = args;
    }

    toString() {
        return `${this.adr}(${this.args.join(", ")})`;
    }
}

class BoolVal {
    static TRUE = new BoolVal(true);
    static FALSE = new BoolVal(false);

    constructor(bvl) {
        this.bvl = bvl;
    }

    toString() {
        return this.bvl + "";
    }
}

class NumVal {
    constructor(nmv) {
        this.nmv = nmv;
    }

    toString() {
        return this.nmv + "";
    }
}

class StringVal {
    constructor(stv) {
        this.stv = stv;
    }

    toString() {
        return "\"" + stv + "\"";
    }
}

class VarID {
    constructor(name) {
        this.name = name;
    }

    toString() {
        return this.name;
    }
}

class Vector {
    constructor(exps) {
        this.exps = exps;
    }

    toString() {
        return `[${this.exp.join(", ")}]`;
    }
}

class Grouping {
    constructor(exp) {
        this.exp = exp;
    }

    toString() {
        return "(" + this.exp + ")";
    }
}


// // Not entirely necessary visitor class here...
// // But useful for thought.
// class TypeSigVisitor {
//     forVecTS(vts) {
//         throw new Error("Vec Type Signature not implemented.");
//     }

//     forMapTS(mts) {
//         throw new Error("Map Type Signature not implemented.");
//     }

//     forNumTS(nts) {
//         throw new Error("Num Type Signature not implemented.");
//     }

//     forBoolTS(bts) {
//         throw new Error("Bool Type Signature not implemented.");
//     }

//     forStrTS(sts) {
//         throw new Error("Str Type Signature not implemented.");
//     }

//     forGenericTS(gts) {
//         throw new Error("Generic Type Signature not implemented.");
//     }
// }

class VecTypeSig {
    constructor(arg) {
        this.arg = arg;
    }

    toString() {
        return `vec<${this.arg}>`;
    }
}

class MapTypeSig {
    constructor(args, out) {
        this.args = args;
        this.out = out;
    }

    toString() {
        return this.args.length == 0 
            ? `map<${this.out}>` 
            : `map<${this.args.join(", ")}, ${this.out}>`;
    } 
}

class NumTypeSig {
    static ONLY = new NumTypeSig();

    toString() {
        return "num";
    }
}

class BoolTypeSig {
    static ONLY = new BoolTypeSig();

    toString() {
        return "bool";
    }
}

class StrTypeSig {
    static ONLY = new StrTypeSig();

    toString() {
        return "str";
    }
}

class JQLParser {
    #sc;
    #halted;

    constructor(data) {
        this.#sc = new JQLScanner(data);
        this.#halted = false;
    }


    // Parse can only be called once...
    // The parser will halt after this call regardless of whether
    // an error was found or not.
    parse() {
        this.#sc.next(); // Load first token.
    }

    #error(msg) {
        return new TryFailure(this.#sc.line + " : " + msg);
    }

    #program() {
        return Iter.foldUntil(Empty.ONLY, () => 
            this.#sc.next().omap(token => {
                switch (token.token_type) {
                    case TokenType.EOF:

                    case TokenType.DEF:
                    case TokenType.DO:
                    default:
                }
            }), 
        (lines, res) => new Cons(res, lines),
        () => !this.#sc.halted);

        // Only run while the lookahead is not EOF, there have been no
        // scanner errors, and the statments try remains successful.
        // These checks are redundant for the optional form... 
        // Maybe a different construction could be better.
        while (this.#sc.curr.successful && 
            this.#sc.curr.val.token_type != TokenType.EOF &&
            stmts.successful) {
            

            stmts = stmts.omap(lines => this.#sc.curr)
        }

        while (!this.#sc.halted && stmts.successful) {
            stmts = stmts.omap(lines => this.#sc.next().omap(token => {
                switch (token.token_type) {
                    case TokenType.EOF:
                        return stmts;
                    case TokenType.DO:
                        return this.#varDefine().map(vdf => new Cons(vdf, lines));
                    case TokenType.DEF:
                        return this.#expression().map(e => new Cons(e, lines));
                    default:
                        return this.#error("Invalid start to program line.");
                }
            }))
        }

        return stmts.map(lines => new Program(lines));
    }

    #expression() {

    }

    #varDefine() {

    }
}