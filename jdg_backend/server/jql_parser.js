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

        // Throw out expected token from scanner.
        this.#sc.next();

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
                case TokenType.TYP:
                    lines = FList.cons(this.#typeDef(true), lines);
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
        this.#expect(TokenType.AS, "Define statement missing \"as\' token.");
        let exp = this.#expression();

        return new TreeTypes.VarDefine(
            new TreeTypes.Argument(ts, new TreeTypes.Identifier(id_tok.lexeme)),
            exp
        );
    }

    #typeDef(advance = false) {
        if (advance) this.#sc.next();

        let vid_t = this.#expect(TokenType.VID, "ID missing from type definition.");
        this.#expect(TokenType.AS, "\"as\" missing from type definition.");
        let ts = this.#typeSig();

        return new TreeTypes.TypeDef(new TreeTypes.Identifier(vid_t.lexeme), ts);
    }

    #typeSig(advance = false) {
        if (advance) this.#sc.next();

        let lah = this.#sc.curr;

        switch (lah.token_type) {
            case TokenType.LBR:
                let vecTS = this.#typeSig(true);
                this.#expect(TokenType.RBR, "Vector type signature not enclosed.")
                return TreeTypes.TypeSig.typeVec(vecTS);
            case TokenType.LPN:
                let arg_types = FList.EMPTY;
                
                if (this.#sc.next().token_type != TokenType.RPN) {
                    arg_types = this.#typeList();
                }

                this.#expect(TokenType.RPN, "Argument types should be followed by \")\".")
                this.#expect(TokenType.ARR, "\"->\" token missing from map type signature.");

                return TreeTypes.TypeSig.typeMap(arg_types.reverse(), this.#typeSig());
            case TokenType.LCB:
                let field_types = FList.EMPTY;

                if (this.#sc.next().token_type != TokenType.RCB) {
                    field_types = this.#typeList();
                }
                
                this.#expect(TokenType.RCB, "Field types should be followed by \"}\".")
                return TreeTypes.TypeSig.typeStruct(field_types);
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

    #typeList(advance = false) {
        if (advance) this.#sc.next();

        let tsl = FList.cons(this.#typeSig(), FList.EMPTY);

        while (this.#sc.curr.token_type == TokenType.COM) {
            tsl = FList.cons(this.#typeSig(true), tsl);
        }

        return tsl;
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

        while (this.#sc.curr.token_type != TokenType.DFT) {
            this.#expect(TokenType.CAS, "Case statement expected.");
            let test = this.#expression();
            this.#expect(TokenType.ARR, "Arrow not found in case statment.");
            let conseq = this.#expression();
            cases = FList.cons(new TreeTypes.Case(test, conseq), cases);
        }

        // If we are here, we know the DFT has been found.
        this.#expect(TokenType.ARR, "Arrow not found in default case.", true);
        return headed_match 
            ? TreeTypes.Match.valueMatch(head, cases.reverse(), this.#expression()) 
            : TreeTypes.Match.defaultMatch(cases.reverse(), this.#expression());
    }

    // Assumes map has already been read.
    #map(advance = false) {
        if (advance) this.#sc.next();

        this.#expect(TokenType.LPN, "Map does not have argument list.");
        let args = FList.EMPTY;

        if (this.#sc.curr.token_type != TokenType.RPN) {
            args = FList.cons(this.#arg(), FList.EMPTY);

            while (this.#sc.curr.token_type != TokenType.RPN) {
                this.#expect(TokenType.COM, "Expected comma in argument list.")
                args = FList.cons(this.#arg(), args);
            }
        }

        // We only make it here if an RPN has been found.
        // Thus, no need to check for it here. Just skip to arrow.

        this.#expect(TokenType.ARR, "Arrow expected after argument list in map.", true);
        
        let defines = FList.EMPTY;

        while (this.#sc.curr.token_type == TokenType.DEF) {
            defines = FList.cons(
                this.#varDefine(true),
                defines
            );
        }

        return new TreeTypes.Map(args.reverse(), defines.reverse(), this.#expression());
    }

    #arg(advance = false) {
        if (advance) this.#sc.next();

        let ts = this.#typeSig();
        let vid_t = this.#expect(TokenType.VID, "Argument expects ID.");

        return new TreeTypes.Argument(ts, new TreeTypes.Identifier(vid_t.lexeme));
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

        let pivot = this.#addressable();
        let sss = FList.EMPTY;

        while (true) {
            switch (this.#sc.curr.token_type) {
                case TokenType.LBR:
                    // Index required here.
                    let index = this.#expression(true);
                    this.#expect(TokenType.RBR, "Index must be enclosed by \"]\"");
                    sss = FList.cons(new TreeTypes.Index(index), sss);
                    break;
                case TokenType.LPN:
                    let args = FList.EMPTY;
                    if (this.#sc.next().token_type != TokenType.RPN) {
                        args = this.#expList();
                    }
                    this.#expect(TokenType.RPN, "Argument list must be followed by \")\".");
                    sss = FList.cons(new TreeTypes.ArgList(args), sss);
                    break;
                case TokenType.STI:
                    sss = FList.cons(new TreeTypes.StaticIndex(parseInt(
                        this.#sc.curr.lexeme.substring(1) // Cut off period.
                    )), sss);
                    this.#sc.next(); // Advance past index.
                    break;
                default:
                    return sss.isEmpty 
                        ? pivot
                        : new TreeTypes.SubScript(pivot, sss.reverse());
            }
        }
    }

    #addressable(advance = false) {
        if (advance) this.#sc.next();
        
        switch (this.#sc.curr.token_type) {
            case TokenType.VID:
                let vid_t = this.#sc.curr;
                this.#sc.next(); // Advance past ID.
                return new TreeTypes.Identifier(vid_t.lexeme);
            case TokenType.LCB:
                let fields = FList.EMPTY;
                if (this.#sc.next().token_type != TokenType.RCB) {
                    fields = this.#expList();
                }
                this.#expect(TokenType.RCB, "Struct value must be followed by \"}\".");
                return new TreeTypes.Struct(fields.reverse());
            case TokenType.LBR:
                let cells = FList.EMPTY;
                if (this.#sc.next().token_type != TokenType.RBR) {
                    cells = this.#expList();
                }
                this.#expect(TokenType.RBR, "Vector value must be followed by \"]\".");
                return new TreeTypes.Vector(cells.reverse());
            case TokenType.LPN:
                let exp = this.#expression(true);
                this.#expect(TokenType.RPN, "Grouping must be followed by \")\"");
                return new TreeTypes.Grouping(exp);
            default:
                this.#error("Unable to parse addressable value.");
        }
    }

    #expList(advance = false) {
        if (advance) this.#sc.next();

        let elist = FList.cons(this.#expression(), FList.EMPTY);

        while (this.#sc.curr.token_type == TokenType.COM) {
            elist = FList.cons(this.#expression(true), elist);
        }

        return elist;
    } 
}

module.exports.JQLParser = JQLParser;