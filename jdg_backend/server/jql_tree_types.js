const {Token} = require("./jql_scanner");

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

    accept(visitor) {
        return visitor.visitProgram(this);
    }

    toString() {
        return this.stmts.format("\n", "", "\n");
    }
}

class Statement {
    // Match | Map | Or
    #exp;

    constructor(exp) {
        this.#exp = exp;
    }

    get exp() {
        return this.#exp;
    }

    accept(visitor) {
        return visitor.visitStatement(this);
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

    accept(visitor) {
        return visitor.visitVarDefine(this);
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

    accept(visitor) {
        return visitor.visitTypeDef(this);
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

    accept(visitor) {
        return visitor.visitCase(this);
    }

    toString() {
        return "case " + checkIndent(this.test.toString()) + "\n-> " + 
            checkIndent(this.conseq.toString());
    }
}

class Match {
    static defaultMatch(c, dc) {
        return new Match.#DefaultMatch(c, dc);
    }

    static valueMatch(p, c, dc) {
        return new Match.#ValueMatch(p, c, dc);
    }

    static #DefaultMatch = class {
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

        accept(visitor) {
            return visitor.visitDefaultMatch(this);
        }

        toString() {
            return "match" + 
                    this.#cases.foldl("", 
                        (res, ele) => res + "\n" + ele.toString()) + 
                    "\ndefault\n-> " + checkIndent(this.#defaultCase.toString());
        }
    };

    static #ValueMatch = class extends Match.#DefaultMatch {
        // Match | Map | Or
        #pivot;

        constructor(p, c, dc) {
            super(c, dc);
            this.#pivot = p;
        }

        get pivot() {
            return this.#pivot;
        }

        accept(visitor) {
            return visitor.visitValueMatch(this);
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

    accept(visitor) {
        return visitor.visitArgument(this);
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

    accept(visitor) {
        return visitor.visitMap(this);
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

        accept(visitor) {
            throw new Error("Default chain cannot be visited.");
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

        accept(visitor) {
            return visitor.visitOrChain(this);
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

        accept(visitor) {
            return visitor.visitAndChain(this);
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

    accept(visitor) {
        return visitor.visitNot(this);
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

        accept(visitor) {
            throw new Error("Defualt compare cannot be visited.");
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

        accept(visitor) {
            return visitor.visitEq(this);
        }
    };

    static #LtEq = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_LTE.lexeme;
        }

        accept(visitor) {
            return visitor.visitLtEq(this);
        }
    };

    static #GtEq = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_GTE.lexeme;
        }

        accept(visitor) {
            return visitor.visitGtEq(this);
        }
    };

    static #Lt = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_LT.lexeme;
        }

        accept(visitor) {
            return visitor.visitLt(this);
        }
    };

    static #Gt = class extends Comparison.#DefCmp {
        constructor(lsum, rsum) {
            super(lsum, rsum);
        }

        get opLex() {
            return Token.T_GT.lexeme;
        }

        accept(visitor) {
            return visitor.visitGt(this);
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

        accept(visitor) {
            throw new Error("Default Chain Term cannot be visited.");
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

        accept(visitor) {
            return visitor.visitAddCT(this);
        }
    }

    static #SubCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_MIN.lexeme;
        }

        accept(visitor) {
            return visitor.visitSubCT(this);
        }
    }

    static #TimesCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_TIM.lexeme;
        }

        accept(visitor) {
            return visitor.visitTimesCT(this);
        }
    }

