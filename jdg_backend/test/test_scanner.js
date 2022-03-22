const assert = require("assert");
const {TokenType, Token, JQLScanner} = require("../server/jql_scanner");

function expectTokenTypes(t) {
    return () => {
        let [data, token_types] = t;

        let sc = new JQLScanner(data);
        let i = 0;

        for (; i < token_types.length && !sc.halted; i++) {
            let [t, err] = sc.next();

            // console.log(t.token_type.name);
    
            if (err != null) {
                throw new Error(err);
            }

            assert.equal(t.token_type, token_types[i]);
        }
    };
}

// Expected Tests.

const et1 = [
    "100", 
    [TokenType.NMV, TokenType.EOF]
];

const et2 = [
    "false true do match",
    [TokenType.BLV, TokenType.BLV, TokenType.DO, TokenType.MAT, TokenType.EOF]
];

const et3 = [
    "map<vec<num>> -10.12",
    [TokenType.MAP, TokenType.LT, TokenType.VEC, TokenType.LT, TokenType.NUM,
     TokenType.GT, TokenType.GT, TokenType.MIN, TokenType.NMV, TokenType.EOF]
];

const et4 = [
    "->=<=-",
    [TokenType.ARR, TokenType.EQU, TokenType.LTE, TokenType.MIN, TokenType.EOF]
];

const et5 = [
    "case -->  <== ()]*",
    [TokenType.CAS, TokenType.MIN, TokenType.ARR, TokenType.LTE, TokenType.EQU,
     TokenType.LPN, TokenType.RPN, TokenType.RBR, TokenType.TIM, TokenType.EOF]
]

const ets = [
    et1, et2, et3, et4, et5
];

describe("Expected Tests", () => {
    for (let i = 0; i < ets.length; i++) {
        it("ET " + (i + 1), expectTokenTypes(ets[i]));
    }
});