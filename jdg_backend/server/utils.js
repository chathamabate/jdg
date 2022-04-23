
// Base JQL Error type.
class JQLError {
    #msg;
    #line;

    constructor(line, msg) {
        this.#line = line;
        this.#msg = msg;
    }

    get msg() {
        return this.#msg;
    }

    get line() {
        return this.#line;
    }

    toString() {
        return this.#line + " : "  + this.#msg;
    }
}

// Try Classes.

class Try {
    static success(val) {
        return new Try.#Success(val);
    }

    static failure(msg) {
        return new Try.#Failure(msg);
    }

    static #Success = class {
        #val;

        constructor(val) {
            this.#val = val;
        }
    
        omap(f) {
            return f(this.#val);
        }

        smap(f) {
            return f(this);
        }
    
        map(f) {
            return new Try.#Success(f(this.#val));
        }

        test(pred, err_try_gen) {
            if (!pred(this.#val)) {
                return err_try_gen();
            }

            return this;
        }
    
        get successful() {
            return true;
        }
    
        get val() {
            return this.#val;
        }
    
        get error() {
            throw new Error("This try was successful.");
        }

        toString() {
            return `success{${this.#val.toString()}}`;
        }
    };

    static #Failure = class {
        #msg

        constructor(msg) {
            this.#msg = msg;
        }
    
        omap(f) {
            return this;
        }

        smap(f) {
            return this;
        }
    
        map(f) {
            return this;
        }

        test(pred, err_try_gen) {
            return this;
        }

    
        get successful() {
            return false;
        }
    
        get val() {
            throw new Error("This try was not successful.");
        }
    
        get msg() {
            return this.#msg;
        }

        toString() {
            return `failure{${this.#msg}}`;
        }
    }
}

// Optional Classes.

class Option {
    static some(val) {
        return new Option.#Some(val);
    }

    static get none() {
        return Option.#NONE_ONLY;
    }

    static #Some = class {
        #val;
    
        constructor(val) {
            this.#val = val;
        }
    
        get val() {
            return this.#val;
        }

        get isSome() {
            return true;
        }

        map(f) {
            return new Option.#Some(f(this.#val));
        }

        omap(f) {
            return f(this.#val);
        }
    
        match(s, n) {
            return s(this.#val);
        }

        toString() {
            return `some<${this.#val}>`;
        }
    };
    
    static #None = class {
        constructor() {

        }

        get val() {
            throw new Error("None has no Value!");
        }

        get isSome() {
            return false;
        }

        map(f) {
            return this;
        }

        omap(f) {
            return this;
        }
    
        match(s, n) {
            return n();
        }

        toString() {
            return "none";
        }
    } 
    
    static #NONE_ONLY = new Option.#None();
}

class FList {

    static cons(head, tail) {
        return new FList.#Cons(head, tail);
    }

    static of(...vals) {
        let res = FList.EMPTY;

        for (let i = vals.length - 1; i >= 0; i--) {
            res = new FList.#Cons(vals[i], res);
        }

        return res;
    }

    static #Cons = class {
        #head;
        #tail;
    
        constructor(head, tail) {
            this.#head = head;
            this.#tail = tail;
        }

        get len() {
            return this.foldl(0, (res, _) => res + 1);
        }
    
        get isEmpty() {
            return false;
        }
    
        get head() {
            return this.#head;
        }
        
        get tail() {
            return this.#tail;
        }

        foreach(f) {
            let iter = this;

            while (!iter.isEmpty) {
                f(iter.head);
                iter = iter.tail;
            }
        }

        map(f) {
            let res = new FList.#Cons(f(this.head), FList.EMPTY);
            let res_builder = res;
            let iter = this.tail;

            while (!iter.isEmpty) {
                res_builder.#tail = new FList.#Cons(f(iter.head), FList.EMPTY);

                res_builder = res_builder.tail;
                iter = iter.tail;
            }

            return res;
        }

        foldl(zero, combinator) {
            let res = zero;
            let iter = this;

            while (!iter.isEmpty) {
                res = combinator(res, iter.head);
                iter = iter.tail;
            }

            return res;
        }

        reverse() {
            return this.foldl(FList.EMPTY, 
                (res, ele) => FList.cons(ele, res)
            );
        }

        match(ifFull, ifEmpty) {
            return ifFull(this.#head, this.#tail);
        }

        toString() {
            return this.format()
        }

        format(sep=", ", inner="[", outer="]") {
            let eles = this.#tail.foldl(this.#head.toString(), 
                (res, ele) => res + sep + ele.toString()
            );

            return inner + eles + outer;
        }
    };

    static #Empty = class {

        get len() {
            return 0;
        }

        get isEmpty() {
            return true;
        }
    
        get head() {
            throw new Error("Empty list has no tail."); 
        }
    
        get tail() {
            throw new Error("Empty list has no head.")
        }

        foreach(f) {

        }

        map(f) {
            return this;
        }

        foldl(zero, combinator) {
            return zero;
        }

        reverse() {
            return this;
        }

        match(ifFull, ifEmpty) {
            return ifEmpty();
        }

        toString() {
            return "[]";
        }

        format(sep=", ", inner="[", outer="]") {
            return inner + outer;
        }
    };

    static EMPTY = new FList.#Empty();
}

// NOT FUNCTIONAL....
// Uses FList tho.
class FListTable {
    // String -> FList<Whateva>
    #table;

    constructor() { 
        this.#table = {}
    }

    contains(id) {
        return (id in this.#table) && (!this.#table[id].isEmpty);
    }

    lookUp(id) {
        return this.#table[id].head;
    }

    define(id, val) {
        if (!(id in this.#table)) {
            this.#table[id] = FList.EMPTY;
        }

        this.#table[id] = FList.cons(val,  this.#table[id]);
    }

    pop(id) {
        this.#table[id] = this.#table[id].tail;
    }
}

module.exports.Try = Try;
module.exports.Option = Option;
module.exports.FList = FList;
module.exports.FListTable = FListTable;
module.exports.JQLError = JQLError;