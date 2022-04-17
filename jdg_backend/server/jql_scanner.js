const { Try, JQLError } = require("./utils");

class JQLSyntaxError extends JQLError {
    constructor(line, msg) {
        super(line, msg);
    }
}

class TokenType {
    static DO = new TokenType("<DO>");
    static AS = new TokenType("<AS>");
    static DEF = new TokenType("<DEF>");
    static TYP = new TokenType("<TYP>");
    static MAT = new TokenType("<MAT>");
    static CAS = new TokenType("<CAS>");
    static DFT = new TokenType("<DFT>");
    static OR = new TokenType("<OR>");
    static AND = new TokenType("<AND>");
    static NOT = new TokenType("<NOT>");
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
    static LCB = new TokenType("<LCB>");
    static RCB = new TokenType("<RCB>");

    static EOF = new TokenType("<EOF>");

    static STV = new TokenType("<STV>");
    static NMV = new TokenType("<NMV>");
    static BLV = new TokenType("<BLV>");
    static IID = new TokenType("<IID>");

    // static index.
    static STI = new TokenType("<STI>");
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

class Token {
    static T_DO = new Token("do", TokenType.DO);
    static T_AS = new Token("as", TokenType.AS);
    static T_DEF = new Token("define", TokenType.DEF);
    static T_TYP = new Token("type", TokenType.TYP);
    static T_MAT = new Token("match", TokenType.MAT);
    static T_CAS = new Token("case", TokenType.CAS);
    static T_DFT = new Token("default", TokenType.DFT);
    static T_OR = new Token("or", TokenType.OR);
    static T_AND = new Token("and", TokenType.AND);
    static T_NOT = new Token("not", TokenType.NOT);
    // static T_VEC = new Token("vec", TokenType.VEC);
    static T_MAP = new Token("map", TokenType.MAP);
    static T_NUM = new Token("num", TokenType.NUM);
    static T_BUL = new Token("bool", TokenType.BUL);
    static T_STR = new Token("str", TokenType.STR);

    static T_TRU = new Token("true", TokenType.BLV);
    static T_FAL = new Token("false", TokenType.BLV);

    static RESERVED_WORDS = [
        Token.T_DO, Token.T_AS, Token.T_DEF, 
        Token.T_MAT, Token.T_CAS, Token.T_DFT, 
        Token.T_OR, Token.T_AND, Token.T_NOT,
        Token.T_NUM, Token.T_BUL, Token.T_STR,
        Token.T_TRU, Token.T_FAL, Token.T_MAP,
        Token.T_TYP
    ];

    static T_LPN = new Token("(", TokenType.LPN);
    static T_RPN = new Token(")", TokenType.RPN);
    static T_COM = new Token(",", TokenType.COM);
    static T_ARR = new Token("->", TokenType.ARR);
    static T_EQU = new Token("=", TokenType.EQU);
    static T_LTE = new Token("<=", TokenType.LTE);
    static T_GTE = new Token(">=", TokenType.GTE);
    static T_LT = new Token("<", TokenType.LT);
    static T_GT = new Token(">", TokenType.GT);
    static T_PLS = new Token("+", TokenType.PLS);
    static T_MIN = new Token("-", TokenType.MIN);
    static T_TIM = new Token("*", TokenType.TIM);
    static T_DIV = new Token("/", TokenType.DIV);
    static T_MOD = new Token("%", TokenType.MOD);
    static T_LBR = new Token("[", TokenType.LBR);
    static T_RBR = new Token("]", TokenType.RBR);
    static T_LCB = new Token("{", TokenType.LCB);
    static T_RCB = new Token("}", TokenType.RCB);

    static T_EOF = new Token("\\0", TokenType.EOF);

    #token_type;
    #lexeme;

    constructor(lex, tt) {
        this.#lexeme = lex;
        this.#token_type = tt;
    }

    get token_type() {
        return this.#token_type;
    }

    get lexeme() {
        return this.#lexeme;
    }
}

const RESERVED_WORDS_DICT = {}

for (let rwt of Token.RESERVED_WORDS) {
    RESERVED_WORDS_DICT[rwt.lexeme] = rwt;
}

class JQLScanner {
    static #STARTING_TOKEN = Try.failure("No tokens loaded yet.");

    #data;
    #ind;
    #line;
    #halted;
    #curr; // Try holding the last token to be read.

    constructor(data) {
        this.#data = data;
        this.#ind = 0;
        this.#line = 1;
        this.#halted = false;

        this.#curr = JQLScanner.#STARTING_TOKEN;
    }

    get line() {
        return this.#line;
    }

    get halted() {
        return this.#halted;
    }

    get curr() {
        return this.#curr;
    }

    #error(msg) {
        this.#halted = true;
        throw new JQLSyntaxError(this.#line, msg);
    } 

    #find(token) {
        this.#curr = token;
        return this.#curr;
    }

