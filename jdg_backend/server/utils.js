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

    static reverse(flist) {
        let res = FList.#ONLY_EMPTY;
        let iter = flist;

        while (!iter.isEmpty) {
            res = new FList.#Cons(iter.head, res);
            iter = iter.tail;
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
    };

    static #ONLY_EMPTY = new FList.#Empty();
}



// class Iter {
//     // Zero: T.
//     // Producer: () -> Try<K>
//     // Combiner: (T, K) -> T
//     // Predicate: (Producer) -> boolean
//     static foldUntil(zero, producer, combiner, predicate) {
//         let result = zero;

//         while (predicate()) {
//             onext = producer();

//             if (!onext.successful) {
//                 return onext;
//             }

//             result = combiner(result, onext.val);
//         }

//         return new TrySuccess(result);
//     }
// }

// class Iter {
//     #stream; // Must have a .next() function which returns an option.

//     constructor(stream) {
//         this.#stream = stream;
//     }


// }

module.exports.Try = Try;
module.exports.Option = Option;