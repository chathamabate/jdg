const { CopyResponse } = require("pg-protocol/dist/messages");
const {Token, TokenType, JQLScanner} = require("./jql_scanner");
const {Cons, Empty, TrySuccess, TryFailure, Iter, FList} = require("./utils");

class Program {
    // Cons<Statement | VarDefine>
    #stmts;

    constructor(stmts) {
        this.#stmts = stmts;
    }

    get stmts() {
        return this.#stmts;
    }

    toString() {
        return this.#stmts.map(s => s.toString()).join("\n");
    }
}

class Statment {
    // Match | Map | Or
    #exp;

    constructor(exp) {
        this.#exp = exp;
    }

    get exp() {
        return this.#exp;
    }

    toString() {
        return "do " + this.#exp.toString();
    }
}

class VarDefine {
    // Argument
    #arg;

    // Match | Map | Or
    #exp;

    constructor(arg, exp) {
        this.#arg = arg;
        this.#exp = exp;
    }

    get arg() {
        return this.#arg;
    }

    get exp() {
        return this.#exp;
    }

    toString() {
        return `define ${this.arg.toString()} as ${this.#exp.toString()}`;
    }
}

class Case {
    // Both Match | Map | Or
    #test;
    #conseq;

    constructor(t, c) {
        this.#test = t;
        this.#conseq = c;
    }

    get test() { 
        return this.#test;
    }

    get conseq() {
        return this.#conseq;
    }

    toString() {
        return this.test.toString() + " -> " + this.conseq.toString();
    }
}

class Match {
    static defaultMatch(c, dc) {
        return new Match.#DefualtMatch(c, dc);
    }

    static valueMatch(p, c, dc) {
        return new Match.#ValueMatch(p, c, dc);
    }

    static #DefualtMatch = class {
        // Cons<Case>
        #cases;

        // Match | Map | Or
        #defaultCase;

        constructor(c, dc) {
            this.cases = c;
            this.#defaultCase = dc;
        }

        get pivot() {
            throw new Error("DefaultMatch has no pivot!");
        }

        get cases() {
            return this.#cases;
        }

        get defaultCase() {
            return this.#defaultCase;
        }

        toString() {
            return "match\n" + 
                    this.#cases.map(c => c.toString()).join("\n") + 
                    "\n" + this.#defaultCase.toString()
        }
    };

    static #ValueMatch = class extends Match.#DefualtMatch {
        // Match | Map | Or
        #pivot;

        constructor(p, c, dc) {
            super(c, dc);
            this.#pivot = p;
        }

        get pivot() {
            return this.#pivot;
        }

        toString() {
            return "match " + this.#pivot.toString() + "\n" +
                this.cases.map(c => c.toString()).join("\n") + 
                "\n" + this.defaultCase.toString()
        }
    }
}

class Argument {
    // Type signature.
    #ts;

    // VarID.
    #vid;

    constructor(ts, vid) {
        this.#ts = ts;
        this.#vid = vid;
    }

    get ts() {
        return this.#ts;
    }

    get vid() {
        return this.#vid;
    }

    toString() {
        return this.#ts.toString() + " " + this.#vid.toString();
    }
}

class Map {
    // Cons<Argument>
    #args;

    // Cons<VarDefine>
    #vdfs;

    // Match | Map | Or.
    #exp;

    constructor(args, vdfs, exp) {
        this.#args = args;
        this.#vdfs = vdfs;
        this.#exp = exp;
    }

    get args() {
        return this.#args;
    }

    get vdfs() {
        return this.#vdfs;
    }

    get exp() {
        return this.#exp;
    }

    toString() {
        type_strs = this.#args.map(a => a.toString()).join(", ");
        def_strs = this.vdfs.map(vdf => vdf.toString()).join("\n");

        return `(${type_strs}) -> \n${def_strs}\n${this.#exp.toString()}`;
    }
}

class BooleanChain {
    static orChain(exps) {
        return new BooleanChain.#OrChain(exps);
    } 

    static andChain(exps) {
        return new BooleanChain.#AndChain(exps);
    }

    static #DefChain = class {
        // Cons<AND | NOT> must have length >= 2.
        #exps;

        constructor(exps) {
            this.#exps = exps;
        }

        get exps() {
            return this.#exps;
        }

        get opLex() {
            throw new Error("Default chain has no operator.");
        }

        toString() {
            return this.#exps.tail.foldl(this.#exps.head.toString(), 
                (res, ele) => `${res} ${this.opLex} ${ele.toString()}`);
        }
    };

    static #OrChain = class extends BooleanChain.#DefChain {
        // exps should be Cons<AND> 
        constructor(exps) {
            super(exps);
        }

        get opLex() {
            return Token.T_OR.lexeme;
        }
    };

    static #AndChain = class extends BooleanChain.#DefChain {
        // exp should be Cons<NOT>
        constructor(exps) {
            super(exps);
        }

        get opLex() {
            return Token.T_AND.lexeme;
        }
    };
}

class Not {
    // Comparison.
    #cmp;