    // The scanner automatically halts after returning the EOF character.
    // next returns a Try which either contains the read token or an error.
    next() {
        if (this.#halted) {
            throw new JQLSyntaxError(0, "Scanner has been halted.");
        }

        // Get first non whitespace character.
        // Count line breaks as well.
        let c = null;
        while (this.#ind < this.#data.length && 
            /\s/.test(c = this.#data[this.#ind++])) {
            if (c == "\n") this.#line++;
        }
        
        // If c is whitespace or null, we know we've reached
        // the end of the data string.
        if (c == null || /\s/.test(c)) {
            this.#halted = true;
            return this.#find(Token.T_EOF);
        }

        let n = null;

        switch (c) {
            case "(":
                return this.#find(Token.T_LPN);
            case ")":
                return this.#find(Token.T_RPN);
            case ",":
                return this.#find(Token.T_COM);
            case "=":
                return this.#find(Token.T_EQU);
            case "+":
                return this.#find(Token.T_PLS);
            case "*":
                return this.#find(Token.T_TIM);
            case "%":
                return this.#find(Token.T_MOD);
            case "/":
                return this.#find(Token.T_DIV);
            case "[":
                return this.#find(Token.T_LBR);
            case "]":
                return this.#find(Token.T_RBR);
            case "{":
                return this.#find(Token.T_LCB);
            case "}":
                return this.#find(Token.T_RCB);
            case "-":
                if (this.#ind == this.#data.length) {
                    return this.#find(Token.T_MIN);
                }

                n = this.#data[this.#ind];

                if (n == ">") {
                    this.#ind++;
                    return this.#find(Token.T_ARR);
                }

                return this.#find(Token.T_MIN);
            case ">":
            case "<":
                if (this.#ind < this.#data.length) {
                    n = this.#data[this.#ind];

                    if (n == "=") {
                        this.#ind++;
                        return this.#find(c == "<" ? Token.T_LTE : Token.T_GTE);
                    }
                }

                return this.#find(c == "<" ? Token.T_LT : Token.T_GT);
            case "\"":
                let lex = c;
                while (this.#ind < this.#data.length) {
                    n = this.#data[this.#ind++];
                    if (n == "\n") {
                        this.#error("Strings cannot be multi line.");
                    }

                    lex += n;

                    if (n == "\"") {
                        return this.#find(new Token(lex, TokenType.STV));
                    }
                }

                this.#error("String missing closing quote.");
            case ".": // Static index case.
                return this.#find(new Token("." + this.#expectInteger(), TokenType.STI));
            default:
                return this.#nextNumResOrID(c);
        }
    }

    #expectInteger() {
        if (this.#data[this.#ind] == "0") {
            this.#ind++;
            return "0";
        }

        let digits = this.#readDigits();

        if (digits.length == 0) {
            this.#error("Integer expected!");
        }

        return digits;
    }

    #readDigits() {
        let digits = "";
        let c = "";

        while (this.#ind < this.#data.length && 
            /[0-9]/.test(c = this.#data[this.#ind])) {
            digits += c;
            this.#ind++;
        }

        return digits;
    }

    // Scan for a number, reserved word, or ID.
    // c is the last character to be read.
    #nextNumResOrID(c) {
        let lex = c;

        // Number case.
        if (/[0-9]/.test(c)) {
            if (c != "0") {
                lex += this.#readDigits();
            }

            // this.#ind will always equal the index of the next unread
            // character.

            if (this.#ind == this.#data.length) {
                return this.#find(new Token(lex, TokenType.NMV));
            }

            c = this.#data[this.#ind];

            // With no decimal point, stop here.
            // If the decimal point is the last character of the string,
            // it is impossible the decimal point will be added to this token.

            if (c != "." || this.#ind == this.#data.length - 1) {
                return this.#find(new Token(lex, TokenType.NMV));
            }
            
            // With a decimal point, we should only add it to the lexeme
            // if digits follow.

            let lookahead = this.#data[this.#ind + 1];

            if (/[0-9]/.test(lookahead)) {
                this.#ind += 2;
                lex += "." + lookahead;
                lex += this.#readDigits();
            }

            // If no digits followed the decimal, simply return the original lex.

            return this.#find(new Token(lex, TokenType.NMV));
        }

        // ID/reserved word case.
        if (/[a-zA-Z_]/.test(c)) {
            while (this.#ind < this.#data.length && 
                /[a-zA-Z0-9_]/.test(c = this.#data[this.#ind])) {
                lex += c;
                this.#ind++;
            }

            if (lex in RESERVED_WORDS_DICT) {
                return this.#find(RESERVED_WORDS_DICT[lex]);
            }

            return this.#find(new Token(lex, TokenType.IID));
        }

        this.#error("Invalid token starting character " + c + ".");
    }
}

module.exports.TokenType = TokenType;
module.exports.Token = Token;
module.exports.JQLScanner = JQLScanner;
module.exports.JQLSyntaxError = JQLSyntaxError;
