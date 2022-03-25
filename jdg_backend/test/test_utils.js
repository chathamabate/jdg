const assert = require("assert");
const { Try, FList } = require("../server/utils");


describe("Try Tests", () => {
    it("TT 1", () => {
        let ts = Try.success(10);
        let ts_res = ts.map(i => i + 12);

        assert.equal(ts_res.val, 22);
        assert.ok(ts_res.successful);
    });

    it("TT 2", () => {
        let ts = Try.success(100);
        let ts_res = 
            ts.map(i => i * 4).map(i => i % 2 == 0);
        
        assert.ok(ts_res.val);
        assert.throws(() => ts_res.error);
    });

    it("TT 3", () => {
        let tf = Try.failure("MEH");
        let tf_res = tf.map(i => i + 1);

        assert.equal(tf, tf_res);
    });
});

describe("FList Tests", () => {
    it("FLT 1", () => {
        let fl = FList.of(1, 2, 3);
        assert.equal(fl.toString(), "[1, 2, 3]");
    });

    it("FLT 2", () => {
        let fl = FList.of(1, 2, 3).map(i => i * 2);
        assert.equal(fl.toString(), "[2, 4, 6]");
    });

    it("FLT 3", () => {
        let sum = FList.of(1, 2, 3).foldl(0, (res, ele) => res + ele);
        assert.equal(sum, 6);
    });
});