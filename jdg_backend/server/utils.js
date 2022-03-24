

class TrySuccess {
    #val;

    constructor(val) {
        this.#val = val;
    }

    omap(f) {
        return f(this.#val);
    }

    map(f) {
        return new TrySuccess(f(this.#val));
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
}

class TryFailure {
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

class Cons {
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
}   

class Empty {
    static ONLY = new Empty();

    get isEmpty() {
        return true;
    }

    get head() {
        throw new Error("Empty list has no tail."); 
    }

    get tail() {
        throw new Error("Empty list has no head.")
    }
}

class Iter {
    #stream; // Must have a .next() function which returns an option.

    constructor(stream) {
        this.#stream = stream;
    }

    
}

module.exports.TrySuccess = TrySuccess;
module.exports.TryFailure = TryFailure;