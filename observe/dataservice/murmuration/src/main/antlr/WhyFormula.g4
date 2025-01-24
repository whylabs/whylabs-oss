grammar WhyFormula;


variableDeclaration:
    'var' ID '=' expression ';' # SetVariable
    ;

expression:
    plusOrMinus
    ;

plusOrMinus: divOrMult # ToDivOrMult
    | plusOrMinus '+' plusOrMinus # Plus
    | plusOrMinus '-' plusOrMinus # Minus
    ;

divOrMult: power  # ToPower
    | divOrMult '*' divOrMult # Mult
    | divOrMult '/' divOrMult # Div
    ;

power:
    factor
    ( '^' factor)*;

factor:
    NUMBER
    | ID
    | '(' expression ')'
    | unaryExpression
    | binaryExpr;

unaryExpression:
    'abs' factor # AbsExpression
    | 'log2' factor # Log2Expression
    | 'log10' factor # Log10Expression
    ;

binaryExpr:
    'Max' '(' factor ',' factor ')' # MaxExpression
    | 'Min' '(' factor ',' factor ')' # MinExpression
    ;

// Lexer Rules
NUMBER:
    DIGIT+
    | DIGIT+ '.' DIGIT+
    ;

ID:
    [a-zA-Z_][a-zA-Z_0-9]*;

DIGIT:
    [0-9];

WS:
    [ \t\r\n]+ -> skip;