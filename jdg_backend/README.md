# Judgement Query Language (JQL)

A user will be able to query the backend for graphable game data.

## Static Types
`JQL` is a statically typed language which allows for generic types in certain instances.

There are 3 primitive `JQL` types.
* A `num` is a numerical value (can be a decimal).
* A `str` is a string of characters.
* A `bool` is a true or false value.

There are 3 extensible `JQL` types.
* A `map` is a function which takes 0 or more inputs and returns a single output.
* A `vec` is an ordered sequence of values (all the same type).
* A `struct` is an ordered sequence of values with specified types.

Types can be defined by the user using a type definition statment.

```
// Type definition format.
// type <TypeName> as <RawType>

type MyType as num
```

The more complex types are defined in the following manor.
```
// Map type signature format...
// (<ArgType1>, <ArgType2> ...) -> <OutputType>
//
// Example :
type BinaryOp as (num, num) -> num

// Vector type signature format...
// [<ElementType>]
type NumVector as [num]

// Struct Type signature format...
// {<FieldType1>, <FieldType2>, ...}
type Date as {str, num, num}
```
Type definitions also allow the introduction of generic types.
```
type UnOp{T} as (T) -> T
```
Lastly, type defintions are __NOT__ recursive.
```
// The following type definition will throw an error.
type invalidType as () -> invalidType
```

## Grammar 
Below are the grammar rules for `JQL`.
```
// Grammar Rules

<PRG> ::= (<VDF> | <STM>)* <EOF>
<STM> ::= do <EXP>
<VDF> ::= define <GID> <GTP> as <EXP>
<TDF> ::= type <GID> as <GTP>       // Typedef

<EXP> ::= <MAP> | <MAT> | <ORR>
<MAP> ::= map \( (<GTP> <VID> (, <GTP> <VID>)*)? \) -> (<VDF>)* <EXP>
<MAT> ::= match (<EXP>)? (case <EXP> -> <EXP>)* default -> <EXP> 
<ORR> ::= <AND> (or <AND>)* // Most zoomed out level of a singular value.
<AND> ::= <NOT> (and <NOT>)*
<NOT> ::= (not)? <CMP>
<CMP> ::= <SUM> (=|<=|>=|<|> <SUM>)?
<SUM> ::= <PRD> ((+|-) <PRD>)*
<PRD> ::= <NEG> ((\*|/|%) <NEG>)*
<NEG> ::= (-)? <APP>
<APP> ::= <ADR> ( <IND> | <AGL> | <STI>)*
        | <BLV> | <NMV> | <STV>
<ADR> ::= <DID> // Value which is indexable or callable.
        | <STC>
        | <VEC>
        | \(  <EXP> \)
<AGL> ::= \( <EXL>  \)                  // Arg List
<IND> ::= \[ <EXP> \]                   // Index.
<STI> ::= \.(0|[1-9][0-9]*)             // Static Index for structs.

<VEC> ::= vec \{ <GTP> \} \[ <EXL> \]
<STC> ::= \{ <EXL> \}
<EXL> ::= (<EXP> (, <EXP>)*)?           // Expresssion List.
<BLV> ::= true | false
<NMV> ::= ([1-9][0-9]*|0)(\.[0-9]+)?
<STV> ::= "[^"\n]*"

// Type Definition Types...

<GTP> ::= \[ <GTP> \]
        | \( <TPL> \) -> <GTP>
        | \{ <TPL> \}    // Struct type.
        | <PTP>
        | <DID>
<TPL> ::= (<GTP> (, <GTP>)*)?  // Type list.
<PTP> ::= num | bool | str


// Identifier Types...

<IID> ::= [a-zA-Z_][a-zA-Z0-9_]*    // Identifier
<IDL> ::= (<IID> (, <IID>)*)?       // Identifier List
<DID> ::= <IID> (\{ <TPL> \})?        // Defined ID with type param list. 
<GID> ::= <IID> (\{ <IID> \})?        // Generic Identifier.
```

<!-- ## Single Value Variables
* `rnd` - round number of a single turn.
* `cds` - number of cards per hand of a single turn.

## Player Specific Variables
* `bet` - bet value.
* `erd` - tricks earned.
* `gmp` - game points after the turn is over.
* `plc` - place after the turn is over.

## Aggregate Functions

* `avg` - average of the given values.
* `min` - minimum of the given values.
* `max` - maximum of the given values.
* `sum` - sum of the given values.
* `lst` - final value of the given values.

## Rolling
The aggregate functions above will have no affect for single game stats. *Rolling* is used to calculate mid game values for single game stats.  This is the act of aggregating all values leading up to a specific turn and returning one value.

For example, in single game stats, `avg(bet)` will always return the bet on each turn. This is because each player only has one bet per turn.

## Grammar
```
<ROL> ::= roll <ROL> with <FUN>
        | <SUM>
<SUM> ::= <TRM> ((+|-) <SUM>)*
<TRM> ::= <APP> ((*|/) <TRM>)*
<APP> ::= <FUN> \( <ROL> \)
        | \( <ROL> \)
        | <NUM> | <VAR>
<FUN> ::= avg | min | max | sum | lst
<SVR> ::= rnd | cds | bet | erd | gmp | plc
<PVR> ::= 
<NUM> ::= ([1-9][0-9]*|0)(\.[0-9]+)
``` -->