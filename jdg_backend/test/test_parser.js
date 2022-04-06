const assert = require("assert");
const { JQLParser, JQL, JQLParseError } = require("../server/jql_parser")

// Parseable Programs. (Not necessarily semantically correct!)
const STS = [
    "do 5",
    "define num x as 5",
    "define num x as 5 do 6",
    "do 8 type x as num",
    "define (num, [{num, str, bool}]) -> {bool, bool} x as y",
    "define num x as (map (num x, num y) -> [x, y])(0, {1, 2}.0)[2]",
    "do {1, {\"hello\", 56, true}}.1.1",
    "",
    "do match x + 5 case 3 -> 5 case 1 -> {} default -> 39",
    "define str x as match default -> 50",
    "do [].4.56.23[1203.453]()(x, y, z)",
    "do 6 and not -2 + -7 - - 8 or (3 and (6 or 3))"
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
    "define x as 10",
    "type x as {100}",
    "define num x as num",
    "do match case 1 -> 1",
    "do [56][]"
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
