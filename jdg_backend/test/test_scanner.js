const assert = require("assert");
const {TokenType, Token, JQLScanner, JQLSyntaxError} = require("../server/jql_scanner");

function expectTokenTypes(t) {
    return () => {
        let [data, token_types] = t;

        let sc = new JQLScanner(data);
        let i = 0;

        for (; i < token_types.length && !sc.halted; i++) {
            assert.equal(sc.next().token_type, token_types[i]);
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
    "(num) -> num -10.12",
    [TokenType.LPN, TokenType.NUM, TokenType.RPN, TokenType.ARR, TokenType.NUM,
     TokenType.MIN, TokenType.NMV, TokenType.EOF]
];

const et4 = [
    "->=<=-",
    [TokenType.ARR, TokenType.EQU, TokenType.LTE, TokenType.MIN, TokenType.EOF]
];

const et5 = [
    "case --> \n\n  <== ()]*",
    [TokenType.CAS, TokenType.MIN, TokenType.ARR, TokenType.LTE, TokenType.EQU,
     TokenType.LPN, TokenType.RPN, TokenType.RBR, TokenType.TIM, TokenType.EOF]
];

const et6 = [
    "\"Hello 1 2 3\" 00 \"\"",
    [TokenType.STV, TokenType.NMV, TokenType.NMV, 
     TokenType.STV, TokenType.EOF]
];

const et7 = [
    "hello123 123hello",
    [TokenType.IID, TokenType.NMV, TokenType.IID, TokenType.EOF]
];

const et8 = [
    "",
    [TokenType.EOF]
];

const et9 = [
    "00.1 .5.623",
    [TokenType.NMV, TokenType.NMV, TokenType.STI, TokenType.STI, TokenType.EOF]
];


const ets = [
    et1, et2, et3, et4, et5, et6, et7, et8, et9
];

describe("Scanner Success Tests", () => {
    for (let i = 0; i < ets.length; i++) {
        it("ET " + (i + 1), expectTokenTypes(ets[i]));
    }
});

function expectFailure(data) {
    return () => {
        let sc = new JQLScanner(data);

        // We expect this will never return the EOF token.
        try {
            while (sc.next().token_type != TokenType.EOF);
        } catch (err) {
            if (err instanceof JQLSyntaxError) {
                return;
            }

            throw err;
        }

        throw new Error("Data successfully scanned.");
    };
}

const efs = [
    "1.", "..1", "\"hello World00", "\"\"\"", "$$$"
];

describe("Scanner Failure Tests", () => {
    for (let i =  0; i < efs.length; i++) {
        it("FT " + (i + 1), expectFailure(efs[i]));
    }
});