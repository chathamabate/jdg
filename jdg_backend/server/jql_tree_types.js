const {Token, TokenType, JQLScanner} = require("./jql_scanner");
const {FList, Try} = require("./utils");

const INDENT = "  ";

function checkIndent(str) {
    if (str.indexOf("\n") == -1) {
        return str;
    }

    return "\n" + INDENT + str.replace(
        /\n/g, "\n" + INDENT
    );
}

class Program {
    // FList<Statement | VarDefine>
    #stmts;

    constructor(stmts) {
        this.#stmts = stmts;
    }

    get stmts() {
        return this.#stmts;
    }

    toString() {
        return this.#stmts.foldl("", (res, ele) => res + "\n" + ele.toString() + "\n");
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
        return "do " + checkIndent(this.#exp.toString());
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
        return `define ${this.arg.toString()} as ${checkIndent(this.#exp.toString())}`;
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
        return "case " + checkIndent(this.test.toString()) + "\n-> " + 
            checkIndent(this.conseq.toString());
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
        // FList<Case>
        #cases;

        // Match | Map | Or
        #defaultCase;

        constructor(c, dc) {
            this.#cases = c;
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
            return "match" + 
                    this.#cases.foldl("", 
                        (res, ele) => res + "\n" + ele.toString()) + 
                    "\ndefault\n-> " + checkIndent(this.#defaultCase.toString());
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
            return "match " + this.#pivot.toString() + 
                this.cases.foldl("", 
                    (res, ele) => res + "\n" + ele.toString()) + 
                "\ndefault\n-> " + checkIndent(this.defaultCase.toString());
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
        let type_strs = this.#args.match(
            (head, tail) => tail.foldl(head.toString(), 
                (res, ele) => res + ", " + ele.toString()),
            () => ""
        );

        let body_str = this.#vdfs.foldl("", 
            (res, ele) => res + ele.toString() + "\n"
        ) + this.#exp.toString();

        return `map (${type_strs}) -> ${checkIndent(body_str)}`;
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

class Index {
    // Match | Map | Or
    #exp;

    constructor(exp) {
        this.#exp = exp;
    }

    toString() {
        return "[" + this.#exp.toString() + "]";
    }
}

class ArgList {
    // FList<Match | Map | Or>
    #args;

    constructor(args) {
        this.#args = args;
    }

    toString() {
        return this.#args.match(
            (head, tail) => tail.foldl(
                head.toString(), (res, ele) => res + ", " + ele.toString()
            ),
            () => "()"  
        );
    }
}

class SubScript {
    // Grouping | ID | Vec
    #pivot;

    // Nonempty FList<Index | ArgList>
    #subscripts;    

    constructor(p, sss) {
        this.#pivot = p;
        this.#subscripts = sss;
    }

    get pivot() {
        return this.#pivot;
    }

    get subscripts() {
        return this.#subscripts;
    }

    toString() {
        return this.#subscripts.foldl(
            this.#pivot.toString(),
            (res, ele) => res + ele.toString()
        );
    }
}

class Identifier {
    // String value.
    #name;

    constructor(name) {
        this.#name = name;
    }

    get name() {
        return this.#name;
    }

    toString() {
        return this.#name;
    }
}

class Vector {
    // FList<Match | Map | Or>
    #exps;

    constructor(exps) {
        this.#exps = exps;
    }

    get exps() {
        return this.#exps;
    }

    toString() {
        return this.#exps.match(
            (head, tail) => 
                "[" + tail.foldl(
                    head.toString(), 
                    (res, ele) => res + ", " + ele.toString()
                ) + "]",
            () => "[]"
        );
    }
}

class Grouping {
    // Match | Map | Or
    #exp;

    constructor(exp) {
        this.#exp = exp;
    }

    get exp() {
        return this.#exp;
    }

    toString() {
        return "(" + this.#exp.toString() + ")";
    }
}

class PrimitiveValue {
    static numVal(val) {
        return new PrimitiveValue.#NumVal(val);
    }

    static stringVal(val) {
        return new PrimitiveValue.#StrVal(val);
    }

    static #DVal = class {
        #val;

        constructor(val) {
            this.#val = val;
        }

        get value() {
            return this.#val;
        }

        toString() {
            return this.#val.toString();
        }
    }

    static #BoolVal = class extends PrimitiveValue.#DVal {
        constructor(val) {
            super(val);
        }
    }

    static #NumVal = class extends PrimitiveValue.#DVal {
        constructor(val) {
            super(val);
        }
    }

    static #StrVal = class extends PrimitiveValue.#DVal {
        constructor(val) {
            super(val);
        }

        toString() {
            return "\"" + this.value + "\"";
        }
    }

    static TRUE = new PrimitiveValue.#BoolVal(true);
    static FALSE = new PrimitiveValue.#BoolVal(false);
}

class TypeSig {
    static #TypeNum = class {
        toString() {
            return Token.T_NUM.lexeme;
        }
    }

    static #TypeBool = class {
        toString() {
            return Token.T_BUL.lexeme;
        }
    }

    static #TypeStr = class {
        toString() {
            return Token.T_STR.lexeme;
        }
    }

    static NUM = new TypeSig.#TypeNum();
    static BOOL = new TypeSig.#TypeBool();
    static STR = new TypeSig.#TypeStr();

    static typeVec(it) {
        return new TypeSig.#TypeVec(it);
    }

    static typeMap(its, ot) {
        return new TypeSig.#TypeMap(its, ot);
    }

    static #TypeVec = class {
        // TypeSig | VID
        #innerType;
        constructor(it) {
            this.#innerType = it;
        }

        get innerType() {
            return this.#innerType;
        }

        toString() {
            return `[${this.#innerType.toString()}]`
        }
    }

    static #TypeMap = class {
        #inputTypes;
        #outputType;
        constructor(its, ot) {
            this.#inputTypes  = its;
            this.#outputType = ot;
        }

        get inputTypes() {
            return this.#inputTypes;
        }

        get outputType() {
            return this.#outputType;
        }

        toString() {
            let inputStr = this.#inputTypes.match(
                (head, tail) => tail.foldl(head.toString(), 
                    (res, ele) => res + ", " + ele.toString()
                ),
                () => ""
            );

            return `(${inputStr}) -> ${this.#outputType.toString()}`
        }
    }
}

module.exports = {
    Program: Program,
    Statment: Statment,
    VarDefine: VarDefine,
    Case: Case,
    Match: Match,
    Argument: Argument,
    Map: Map,
    BooleanChain: BooleanChain,
    Not: Not,
    Comparison: Comparison,
    OpChainTerm: OpChainTerm,
    OpChain: OpChain,
    Negation: Negation,
    Index: Index,
    ArgList: ArgList,
    SubScript: SubScript,
    Identifier: Identifier,
    Vector: Vector,
    Grouping: Grouping,
    PrimitiveValue: PrimitiveValue,
    TypeSig: TypeSig
}