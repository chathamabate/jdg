const { TreeVisitor, TypeSig, Argument } = require("./jql_tree_types");
const { FList, JQLError } = require("./utils");

class JQLTypeError extends JQLError {
    constructor(msg) {
        super(0, msg);
    }
}

// Non functional class used for mapping ids to there nearest type
// resolution.
class TypeTable {
    // String -> FList<TypeSig>
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


// Non functional visitor for computing the type of a JQL expression.
class TreeTypeVisitor extends TreeVisitor {

    static #constantTypeBinding(type) {
        return (typedParams) => {
            if (typedParams.isEmpty) {
                return type;
            }

            throw new JQLTypeError(type.toString() + " doesn't take type parameters.");
        };
    }

    static #genericTypeBinding(type, generics, ttVisitor) {
        return (typedParams) => {
            let tpIter = typedParams;
            let gIter = generics;

            while (!tpIter.isEmpty && !gIter.isEmpty) {
                ttVisitor.bindings.define(gIter.head.name, TreeTypeVisitor.#constantTypeBinding(tpIter));

                tpIter = tpIter.tail;
                gIter = gIter.tail;
            }

            if (!tpIter.isEmpty || !gIter.isEmpty) {
                throw new JQLTypeError(type.toString() + " given incorrect number of typed parameters.");
            }

            let result = type.accept(ttVisitor);

            generics.foreach((bid) => ttVisitor.bindings.pop(bid.name));

            return result;
        };
    }

    #bindings;

    constructor() {
        super();
        this.#bindings = new TypeTable();
    }

    get bindings() {
        return this.#bindings;
    }

    visitProgram(program) { 
        program.stmts.foreach(stmt => stmt.accept(this));
        return TypeSig.VOID;
    }

    visitStatement(statement) { 
        statement.#exp.accept(this);
        return TypeSig.VOID;
    }

    // Method for factoring out the 
    #bindGenericID(gid, ts, exp = null) {
        let genericIDSet = new Set();

        // Define all generics to themselves first.
        gid.generics.foreach((gen) => {
            // gen should be of type BaseID.
            if (genericIDSet.has(gen.name)) {
                throw new JQLTypeError(`Generic ID ${gid.name} has repeat generics: ${gen.name}`);
            }

            genericIDSet.add(gen.name);
            this.#bindings.define(gen.name, TreeTypeVisitor.#constantTypeBinding(gen));
        });

        // Construct raw type from the given type signature.
        let expectedType = ts.accept(this);

        if (exp != null) {
            let actualType = varDefine.exp.accept(this);

            if (!expectedType.typeEquals(actualType)) {
                throw new JQLTypeError(`Type mismatch for ${gid.name}, expected: ${expectedType.toString()} ` 
                + `actual: ${actualType.toString()}`);
            }
        }

        // Unbind all generics.
        gid.generics.foreach((gen) => this.#bindings.pop(gen.name));

        // Now bind the defined ID to its type.
        this.#bindings.define(gid.name, 
            TreeTypeVisitor.#genericTypeBinding(expectedType, gid.generics, this));
    }

    visitVarDefine(varDefine) { 
        this.#bindGenericType(varDefine.gid, varDefine.ts, varDefine.exp);
        return TypeSig.VOID;
    }  

    visitTypeDef(typeDef) { 
        this.#bindGenericID(typeDef.gid, typeDef.ts);
        return TypeSig.VOID;
    }

    #checkMatchCases(match, eTestType, eConseqType) {
        match.cases.foreach((c) => {
            let testType = c.test.accept(this);
            if (!testType.typeEquals(eTestType)) {
                throw new JQLTypeError(`Test of a match is not what's expected. ` + 
                `expected: ${eTestType.toString()} actual: ${testType.toString()}`);
            }

            let conseqType = c.conseq.accept(this);
            if (!conseqType.typeEquals(eConseqType)) {
                throw new JQLTypeError(`Multiple types returned from single match: ` +
                `${conseqType.toString()} and ${eConseqType.toString()}`);
            }
        });
    }

    visitDefaultMatch(defMatch) { 
        // Here we just check to make sure all cases start with a boolean.
        // And that all the values of the defualt case match...
        // I.E. they're equal.

        let returnType = defMatch.defaultCase.accept(this);
        this.#checkMatchCases(defMatch, TypeSig.BOOL, returnType);
        
        return returnType;
    }

    visitValueMatch(valMatch) { 
        let testType = valMatch.pivot.accept(this);
        let returnType = valMatch.defaultCase.accept(this);
        this.#checkMatchCases(valMatch, testType, returnType);

        return returnType;
    }


    visitArgument(arg) { throw NOT_IMPLEMENTED_ERROR; }

    visitMap(map) { 
        // First define all arguments...
        // Maybe change map order of types vs ids???
        // let inputTypes = map.args.map((arg) => new Argument(arg.) arg.ts.accept(this));
    }


    visitOrChain(orChain) { throw NOT_IMPLEMENTED_ERROR; }
    visitAndChain(andChain) { throw NOT_IMPLEMENTED_ERROR; }
    visitNot(not) { throw NOT_IMPLEMENTED_ERROR; }
    visitEq(eq) { throw NOT_IMPLEMENTED_ERROR; }
    visitLtEq(ltEq) { throw NOT_IMPLEMENTED_ERROR; }
    visitGtEq(gtEq) { throw NOT_IMPLEMENTED_ERROR; }
    visitLt(lt) { throw NOT_IMPLEMENTED_ERROR; }
    visitGt(gt) { throw NOT_IMPLEMENTED_ERROR; }
    visitAddCT(addCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitSubCT(subCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitTimesCT(timesCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitDivCT(divCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitModCT(modCT) { throw NOT_IMPLEMENTED_ERROR; }
    visitOpChain(opChain) { throw NOT_IMPLEMENTED_ERROR; }
    visitNegation(negation) { throw NOT_IMPLEMENTED_ERROR; }
    visitIndex(index) { throw NOT_IMPLEMENTED_ERROR; }
    visitArgList(argList) { throw NOT_IMPLEMENTED_ERROR; }
    visitStaticIndex(staticIndex) { throw NOT_IMPLEMENTED_ERROR; }
    visitSubScript(subscript) { throw NOT_IMPLEMENTED_ERROR; }
    visitBaseID(baseID) { throw NOT_IMPLEMENTED_ERROR; }
    visitGenericID(genericID) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypedID(typedID) { throw NOT_IMPLEMENTED_ERROR; }
    visitVector(vector) { throw NOT_IMPLEMENTED_ERROR; }
    visitStruct(struct) { throw NOT_IMPLEMENTED_ERROR; }
    visitGrouping(grouping) { throw NOT_IMPLEMENTED_ERROR; }
    visitBoolVal(boolVal) { throw NOT_IMPLEMENTED_ERROR; }
    visitNumVal(numVal) { throw NOT_IMPLEMENTED_ERROR; }
    visitStrVal(strVal) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeNum(typeNum) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeBool(typeBool) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeStr(typeStr) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeVec(typeVec) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeMap(typeMap) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeStruct(typeStruct) { throw NOT_IMPLEMENTED_ERROR; }
    visitTypeAny(typeAny) { throw NOT_IMPLEMENTED_ERROR; }
}