    static #DivCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_DIV.lexeme;
        }

        accept(visitor) {
            return visitor.visitDivCT(this);
        }
    }

    static #ModCT = class extends OpChainTerm.#DefOpCT {
        constructor(val) {
            super(val);
        }

        get opLex() {
            return Token.T_MOD.lexeme;
        }

        accept(visitor) {
            return visitor.visitModCT(this);
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

    accept(visitor) {
        return visitor.visitOpChain(this);
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

    accept(visitor) {
        return visitor.visitNegation(this);
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

    accept(visitor) {
        return visitor.visitIndex(this);
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

    accept(visitor) {
        return visitor.visitArgList(this);
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

    accept(visitor) {
        return visitor.visitStaticIndex(this);
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

    accept(visitor) {
        return visitor.visitSubScript(this);
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

    accept(visitor) {
        return visitor.visitIdentifier(this);
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

        accept(visitor) {
            throw new Error("Base Param ID cannot be visited.");
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

        accept(visitor) {
            return visitor.visitGenericID(this);
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

        accept(visitor) {
            return visitor.visitTypedID(this);
        }

        toString() {
            return this.bid.toString() + this.#typeParams.format(", ", "{", "}");
        }
    }
}

class Vector {
    // TypeSignature
    #ts;

    // FList<Match | Map | Or>
    #exps;

    constructor(ts, exps) {
        this.#ts = ts;
        this.#exps = exps;
    }

    get ts() {
        return this.#ts;
    }

    get exps() {
        return this.#exps;
    }

    accept(visitor) {
        return visitor.visitVector(this);
    }

    toString() {
        return `vec{${this.#ts.toString()}}${this.#exps.format()}`;
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

    accept(visitor) {
        return visitor.visitStruct(this);
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

    accept(visitor) {
        return visitor.visitGrouping(this);
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

        accept(visitor) {
            throw new Error("Dynamic Value cannot be visited.");
        }

        toString() {
            return this.#val.toString();
        }
    }

    static #BoolVal = class extends PrimitiveValue.#DVal {
        constructor(val) {
            super(val);
        }

        accept(visitor) {
            return visitor.visitBoolVal(this);
        }
    }

    static #NumVal = class extends PrimitiveValue.#DVal {
        constructor(val) {
            super(val);
        }

        accept(visitor) {
            return visitor.visitNumVal(this);
        }
    }

    static #StrVal = class extends PrimitiveValue.#DVal {
        constructor(val) {
            super(val);
        }

        accept(visitor) {
            return visitor.visitStrVal(this);
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
        accept(visitor) {
            return visitor.visitTypeNum(this);
        }

        toString() {
            return Token.T_NUM.lexeme;
        }
    }

    static #TypeBool = class {
        accept(visitor) {
            return visitor.visitTypeBool(this);
        }

        toString() {
            return Token.T_BUL.lexeme;
        }
    }

    static #TypeStr = class {
        accept(visitor) {
            return visitor.visitTypeStr(this);
        }

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

        accept(visitor) {
            return visitor.visitTypeVec(this);
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

        accept(visitor) {
            return visitor.visitTypeMap(this);
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

        accept(visitor) {
            return visitor.visitTypeStruct(this);
        }

        toString() {
            return this.#fieldTypes.format(", ", "{", "}");
        }
    }
}

const NOT_IMPLEMENTED_ERROR = new Error("Visitor not implemented.");

class TreeVisitor {
    visitProgram(program) { throw NOT_IMPLEMENTED_ERROR; }
    visitStatement(statement) { throw NOT_IMPLEMENTED_ERROR; }
    visitVarDefine(varDefine) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeDef(typeDef) { throw NOT_IMPLEMENTED_ERROR; }
    visitCase(cas) { throw NOT_IMPLEMENTED_ERROR; }
    visitDefaultMatch(defMatch) { throw NOT_IMPLEMENTED_ERROR; }
    visitValueMatch(valMatch) { throw NOT_IMPLEMENTED_ERROR; }
    visitArgument(arg) { throw NOT_IMPLEMENTED_ERROR; }
    visitMap(map) { throw NOT_IMPLEMENTED_ERROR; }
    visitOrChain(orChain) { throw NOT_IMPLEMENTED_ERROR; }
    visitAndChain(andChain) { throw NOT_IMPLEMENTED_ERROR; }
    visitNot(not) { throw NOT_IMPLEMENTED_ERROR; }
    visitEq(eq) { throw NOT_IMPLEMENTED_ERROR; }
    visitLtEq(ltEq) { throw NOT_IMPLEMENTED_ERROR; }
    visitGtEq(gtEq) { throw NOT_IMPLEMENTED_ERROR; }
    visitLt(lt) { throw NOT_IMPLEMENTED_ERROR; }
    visitGt(gt) { throw NOT_IMPLEMENTED_ERROR; }
    visitAddCT(addCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitSubCT(subCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitTimesCT(timesCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitDivCT(divCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitModCT(modCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitOpChain(opChain) { throw NOT_IMPLEMENTED_ERROR; }
    visitNegation(negation) { throw NOT_IMPLEMENTED_ERROR; }
    visitIndex(index) { throw NOT_IMPLEMENTED_ERROR; }
    visitArgList(argList) { throw NOT_IMPLEMENTED_ERROR; }
    visitStaticIndex(staticIndex) { throw NOT_IMPLEMENTED_ERROR; }
    visitSubScript(subscript) { throw NOT_IMPLEMENTED_ERROR; }
    visitIdentifier(identifier) { throw NOT_IMPLEMENTED_ERROR; }
    visitGenericID(gid) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypedID(typedID) { throw NOT_IMPLEMENTED_ERROR; }
    visitVector(vector) { throw NOT_IMPLEMENTED_ERROR; }
    visitStruct(struct) { throw NOT_IMPLEMENTED_ERROR; }
    visitGrouping(grouping) { throw NOT_IMPLEMENTED_ERROR; }
    visitBoolVal(boolVal) { throw NOT_IMPLEMENTED_ERROR; }
    visitNumVal(numVal) { throw NOT_IMPLEMENTED_ERROR; }
    visitStrVal(strVal) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeNum(typeNum) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeBool(typeBool) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeStr(typeStr) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeVec(typeVec) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeMap(typeMap) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeStruct(typeStruct) { throw NOT_IMPLEMENTED_ERROR; }
}

module.exports = {
    Program: Program,
    Statment: Statement,
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
    TypeSig: TypeSig,
    TreeVisitor: TreeVisitor
}