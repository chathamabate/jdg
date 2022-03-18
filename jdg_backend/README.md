# Backend Query Language

A user will be able to query the backend for graphable game data.

Queries will either be for single game stats or full season stats.

## Datatypes
* `num` a number.
* `bool` a true of false value.
* `vec<T>` a sequence of values of type `T`.
* `map<T1, T2, ... TN, R>` a function which takes `N > 0` inputs and returns `R`.
* `str` a string of characters.

## Graphing
Either a single game's data can be graphed, or data across the entire season can be
graphed.

To graph the data of a single game a sequence of 25 numbers is required.
To graph the data of the entire season, a sequence of numbers with length equal to the number of
completed games is required.

## Global Values
Here is a list of predefined values always available at runtime.
```
vec<vec<num>> seats
A table holding the player in each seat of each game.
Index structure : [game id][seat].

vec<vec<vec<num>>> bets 
A table holding the number of tricks bet by each player of each game. 
Index structure : [game id][seat][round].

vec<vec<vec<num>>> earns
A table holding the number of tricks earned by each of player of each game.
Index structure : [game id][seat][round].

map<vec<?>, num> len
Returns the length of a vector.
```

## Grammar 
```
<MAP> ::=
<MAT> ::= match <EXP> (case -> <EXP>,)* default <EXP> 
<ORR> ::= <AND> (or <ORR>)* // Most zoomed out level of a singular value.
<AND> ::= <NOT> (and <AND>)*
<NOT> ::= (not)? <EQU>
<EQU> ::= <SUM> (= <SUM>)?
<SUM> ::= <PRD> ((+|-) <SUM>)*
<PRD> ::= <APP> ((\*|/) <PRD>)*
<APP> ::= <ADR> ( <IND> | <AGL> )*
        | <BUL> | <NUM>
<ADR> ::= <ID>              // Something which is indexable or callable.
        | \(  <EXP> \)
<AGL> ::= \( <EXP> (, <EXP>)*  \)
<IND> ::= \[ <NUM> \]
<ID>  ::= [a-zA-Z_][a-zA-Z0-9_]* 
<BUL> ::= true | false
<NUM> ::= ([1-9][0-9]*|0)(\.[0-9]+)?
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