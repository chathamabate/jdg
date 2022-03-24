

class TrySuccess {
    #val;

    constructor(val) {
        this.#val = val;
    }

    map(f) {
        let retVal = null;

        try {
            retVal = f(this.#val);    
        } catch (err) {
            return new TryFailure(err);
        }

        return new TrySuccess(retVal);
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
    #error

    constructor(error) {
        this.#error = error;
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

    get error() {
        return this.#error;
    }
}

module.exports.TrySuccess = TrySuccess;
module.exports.TryFailure = TryFailure;