const { TokenType, JQLScanner, Token } = require("./jql_scanner");
const TreeTypes = require("./jql_tree_types");
const { FList, Try, JQLError } = require("./utils");

class JQLParseError extends JQLError {
    constructor(line, msg) {
        super(line, msg);
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
        if (this.#halted) {
            throw new JQLParseError(0, "Parser has been halted.")
        }

        return this.#Program();
    }

    #error(msg) {
        this.#halted = true;
        throw new JQLParseError(this.#sc.line, msg);
    }

    #Expect(token_type, msg) {
        this.#sc.next();
        this.#expect(token_type, msg);
    }

    #expect(token_type, msg) {
        let token = this.#sc.curr;

        if (token.token_type != token_type) {
            let mismatch_str = 
                `Expected : ${token_type.toString()}, Found : ${token.token_type.toString()}`;
            this.#error(mismatch_str + "\n" + msg);
        }

        return token;
    }

    // Uppercase letters denote that we know said type is coming.
    // (That is the current lookahead will be overwritten)
    // Lowercase letters denote that the current lookahead will be used.

    #Program() {
        this.#sc.next();
        return this.#program();
    }

    #program() {
        let lines = FList.EMPTY;
        while (true) {
            switch (this.#sc.curr.token_type) {
                case TokenType.DO:
                    lines = FList.cons(new TreeTypes.Statment(this.#Expression()), lines);
                    break;
                case TokenType.DEF:
                    lines = FList.cons(this.#VarDefine(), lines);
                    break;
                case TokenType.EOF:
                    return new TreeTypes.Program(lines.reverse());
                default:
                    this.#error("\"do\" or \"define\" tokens required in beginning of statement.");
            }
        }
    }

    #VarDefine() {
        this.#sc.next();
        return this.#varDefine();
    }

    #varDefine() {
        let ts = this.#typeSig();
        let id_tok = this.#expect(TokenType.VID, "Define statement missing ID.");
        this.#Expect(TokenType.AS, "Define statement missing \"as\' token.");
        let exp = this.#Expression();

        return new TreeTypes.VarDefine(
            new TreeTypes.Argument(ts, new TreeTypes.Identifier(id_tok.lexeme)),
            exp
        );
    }

    #TypeSig() {
        this.#sc.next();
        return this.#typeSig();
    }

    #typeSig() {
        let lah = this.#sc.curr;

        switch (lah.token_type) {
            case TokenType.LBR:
                let vecTS = this.#TypeSig();
                this.#expect(TokenType.RBR, "Vector type signature not enclosed.")

                this.#sc.next() // Advance.

                return TreeTypes.TypeSig.typeVec(vecTS);
            case TokenType.LPN:
                let input_types = FList.EMPTY;

                lah = this.#sc.next();
                if (lah.token_type != TokenType.RPN) {
                    input_types = FList.cons(this.#typeSig(), input_types);

                    while (true) {
                        lah = this.#sc.curr;

                        if (lah.token_type == TokenType.RPN) {
                            break;
                        }

                        if (lah.token_type != TokenType.COM) {
                            this.#error("Invalid map type input list.");
                        }

                        input_types = FList.cons(this.#TypeSig(), input_types);
                    }
                }

                this.#Expect(TokenType.ARR, "\"->\" token missing from map type signature.");

                return TreeTypes.TypeSig.typeMap(input_types.reverse(), this.#TypeSig());
            case TokenType.NUM:
                this.#sc.next(); // Advance.
                return TreeTypes.TypeSig.NUM;
            case TokenType.STR:
                this.#sc.next(); // Advance.
                return TreeTypes.TypeSig.STR;
            case TokenType.BUL:
                this.#sc.next(); // Advance.
                return TreeTypes.TypeSig.BOOL;
            case TokenType.VID:
                this.#sc.next(); // Advance.
                return new TreeTypes.Identifier(lah.lexeme);
            default:
                this.#error("Cannot parse type signature.")
        }
    }

    #Expression() {
        this.#sc.next();
        return this.#expresssion();
    }

    #expresssion() {
        // Match, Map, or ORR
        let lah = this.#sc.curr;
        switch (lah.token_type) {
            case TokenType.MAT:
                return this.#Match();
            case TokenType.MAP:
                return this.#Map();
            default:
                return this.#or();
        }
    }

    // Assumes match keyword has already been read.
    #Match() {
        this.#sc.next();
        return this.#match();
    }

    #match() {
        let lah = this.#sc.curr;
        let headed_match = false;
        let head = null;

        if (lah.token_type != TokenType.CAS && 
                lah.token_type != TokenType.DFT) {
            headed_match = true;
            head = this.#expresssion();
        }

        let cases = FList.EMPTY;

        while (true) {
            lah = this.#sc.curr;

            if (lah.token_type == TokenType.CAS) {
                let test = this.#Expression();
                this.#expect(TokenType.ARR, "Arrow not found in case statment.");
                let conseq = this.#Expression();

                cases = FList.cons(new TreeTypes.Case(test, conseq), cases);
            } else if (lah.token_type == TokenType.DFT) {
                this.#Expect(TokenType.ARR, "Arrow not found in default statement.")
                return headed_match 
                    ? TreeTypes.Match.valueMatch(head, cases.reverse(), this.#Expression()) 
                    : TreeTypes.Match.defaultMatch(cases.reverse(), this.#Expression());
            } else {
                this.#error("Unexpected token in match statement.");
            }
        }
    }

    // Assumes map keyword has already been read.
    #Map() {
        this.#sc.next();
        return this.#map();
    }

    #map() {
        this.#expect(TokenType.LPN, "Map does not have argument list.");
        let args = FList.EMPTY;

        if (this.#sc.next().token_type != TokenType.RPN) {
            args = FList.cons(
                new TreeTypes.Argument(
                    this.#typeSig(), 
                    new TreeTypes.Identifier(
                        this.#expect(TokenType.VID, "ID expected after argument type.").lexeme
                    )
                ),
                args
            );

            while (this.#sc.next().token_type != TokenType.RPN) {
                this.#expect(TokenType.COM, "Expected comma in argument list.")
                
                args = FList.cons(
                    new TreeTypes.Argument(
                        this.#TypeSig(),
                        new TreeTypes.Identifier(
                            this.#expect(TokenType.VID, "ID expected after argument type.").lexeme
                        )
                    ),
                    args
                );
            }
        }

        this.#Expect(TokenType.ARR, "Arrow expected after argument list in map.");
        
        let defines = FList.EMPTY;
        this.#sc.next();    // Advance past arrow.

        while (this.#sc.curr.token_type == TokenType.DEF) {
            defines = FList.cons(
                this.#VarDefine(),
                defines
            );
        }

        return new TreeTypes.Map(args.reverse(), defines.reverse(), this.#expresssion());
    }

    #Or() {
        this.#sc.next();
        return this.#or();
    }

    #or() {
        this.#sc.next();
        return TreeTypes.BooleanChain.orChain(FList.of("1", "2"));
    }
}

var pr = `
do match case 1 -> 3 default -> map (num x) -> define num y as 3 y
define num x as map (num z) -> z
`

console.log((new JQLParser(pr)).parse().toString());