    constructor(cmp) {
        this.#cmp = cmp;
    }

    get comparison() {
        return this.#cmp;
    }

    toString() {
        return "not " + this.#cmp.toString();
    }
}

class Comparison {
    static equals(lsum, rsum) {
        return new Comparison.#Eq(lsum, rsum);
    }

    static ltEquals(lsum, rsum) {
        return new Comparison.#LtEq(lsum, rsum);
    }

    static gtEquals(lsum, rsum) {
        return new Comparison.#GtEq(lsum, rsum);
    }

    static lt(lsum, rsum) {
        return new Comparison.#Lt(lsum, rsum);
    }

    static gt(lsum, rsum) {
        return new Comparison.#Gt(lsum, rsum);
    }

    static #DefCmp = class {
        // Both summantions.
        #lsum;
        #rsum;

        constructor(lsum, rsum) {
            this.#lsum = lsum;
            this.#rsum = rsum;
        }
    
        get leftSum() {
            return this.#lsum;
        }
    
        get rightSum() {
            return this.#rsum;
        }
    
        get opLex() {
            throw new Error("Empty Comparison has no opLex!");
        }
    
        toString() {
            return `${this.#lsum.toString()} ${this.opLex} ${this.#rsum.toString()}`;
        }
    };

    static #Eq = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_EQU.lexeme;
        }
    };

    static #LtEq = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_LTE.lexeme;
        }
    };

    static #GtEq = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_GTE.lexeme;
        }
    };

    static #Lt = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_LT.lexeme;
        }
    };

    static #Gt = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_GT.lexeme;
        }
    };
}


class OpChainTerm {
    static add(val) {
        return new OpChainTerm.#AddCT(val);
    }

    static sub(val) {
        return new OpChainTerm.#SubCT(val);
    }

    static times(val) {
        return new OpChainTerm.#TimesCT(val);
    }

    static div(val) {
        return new OpChainTerm.#DivCT(val);
    }

    static mod(val) {
        return new OpChainTerm.#ModCT(val);
    }

    static #DefOpCT = class {
        #val;

        constructor(val) {
            this.#val = val;
        }

        get opLex() {
            throw new Error("Defualt term has no op lex!");
        }

        toString() {
            return this.opLex + " " + this.#val.toString();
        }
    }

    static #AddCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_PLS.lexeme;
        }
    }

    static #SubCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_MIN.lexeme;
        }
    }

    static #TimesCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_TIM.lexeme;
        }
    }

    static #DivCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_DIV.lexeme;
        }
    }

    static #ModCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_MOD.lexeme;
        }
    }
}

class OpChain {
    // Op Chain can either represent an arithmetic summation
    // or a geometric summation.

    // If Algebreic, Product.
    // If Geometric, Negation.
    #head;

    // If Algebreic, FList<+|- Geometric>
    // If Geometric, FList<*|/|% Negation>
    #opChain;

    constructor(head, opChain) {
        this.#head = head;
        this.#opChain = opChain;
    }

    get head() {
        return this.#head;
    }

    get opChain() {
        return this.#opChain;
    }

    toString() {
        return this.#opChain.foldl(
            this.#head.toString(),
            (res, ele) => res + " " + ele.toString()
        );
    }
}

class Negation {
    // APP
    #val;

    constructor(val) {
        this.#val = val;
    }

    get val() {
        return this.#val;
    }

    toString() {
        return Token.T_MIN.lexeme + this.#val;
    }
}

class SubScript {
    // A subscript represents a function application,
    // or an index into a vector.
    // These operations have equal precedence.

    static index(exp) {
        return new SubScript.#Index(exp);
    }

    static argList(args) {
        return new SubScript.#ArgList(args);
    }

    static #DefSS = class {
        constructor() {
            // Info Here tbd...
        }
    }

    static #Index = class extends SubScript.#DefSS {
        // Match | Map | Or
        #exp;

        constructor(exp) {
            super();
            this.#exp = exp;
        }

        toString() {
            return "[" + this.#exp.toString() + "]";
        }
    }

    static #ArgList = class extends SubScript.#DefSS {
        // FList<Match | Map | Or>
        #args;

        constructor(args) {
            super();
            this.#args = args;
        }

        toString() {
            if (this.#args.isEmpty) {
                return "()";
            }

            return "(" +
            this.#args.tail.foldl(
                this.#args.head.toString(),
                (res, ele) => res + ", " + ele.toString()
            ) + ")";
        }
    }
}

// How to struct Ors and Ands... 
// Or any Binop grammar rule...

// Or chains...
// and chains...
// + - chains...
// * / % chains...



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
        // return Iter.foldUntil(Empty.ONLY, () => 
        //     this.#sc.next().omap(token => {
        //         switch (token.token_type) {
        //             case TokenType.EOF:

        //             case TokenType.DEF:
        //             case TokenType.DO:
        //             default:
        //         }
        //     }), 
        // (lines, res) => new Cons(res, lines),
        // () => !this.#sc.halted);

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