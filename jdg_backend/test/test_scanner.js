const assert = require("assert");
const {TokenType, Token, JQLScanner} = require("../server/jql_scanner");

function expectTokenTypes(t) {
    return () => {
        let [data, token_types] = t;

        let sc = new JQLScanner(data);
        let i = 0;

        for (; i < token_types.length && !sc.halted; i++) {
            let [t, err] = sc.next();
    
            if (err != null) {
                throw new Error(err);
            }

            assert.equal(t.token_type, token_types[i]);
        }
    };
}

const et1 = ["\
    100 \
", [TokenType.NMV, TokenType.EOF]];

const et2 = [
    "false true do match",
    [TokenType.BLV, TokenType.BLV, TokenType.DO, TokenType.MAT, TokenType.EOF]
]

describe("Expected Tests", () => {
    it("ET 1", expectTokenTypes(et1));
    it("ET 2", expectTokenTypes(et2));
});