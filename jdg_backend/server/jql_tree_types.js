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
        return this.stmts.format("\n", "", "\n");
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
    // Identifier | GenericID
    #gid;

    // Match | Map | Or
    #exp;

    constructor(gid, exp) {
        this.#gid = gid;
        this.#exp = exp;
    }

    get gid() {
        return this.#gid;
    }

    get exp() {
        return this.#exp;
    }

    toString() {
        return `define ${this.gid.toString()} as ${checkIndent(this.#exp.toString())}`;
    }
}

class TypeDef {
    // Identifier | GenericID
    #gid; 

    // Type.
    #ts;

    constructor(gid, ts) {
        this.#gid = gid;
        this.#ts = ts;
    }

    get gid() {
        return this.#gid;
    }

    get ts() {
        return this.#ts;
    }

    toString() {
        return `type ${this.#gid.toString()} as ${this.#ts.toString()}`;
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
        let type_strs = this.#args.format(", ", "(", ")");

        let body_str = this.#vdfs.foldl("", 
            (res, ele) => res + ele.toString() + "\n"
        ) + this.#exp.toString();

        return `map ${type_strs} -> ${checkIndent(body_str)}`;
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
        return this.#args.format(", ", "(", ")");
    }
}

class StaticIndex {
    // Integer.
    #index;

    constructor(index) {
        this.#index = index;
    }

    get index() {
        return this.#index;
    }

    toString() {
        return "." + this.#index;
    }
}

class SubScript {
    // Grouping | ID | Vec
    #pivot;

    // Nonempty FList<Index | ArgList | StaticIndex>
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

class ParamIdentifier {
    static genericID(bid, generics) {
        return new ParamIdentifier.#GenericID(bid, generics);
    }

    static typedID(bid, typeParams) {
        return new ParamIdentifier.#TypedID(bid, typeParams);
    }

    static #BaseID = class {
        // Identifier.
        #bid;   // Base ID value.

        constructor(bid) {
            this.#bid = bid;
        }

        get bid() {
            return this.#bid;
        }
    }

    static #GenericID = class extends ParamIdentifier.#BaseID {
        // FList<Identifier>
        #generics;

        constructor(bid, generics) {
            super(bid);
            this.#generics = generics;
        }

        get generics() {
            return this.#generics;
        }

        toString() {
            return this.bid.toString() + this.#generics.format(", ", "{", "}");
        }
    }

    static #TypedID = class extends ParamIdentifier.#BaseID {
        // FList<TypeSig>
        #typeParams;

        constructor(bid, typeParams) {
            super(bid);
            this.#typeParams = typeParams;
        }

        get typeParams() {
            return this.#typeParams;
        }

        toString() {
            return this.bid.toString() + this.#typeParams.format(", ", "{", "}");
        }
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
        return this.#exps.format();
    }
}

class Struct {
    // FList<Match | Map | Or>
    #fields;

    constructor(fields) {
        this.#fields = fields;
    }

    get fields() {
        return this.#fields;
    }

    toString() {
        return this.#fields.format(", ", "{", "}");
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

    static typeStruct(fts) {
        return new TypeSig.#TypeStruct(fts);
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
            let inputStr = this.#inputTypes.format(", ", "(", ")");

            return `${inputStr} -> ${this.#outputType.toString()}`
        }
    }

    static #TypeStruct = class {
        // Flist<type>
        #fieldTypes;

        constructor(fts) {
            this.#fieldTypes = fts;
        }

        get fieldTypes() {
            return this.#fieldTypes;
        } 

        toString() {
            return this.#fieldTypes.format(", ", "{", "}");
        }
    }
}

module.exports = {
    Program: Program,
    Statment: Statment,
    VarDefine: VarDefine,
    TypeDef: TypeDef,
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
    StaticIndex: StaticIndex,
    SubScript: SubScript,
    Identifier: Identifier,
    ParamIdentifier: ParamIdentifier,
    Vector: Vector,
    Struct: Struct,
    Grouping: Grouping,
    PrimitiveValue: PrimitiveValue,
    TypeSig: TypeSig
}