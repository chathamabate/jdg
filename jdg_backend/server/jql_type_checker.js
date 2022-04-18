const { TreeVisitor, TypeSig } = require("./jql_tree_types");
const { FList, JQLError } = require("./utils");

class JQLTypeError extends JQLError {
    constructor(line, msg) {
        super(line, msg);
    }
}

class TreeTypeVisitor extends TreeVisitor {
    // NOTE, this visitor is NOT functional.
    // It mutates itself to save time.

    // Bindings will map type and constant names to lambdas.
    // These lambdas will take an FList of types and return a type.
    #bindings;

    constructor() {
        super();
        
        this.#bindings = {};
    }

    visitProgram(program) { 
        program.stmts.foreach(stmt => stmt.accept(this));
        return TypeSig.VOID;
    }

    visitStatement(statement) { 
        statement.#exp.accept(this);
        return TypeSig.VOID;
    }

    visitVarDefine(varDefine) { throw NOT_IMPLEMENTED_ERROR; }

    visitTypeDef(typeDef) { throw NOT_IMPLEMENTED_ERROR; }

    visitCase(cas) { throw NOT_IMPLEMENTED_ERROR; }
    visitDefaultMatch(defMatch) { throw NOT_IMPLEMENTED_ERROR; }
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
    visitIdentifier(identifier) { throw NOT_IMPLEMENTED_ERROR; }
    visitGenericID(gid) { throw NOT_IMPLEMENTED_ERROR; }
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
}