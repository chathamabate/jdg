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
    
        map(f) {
            return new Try.#Success(f(this.#val));
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
    };

    static #Failure = class {
        #msg

        constructor(msg) {
            this.#msg = msg;
        }
    
        omap(f) {
            return this;
        }
    
        map(f) {
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
    static get empty() {
        return FList.#ONLY_EMPTY;
    }

    static cons(head, tail) {
        return new FList.#Cons(head, tail);
    }

    static of(...vals) {
        let res = FList.#ONLY_EMPTY;

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
    
        get isEmpty() {
            return false;
        }
    
        get head() {
            return this.#head;
        }
        
        get tail() {
            return this.#tail;
        }

        map(f) {
            let res = new FList.#Cons(f(this.head), FList.#ONLY_EMPTY);
            let res_builder = res;
            let iter = this.tail;

            while (!iter.isEmpty) {
                res_builder.#tail = new FList.#Cons(f(iter.head), FList.#ONLY_EMPTY);

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

        toString() {
            let str_res = this.head.toString() + 
                this.tail.foldl("", (res, ele) => res + ", " + ele);
            return `[${str_res}]`;
        }
    };

    static #Empty = class {
        get isEmpty() {
            return true;
        }
    
        get head() {
            throw new Error("Empty list has no tail."); 
        }
    
        get tail() {
            throw new Error("Empty list has no head.")
        }

        map(f) {
            return this;
        }

        foldl(zero, combinator) {
            return zero;
        }

        toString() {
            return "[]";
        }
    };

    static #ONLY_EMPTY = new FList.#Empty();
}

module.exports.Try = Try;
module.exports.Option = Option;
module.exports.FList = FList;