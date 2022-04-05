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

        return this.#program(true);
    }

    #error(msg) {
        this.#halted = true;
        throw new JQLParseError(this.#sc.line, msg);
    }

    #expect(token_type, msg, advance = false) {
        if (advance) this.#sc.next();

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

    #program(advance = false) {
        if (advance) this.#sc.next();

        let lines = FList.EMPTY;
        while (true) {
            switch (this.#sc.curr.token_type) {
                case TokenType.DO:
                    lines = FList.cons(new TreeTypes.Statment(this.#expression(true)), lines);
                    break;
                case TokenType.DEF:
                    lines = FList.cons(this.#varDefine(true), lines);
                    break;
                case TokenType.EOF:
                    return new TreeTypes.Program(lines.reverse());
                default:
                    this.#error("\"do\" or \"define\" tokens required in beginning of statement.");
            }
        }
    }

    #varDefine(advance = false) {
        if (advance) this.#sc.next();

        let ts = this.#typeSig();
        let id_tok = this.#expect(TokenType.VID, "Define statement missing ID.");
        this.#expect(TokenType.AS, "Define statement missing \"as\' token.", true);
        let exp = this.#expression(true);

        return new TreeTypes.VarDefine(
            new TreeTypes.Argument(ts, new TreeTypes.Identifier(id_tok.lexeme)),
            exp
        );
    }

    #typeSig(advance = false) {
        if (advance) this.#sc.next();

        let lah = this.#sc.curr;

        switch (lah.token_type) {
            case TokenType.LBR:
                let vecTS = this.#typeSig(true);
                this.#expect(TokenType.RBR, "Vector type signature not enclosed.")

                this.#sc.next() // Advance.

                return TreeTypes.TypeSig.typeVec(vecTS);
            case TokenType.LPN:
                let input_types = FList.EMPTY;

                lah = this.#sc.next();
                if (lah.token_type != TokenType.RPN) {
                    input_types = FList.cons(this.#typeSig(), input_types);

                    while (this.#sc.curr.token_type != TokenType.RPN) {
                        this.#expect(TokenType.COM, "Invalid map type input list.")
                        input_types = FList.cons(this.#typeSig(true), input_types);
                    }
                }

                this.#expect(TokenType.ARR, "\"->\" token missing from map type signature.", true);

                return TreeTypes.TypeSig.typeMap(input_types.reverse(), this.#typeSig(true));
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

    #expression(advance = false) {
        if (advance) this.#sc.next();

        // Match, Map, or ORR
        let lah = this.#sc.curr;
        switch (lah.token_type) {
            case TokenType.MAT:
                return this.#match(true);
            case TokenType.MAP:
                return this.#map(true);
            default:
                return this.#or();
        }
    }

    #match(advance = false) {
        if (advance) this.#sc.next();

        let lah = this.#sc.curr;
        let headed_match = false;
        let head = null;

        if (lah.token_type != TokenType.CAS && 
                lah.token_type != TokenType.DFT) {
            headed_match = true;
            head = this.#expression();
        }

        let cases = FList.EMPTY;

        while (true) {
            lah = this.#sc.curr;

            if (lah.token_type == TokenType.CAS) {
                let test = this.#expression(true);
                this.#expect(TokenType.ARR, "Arrow not found in case statment.");
                let conseq = this.#expression(true);

                cases = FList.cons(new TreeTypes.Case(test, conseq), cases);
            } else if (lah.token_type == TokenType.DFT) {
                this.#expect(TokenType.ARR, "Arrow not found in default statement.", true)
                return headed_match 
                    ? TreeTypes.Match.valueMatch(head, cases.reverse(), this.#expression(true)) 
                    : TreeTypes.Match.defaultMatch(cases.reverse(), this.#expression(true));
            } else {
                this.#error("Unexpected token in match statement.");
            }
        }
    }

    // Assumes map has already been read.
    #map(advance = false) {
        if (advance) this.#sc.next();

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
                        this.#typeSig(true),
                        new TreeTypes.Identifier(
                            this.#expect(TokenType.VID, "ID expected after argument type.").lexeme
                        )
                    ),
                    args
                );
            }
        }

        this.#expect(TokenType.ARR, "Arrow expected after argument list in map.", true);
        
        let defines = FList.EMPTY;
        this.#sc.next();    // Advance past arrow.

        while (this.#sc.curr.token_type == TokenType.DEF) {
            defines = FList.cons(
                this.#varDefine(true),
                defines
            );
        }

        return new TreeTypes.Map(args.reverse(), defines.reverse(), this.#expression());
    }

    #or(advance = false) {
        if (advance) this.#sc.next();

        let head = this.#and();
        let orOps = FList.cons(head, FList.EMPTY);

        while (this.#sc.curr.token_type == TokenType.OR) {
            orOps = FList.cons(this.#and(true), orOps);
        }

        return orOps.tail.isEmpty
            ? head 
            : TreeTypes.BooleanChain.orChain(orOps.reverse());
    }

    #and(advance = false) {
        if (advance) this.#sc.next();

        let head = this.#not();
        let andOps = FList.cons(head, FList.EMPTY);

        while (this.#sc.curr.token_type == TokenType.AND) {
            andOps = FList.cons(this.#not(true), andOps);
        }

        return andOps.tail.isEmpty
            ? head 
            : TreeTypes.BooleanChain.andChain(andOps.reverse());
    }

    #not(advance = false) {
        if (advance) this.#sc.next();

        return this.#sc.curr.token_type == TokenType.NOT 
            ? new TreeTypes.Not(this.#compare(true)) 
            : this.#compare();
    }

    #compare(advance = false) {
        if (advance) this.#sc.next();

        let lsum = this.#sum();

        switch (this.#sc.curr.token_type) {
            case TokenType.EQU:
                return TreeTypes.Comparison.equals(lsum, this.#sum(true));
            case TokenType.LTE:
                return TreeTypes.Comparison.ltEquals(lsum, this.#sum(true));
            case TokenType.GTE:
                return TreeTypes.Comparison.gtEquals(lsum, this.#sum(true));
            case TokenType.LT:
                return TreeTypes.Comparison.lt(lsum, this.#sum(true));
            case TokenType.GT:
                return TreeTypes.Comparison.gt(lsum, this.#sum(true));
            default:
                return lsum;
        }
    }

    #sum(advance = false) {
        if (advance) this.#sc.next();

        let head = this.#product();
        let ops = FList.EMPTY;

        while (true) {
            switch (this.#sc.curr.token_type) {
                case TokenType.PLS:
                    ops = FList.cons(
                        TreeTypes.OpChainTerm.add(this.#product(true)), 
                        ops
                    );
                    break;
                case TokenType.MIN:
                    ops = FList.cons(
                        TreeTypes.OpChainTerm.sub(this.#product(true)), 
                        ops
                    );
                    break;
                default:
                    return ops.isEmpty 
                        ? head 
                        : new TreeTypes.OpChain(head, ops.reverse());
            }
        }
    }

    #product(advance = false) {
        if (advance) this.#sc.next();

        let head = this.#negation();
        let ops = FList.EMPTY;

        while (true) {
            switch (this.#sc.curr.token_type) {
                case TokenType.TIM:
                    ops = FList.cons(
                        TreeTypes.OpChainTerm.times(this.#negation(true)),
                        ops
                    );
                    break;
                case TokenType.DIV:
                    ops = FList.cons(
                        TreeTypes.OpChainTerm.div(this.#negation(true)),
                        ops
                    );
                    break;
                case TokenType.MOD:
                    ops = FList.cons(
                        TreeTypes.OpChainTerm.mod(this.#negation(true)),
                        ops
                    );
                    break;
                default:
                    return ops.isEmpty 
                        ? head 
                        : new TreeTypes.OpChain(head, ops.reverse());
            }
        }
    }

    #negation(advance = false) {
        if (advance) this.#sc.next();

        return this.#sc.curr.token_type == TokenType.MIN 
            ? new TreeTypes.Negation(this.#term(true))
            : this.#term();
    }

    #term(advance = false) {
        if (advance) this.#sc.next();

        let lah = this.#sc.curr;

        switch (lah.token_type) {
            case TokenType.BLV:
                this.#sc.next();
                return lah == Token.T_TRU 
                    ? TreeTypes.PrimitiveValue.TRUE 
                    : TreeTypes.PrimitiveValue.FALSE;
            case TokenType.NMV:
                this.#sc.next();
                return TreeTypes.PrimitiveValue.numVal(
                    parseFloat(lah.lexeme)
                );
            case TokenType.STV:
                this.#sc.next();
                return TreeTypes.PrimitiveValue.stringVal(
                    lah.lexeme.substring(1, lah.lexeme.length - 1)
                );
            default:
                return this.#application();
        }
    }

    #application(advance = false) {
        if (advance) this.#sc.next();

        this.#sc.next();
        return new TreeTypes.Identifier("F");
    }
}

var pr = `
do "asf"
`

console.log((new JQLParser(pr)).parse().toString());