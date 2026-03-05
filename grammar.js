/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// GDL/IDL grammar for tree-sitter
// Case-insensitive language — all keywords match regardless of case

/**
 * Creates a case-insensitive keyword rule.
 * @param {string} word - The keyword to match
 * @returns {RegExp} Case-insensitive regex
 */
function kw(word) {
  return new RegExp(word.split('').map(c =>
    /[a-zA-Z]/.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c
  ).join(''));
}

const PREC = {
  TERNARY: 1,
  OR: 2,
  AND: 3,
  XOR: 3,
  NOT: 4,
  COMPARISON: 5,
  ADDITION: 6,
  MULTIPLICATION: 7,
  EXPONENTIATION: 8,
  UNARY: 9,
  MATRIX: 10,
  MEMBER: 11,
  CALL: 12,
  METHOD: 13,
};

module.exports = grammar({
  name: 'gdl',

  extras: $ => [
    /\s/,
    $.comment,
    $._line_continuation,
    '&',
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.assignment, $._expression],
    [$._expression, $.keyword_argument],
  ],

  rules: {
    source_file: $ => repeat($._statement),

    _statement: $ => choice(
      $.procedure_definition,
      $.function_definition,
      $._simple_statement,
    ),

    _simple_statement: $ => choice(
      $.assignment,
      $.procedure_call,
      $.method_procedure_call,
      $.if_statement,
      $.for_statement,
      $.foreach_statement,
      $.while_statement,
      $.repeat_statement,
      $.case_statement,
      $.switch_statement,
      $.goto_statement,
      $.label,
      $.return_statement,
      $.common_block,
      $.batch_include,
      $.compile_opt,
      $.on_ioerror,
    ),

    // =====================================================================
    // Procedure and Function definitions
    // =====================================================================

    // Assignment
    assignment: $ => prec.right(seq(
      field('left', choice(
        $.identifier,
        $.subscript_expression,
        $.member_expression,
        $.system_variable,
        $.unary_expression,
        $.call_expression,
      )),
      field('operator', choice('=', '+=', '-=', '*=', '/=')),
      field('right', $._expression),
    )),

    qualified_name: $ => seq(
      field('class', $.identifier),
      '::',
      field('method', $.identifier),
    ),

    procedure_definition: $ => seq(
      kw('pro'),
      field('name', choice($.identifier, $.qualified_name)),
      optional(seq(',', $.parameter_list)),
      optional($.body),
      kw('end'),
    ),

    function_definition: $ => seq(
      kw('function'),
      field('name', choice($.identifier, $.qualified_name)),
      optional(seq(',', $.parameter_list)),
      optional($.body),
      kw('end'),
    ),

    parameter_list: $ => seq(
      $._parameter,
      repeat(seq(',', $._parameter)),
    ),

    _parameter: $ => choice(
      $.keyword_parameter,
      $.keyword_flag,
      $.identifier,
    ),

    keyword_parameter: $ => seq(
      $.identifier,
      '=',
      $.identifier,
    ),

    keyword_flag: $ => seq('/', $.identifier),

    body: $ => repeat1($._simple_statement),

    // =====================================================================
    // Control flow
    // =====================================================================

    if_statement: $ => prec.right(seq(
      kw('if'),
      field('condition', $._expression),
      kw('then'),
      choice(
        // Block form: if ... then begin ... endif [else begin ... endelse]
        seq(
          kw('begin'),
          optional($.body),
          choice(kw('endif'), kw('end')),
          optional($.else_clause),
        ),
        // Inline form: if ... then stmt [else stmt]
        seq(
          $._simple_statement,
          optional($.else_clause),
        ),
      ),
    )),

    else_clause: $ => seq(
      kw('else'),
      choice(
        // Block form: else begin ... endelse
        seq(
          kw('begin'),
          optional($.body),
          choice(kw('endelse'), kw('end')),
        ),
        // Inline form: else stmt
        $._simple_statement,
      ),
    ),

    // =====================================================================
    // Loops
    // =====================================================================

    for_statement: $ => seq(
      kw('for'),
      $.identifier,
      '=',
      $._expression,
      ',',
      $._expression,
      optional(seq(',', $._expression)),
      kw('do'),
      choice(
        seq(kw('begin'), optional($.body), choice(kw('endfor'), kw('end'))),
        $._simple_statement,
      ),
    ),

    foreach_statement: $ => seq(
      kw('foreach'),
      $._expression,
      ',',
      $.identifier,
      optional(seq(',', $.identifier)),
      kw('do'),
      choice(
        seq(kw('begin'), optional($.body), choice(kw('endfor'), kw('end'))),
        $._simple_statement,
      ),
    ),

    while_statement: $ => seq(
      kw('while'),
      field('condition', $._expression),
      kw('do'),
      choice(
        seq(kw('begin'), optional($.body), choice(kw('endwhile'), kw('end'))),
        $._simple_statement,
      ),
    ),

    repeat_statement: $ => seq(
      kw('repeat'),
      choice(
        seq(kw('begin'), optional($.body), choice(kw('endrep'), kw('end'))),
        $._simple_statement,
      ),
      kw('until'),
      field('condition', $._expression),
    ),

    // =====================================================================
    // Case / Switch
    // =====================================================================

    case_statement: $ => seq(
      kw('case'),
      $._expression,
      kw('of'),
      repeat($.case_clause),
      optional($.case_else_clause),
      kw('endcase'),
    ),

    switch_statement: $ => seq(
      kw('switch'),
      $._expression,
      kw('of'),
      repeat($.case_clause),
      optional($.case_else_clause),
      kw('endswitch'),
    ),

    case_clause: $ => prec.right(seq(
      $._expression,
      ':',
      choice(
        seq(kw('begin'), optional($.body), kw('end')),
        optional($._simple_statement),
      ),
    )),

    case_else_clause: $ => prec.right(seq(
      kw('else'),
      ':',
      choice(
        seq(kw('begin'), optional($.body), kw('end')),
        optional($._simple_statement),
      ),
    )),

    // =====================================================================
    // Other statements
    // =====================================================================

    goto_statement: $ => seq(
      kw('goto'),
      ',',
      $.identifier,
    ),

    label: $ => seq(
      $.identifier,
      ':',
    ),

    return_statement: $ => prec.right(seq(
      kw('return'),
      optional(seq(',', $._expression)),
    )),

    common_block: $ => seq(
      kw('common'),
      field('name', $.identifier),
      repeat(seq(',', $.identifier)),
    ),

    batch_include: $ => seq(
      '@',
      $.identifier,
    ),

    compile_opt: $ => seq(
      kw('compile_opt'),
      $.identifier,
      repeat(seq(',', $.identifier)),
    ),

    on_ioerror: $ => seq(
      kw('on_ioerror'),
      ',',
      $.identifier,
    ),

    // =====================================================================
    // Procedure calls (procedure invocation as statement)
    // =====================================================================

    procedure_call: $ => prec.right(-1, seq(
      choice($.identifier, $.member_expression),
      optional(seq(',', $.argument_list)),
    )),

    // =====================================================================
    // Expressions
    // =====================================================================

    _expression: $ => choice(
      $.identifier,
      $.system_variable,
      $.number_literal,
      $.string_literal,
      $.binary_expression,
      $.unary_expression,
      $.parenthesized_expression,
      $.call_expression,
      $.subscript_expression,
      $.struct_expression,
      $.member_expression,
      $.method_call,
      $.ternary_expression,
      $.array_literal,
    ),

    call_expression: $ => prec(PREC.CALL, seq(
      choice($.identifier, $.member_expression),
      '(',
      optional($.argument_list),
      ')',
    )),

    subscript_expression: $ => prec(PREC.CALL, seq(
      $._expression,
      '[',
      $.argument_list,
      ']',
    )),

    argument_list: $ => seq(
      $._argument,
      repeat(seq(',', $._argument)),
    ),

    _argument: $ => choice(
      $.keyword_argument,
      $.range_expression,
      $.wildcard,
      $._expression,
    ),

    keyword_argument: $ => choice(
      prec.dynamic(1, seq($.identifier, '=', $._expression)),
      seq('/', $.identifier),
    ),

    range_expression: $ => seq(
      choice($._expression, $.wildcard),
      ':',
      choice($._expression, $.wildcard),
      optional(seq(':', $._expression)),
    ),

    wildcard: $ => '*',

    // Array literal: [expr, expr, ...]
    array_literal: $ => seq(
      '[',
      optional(seq(
        $._expression,
        repeat(seq(',', $._expression)),
      )),
      ']',
    ),

    // Structures
    struct_expression: $ => seq(
      '{',
      optional(seq(field('name', $.identifier), ',')),
      $.struct_field,
      repeat(seq(',', $.struct_field)),
      '}',
    ),

    struct_field: $ => seq(
      field('name', $.identifier),
      ':',
      $._expression,
    ),

    // Member access: struct.member
    member_expression: $ => prec.left(PREC.MEMBER, seq(
      $._expression,
      '.',
      $.identifier,
    )),

    // Object method call: obj->method(args) — expression (returns value)
    method_call: $ => prec.left(PREC.METHOD, seq(
      $._expression,
      '->',
      $.identifier,
      seq('(', optional($.argument_list), ')'),
    )),

    // Object method procedure call: obj->method[, args] — statement (no return)
    method_procedure_call: $ => prec.right(PREC.METHOD, seq(
      $._expression,
      '->',
      $.identifier,
      optional(seq(',', $.argument_list)),
    )),

    // Ternary: cond ? then_expr : else_expr
    ternary_expression: $ => prec.right(PREC.TERNARY, seq(
      $._expression,
      '?',
      $._expression,
      ':',
      $._expression,
    )),

    // Binary expressions with precedence
    binary_expression: $ => choice(
      ...[
        [kw('or'), PREC.OR],
        [kw('and'), PREC.AND],
        [kw('xor'), PREC.XOR],
        [kw('eq'), PREC.COMPARISON],
        [kw('ne'), PREC.COMPARISON],
        [kw('lt'), PREC.COMPARISON],
        [kw('gt'), PREC.COMPARISON],
        [kw('le'), PREC.COMPARISON],
        [kw('ge'), PREC.COMPARISON],
        ['+', PREC.ADDITION],
        ['-', PREC.ADDITION],
        ['<', PREC.ADDITION],
        ['>', PREC.ADDITION],
        ['*', PREC.MULTIPLICATION],
        ['/', PREC.MULTIPLICATION],
        [kw('mod'), PREC.MULTIPLICATION],
        ['=', PREC.COMPARISON],
        ['&&', PREC.AND],
        ['||', PREC.OR],
        ['^', PREC.EXPONENTIATION],
        ['#', PREC.MATRIX],
        ['##', PREC.MATRIX],
      ].map(([op, prec_val]) =>
        prec.left(/** @type {number} */ (prec_val), seq(
          field('left', $._expression),
          field('operator', /** @type {string | RegExp} */ (op)),
          field('right', $._expression),
        ))
      ),
    ),

    // Unary expressions
    unary_expression: $ => choice(
      prec(PREC.UNARY, seq('-', $._expression)),
      prec(PREC.UNARY, seq('+', $._expression)),
      prec(PREC.NOT, seq(kw('not'), $._expression)),
      prec(PREC.UNARY, seq('~', $._expression)),
      prec(PREC.UNARY, seq('*', $._expression)),
    ),

    // Parenthesized expressions
    parenthesized_expression: $ => seq('(', $._expression, ')'),

    // Identifiers — may contain $ (for mds$value etc.)
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_$]*/,

    // System variables — !variable
    system_variable: $ => /![a-zA-Z_][a-zA-Z0-9_]*/,

    // Number literals
    number_literal: $ => token(choice(
      seq("'", /[0-9a-fA-F]+/, "'", /[xX]/),
      seq("'", /[0-7]+/, "'", /[oO]/),
      seq("'", /[01]+/, "'", /[bB]/),
      seq(
        choice(
          seq(/[0-9]+/, '.', /[0-9]*/),
          seq('.', /[0-9]+/),
          /[0-9]+/,
        ),
        /[eEdD]/,
        optional(/[+-]/),
        /[0-9]+/,
      ),
      seq(/[0-9]+/, '.', /[0-9]*/),
      seq('.', /[0-9]+/),
      seq(/[0-9]+/, /[bBsSlLuU]+/),
      /[0-9]+/,
    )),

    // String literals
    string_literal: $ => choice(
      seq("'", repeat(choice(/[^'\n]+/, "''")), "'"),
      seq('"', repeat(choice(/[^"\n]+/, '""')), '"'),
    ),

    // Comments
    comment: $ => token(seq(';', /[^\n]*/)),

    // Line continuation — $ at end of line, optionally followed by comment
    _line_continuation: $ => token(seq(
      '$',
      /[ \t]*/,
      optional(seq(/[;!]/, /[^\n]*/)),
      /\n/,
    )),
  },
});
