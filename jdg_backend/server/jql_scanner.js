class TokenType {
    static DO = new TokenType("<DO>");
    static AS = new TokenType("<AS>");
    static DEF = new TokenType("<DEF>");
    static MAT = new TokenType("<MAT>");
    static CAS = new TokenType("<CAS>");
    static DFT = new TokenType("<DFT>");
    static OR = new TokenType("<OR>");
    static AND = new TokenType("<AND>");
    static NOT = new TokenType("<NOT>");
    static VEC = new TokenType("<VEC>");
    static MAP = new TokenType("<MAP>");
    static NUM = new TokenType("<NUM>");
    static BUL = new TokenType("<BUL>");
    static STR = new TokenType("<STR>");

    static LPN = new TokenType("<LPN>");
    static RPN = new TokenType("<RPN>");
    static COM = new TokenType("<COM>");
    static ARR = new TokenType("<ARR>");
    static EQU = new TokenType("<EQU>");
    static LTE = new TokenType("<LTE>");
    static GTE = new TokenType("<GTE>");
    static LT = new TokenType("<LT>");
    static GT = new TokenType("<GT>");
    static PLS = new TokenType("<PLS>");
    static MIN = new TokenType("<MIN>");
    static TIM = new TokenType("<TIM>");
    static DIV = new TokenType("<DIV>");
    static MOD = new TokenType("<MOD>");
    static LBR = new TokenType("<LBR>");
    static RBR = new TokenType("<RBR>");

    static EOF = new TokenType("<EOF>");

    static STV = new TokenType("<STV>");
    static NMV = new TokenType("<NMV>");
    static BLV = new TokenType("BLV");
    static VID = new TokenType("<VID>");


    constructor(name) {
        this.name = name;
    }
}

class Token {
    static T_DO = new Token("do", DO);
    static T_AS = new Token("as", AS);
    static T_DEF = new Token("define", DEF);
    static T_MAT = new Token("match", MAT);
    static T_CAS = new Token("case", CAS);
    static T_DFT = new Token("default", DFT);
    static T_OR = new Token("or", OR);
    static T_AND = new Token("and", AND);
    static T_NOT = new Token("not", NOT);
    static T_VEC = new Token("vec", VEC);
    static T_MAP = new Token("map", MAP);
    static T_NUM = new Token("num", NUM);
    static T_BUL = new Token("bool", BUL);
    static T_STR = new Token("str", STR);

    static T_LPN = new Token("(", LPN);
    static T_RPN = new Token(")", RPN);
    static T_COM = new Token(",", COM);
    static T_ARR = new Token("->", ARR);
    static T_EQU = new Token("=", EQU);
    static T_LTE = new Token("<=", LTE);
    static T_GTE = new Token(">=", GTE);
    static T_LT = new Token("<", LT);
    static T_GT = new Token(">", GT);
    static T_PLS = new Token("+", PLS);
    static T_MIN = new Token("-", MIN);
    static T_TIM = new Token("*", TIM);
    static T_DIV = new Token("/", DIV);
    static T_MOD = new Token("%", MOD);
    static T_LBR = new Token("[", LBR);
    static T_RBR = new Token("]", RBR);

    static T_EOF = new Token("\\0", EOF);

    constructor(lex, tt) {
        this.lexeme = lex;
        this.token_type = tt;
    }
}

class JQLScanner {
    constructor(data) {
        this.data = "CHANGE MEEEEEEEEEEEEEEEEEEE";
        this.ind = 0;
        this.line = 1;
        this.halted = false;
    }

    error(msg) {
        this.halted = true;
        return [null, this.line + " : " + msg];
    } 

    // Next token returns a list with two elements...
    //               [token, error]
    // If token is null, the error string will be populated.
    // If a token is found, the error string will be null.
    // Once one error has been found, this scanner will be halted.
    // Every call to nextToken() after this point will return an error.
    //
    // The scanner automatically halts after returning the EOF character.
    nextToken() {
        if (this.halted) {
            return this.error("Scanner has been halted.");
        }

        // Get first non whitespace character.
        // Count line breaks as well.
        let c = null;
        while (this.ind < this.data.length && 
            /\s/.test(c = this.data[this.ind++])) {
            if (c == "\n") this.line++;
        }

        if (this.ind == this.data.length) {
            this.halted = true;
            return [T_EOF, null]
        }

        switch (c) {
            case "(":
                return [T_LPN, null];
            case ")":
                return [T_RPN, null];
            case ",":
                return [T_COM, null];
            case "=":
                return [T_EQU, null];
            case "+":
                return [T_PLS, null];
            case "*":
                return [T_TIM, null];
            case "%":
                return [T_MOD, null];
            case "/":
                return [T_DIV, null];
            case "[":
                return [T_LBR, null];
            case "]":
                return [T_RBR, null];
            case "-":
                if (this.ind == this.data.length) {
                    return [T_MIN, null];
                }

                let n = this.data[this.ind];

                if (n == ">") {
                    this.ind++;
                    return [T_ARR, null];
                }

                return [T_MIN, null];
            case ">":
            case "<":
                if (this.ind == this.data.length) {
                    return [T_MIN, null];
                }

                let n = this.data[this.ind];

                if (n == "=") {
                    this.ind++;
                    return [c == "<" ? T_LTE : T_GTE, null];
                }

                return [c == "<" ? T_LT : T_GT, null];
            case "\"":
                let lex = c;
                while (this.ind < this.data.length) {
                    let n = this.data[this.ind++];
                    if (n == "\n") {
                        return this.error("Strings cannot be multi line.");
                    }

                    lex += n;

                    if (n == "\"") {
                        return [new Token(lex, STV), null];
                    }
                }

                return this.error("String missing closing quote.");
            default:
                // Number or ID or reserved word case!
        }
    }
}

console.log(a.nextToken());


module.exports.TokenType = TokenType;
