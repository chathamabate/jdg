const assert = require("assert");
const { JQLParser, JQL, JQLParseError } = require("../server/jql_parser")

// Parseable Programs. (Not necessarily semantically correct!)
const STS = [
    "do 5",
    "define x as 5",
    "define x as 5 do 6",
    "do 8 type x as num",
    "define x as y",
    "define x as (map (num x, num y) -> vec{num}[x, y])(0, {1, 2}.0)[2]",
    "do {1, {\"hello\", 56, true}}.1.1",
    "",
    "do match x + 5 case 3 -> 5 case 1 -> {} default -> 39",
    "define x as match default -> 50",
    "do vec{str}[].4.56.23[1203.453]()(x, y, z)",
    "do 6 and not -2 + -7 - - 8 or (3 and (6 or 3))",
    "define x{T, R} as map (T x, [R] y) -> x",
    "define m{} as map () -> define g{T, R} as 6 5",
    "type obj{Q, R} as {Q, (R, Q, obj2{num, T}) -> Q, num}",
    "define m{T} as map (T in) -> in do m{num}(4)"
];

describe("Parser Success Tests", () => {
    for (let i = 0; i < STS.length; i++) {
        it("ST " + (i + 1), () => {
            try {
                let parser = new JQLParser(STS[i]);
                let parse1 = parser.parse().toString();
                let bs_parser = new JQLParser(parse1);
                let parse2 = bs_parser.parse().toString();
    
                assert.equal(parse1, parse2);
            } catch (err) {
                if (err instanceof JQLParseError) {
                    throw Error(err.toString());
                }

                throw err;
            }
        });
    }
});

// These tests are expected to fail.
const FTS = [
    "(",
    "6 7",
    "(100)",
    "type as num",
    "define num x as 10",
    "type str x as {100}",
    "define num x as num",
    "do match case 1 -> 1",
    "define x y as 10",
    "do [56][]",
    "do []"
];

describe("Parser Failure Tests", () => {
    for (let i = 0 ; i < FTS.length; i++) {
        it("FT " + (i + 1), () => {
            let parser = new JQLParser(FTS[i]);

            try {
                parser.parse();
            } catch (err) {
                if (err instanceof JQLParseError) {
                    return;
                }

                throw err;
            }

            throw new Error("Parse error expected but not thrown!");
        });
    }
});
