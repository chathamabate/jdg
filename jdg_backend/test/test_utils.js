const assert = require("assert");
const { Try } = require("../server/utils");


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