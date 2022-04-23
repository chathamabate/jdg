const { TreeVisitor, TypeSig, VarDefine } = require("./jql_tree_types");
const { FList, JQLError } = require("./utils");

class JQLTypeError extends JQLError {
    constructor(msg) {
        super(0, msg);
    }
}

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
                ttVisitor.bindings[gIter.head.name] = TreeTypeVisitor.#constantTypeBinding(tpIter);

                tpIter = tpIter.tail;
                gIter = gIter.tail;
            }

            if (!tpIter.isEmpty || !gIter.isEmpty) {
                throw new JQLTypeError(type.toString() + " given incorrect number of typed parameters.");
            }

            let result = type.accept(ttVisitor);

            generics.foreach((bid) => delete ttVisitor.bindings[bid.name]);

            return result;
        };
    }

    static #conformTypes(type1, type2) {
        if (TypeSig.ANY.typeEquals(type1)) {
            return type2;
        }

        if (TypeSig.ANY.typeEquals(type2)) {
            return type1;
        }

        if (type1.typeEquals(type2)) {
            return type1;
        }

        throw new JQLTypeError(`Types do not conform ${type1.toString()} and ${type2.toString()}.`);
    }

    // NOTE, this visitor is NOT functional.
    // It mutates itself to save time.

    // Bindings will map identifier strings to maps.
    // A map will take in an FList of Type Signatures and return a type signature.
    // The maps will bind each given type to its corresponding generic,
    // Then evaluate the actual expression or type signature.
    #bindings;

    constructor() {
        super();
        
        this.#bindings = {};
    }

    // NOTE, somewhat unsafe here.
    get bindings() {
        return this.#bindings;
    }

    #checkFreeName(name) {
        if (name in this.#bindings) {
            throw new JQLTypeError("Identifier " + name + " is already defined in scope.");
        }
    }

    visitProgram(program) { 
        program.stmts.foreach(stmt => stmt.accept(this));
        return TypeSig.VOID;
    }

    visitStatement(statement) { 
        statement.#exp.accept(this);
        return TypeSig.VOID;
    }

    visitVarDefine(varDefine) { 
        let gid = varDefine.gid;
        let name = gid.name;

        this.#checkFreeName(name);

        let generics = gid.generics;

        // This allows for recursion...
        this.#bindings[name] = (typedParams) => {
            if (typedParams.len != generics.len) {
                throw new JQLTypeError(name + " given incorrect number of typed params. (Recursive Case)");
            }

            return TypeSig.ANY;
        };

        // Confirm all generics are free.
        generics.foreach((bid) => {
            this.#checkFreeName(bid.name);

            // Set each constant to itself for now.
            this.#bindings[bid.name] = TreeTypeVisitor.#constantType(bid);
        });

        // Now compute the type of the constant being defined.
        // This will include the generic Names.
        let resultType = varDefine.exp.accept(this);

        generics.foreach((bid) => delete this.#bindings[bid.name]);

        this.#bindings[name] = TreeTypeVisitor.#genericTypeBinding(resultType, generics, this);

        return TypeSig.VOID;
    }

    visitTypeDef(typeDef) { 
        // Typewise, type def is identical to var define.
        (new VarDefine(typeDef.gid, typeDef.ts)).accept(this);
        return TypeSig.VOID;
    }

    visitCase(cas) { throw NOT_IMPLEMENTED_ERROR; }

    visitDefaultMatch(defMatch) { 
        // Here we just check to make sure all cases start with a boolean.
        // And that all the values of the defualt case match...
        // I.E. they're equal.
        // defMatch.cases.map((c) => c.test.accept(this)).foreach((t) => {
        //     if (!TreeTypeVisitor.#conformTypes(TypeSig.BOOL, t).typeEquals(TypeSig.BOOL))
        // });



    }

    visitValueMatch(valMatch) { throw NOT_IMPLEMENTED_ERROR; }


    visitArgument(arg) { throw NOT_IMPLEMENTED_ERROR; }
    visitMap(map) { throw NOT_IMPLEMENTED_ERROR; }
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