; GDL/IDL syntax highlighting queries

; Procedure/function names
(procedure_definition
  name: (identifier) @function)

(procedure_definition
  name: (qualified_name
    class: (identifier) @type
    method: (identifier) @function))

(function_definition
  name: (identifier) @function)

(function_definition
  name: (qualified_name
    class: (identifier) @type
    method: (identifier) @function))

; Function calls
(call_expression
  (identifier) @function.call)

; Method calls
(method_call
  (identifier) @function.method)

; Method procedure calls
(method_procedure_call
  (identifier) @function.method)

; Procedure calls
(procedure_call
  (identifier) @function.call)

; Literals
(number_literal) @number
(string_literal) @string
(system_variable) @variable.builtin

; Comments
(comment) @comment

; Parameters
(parameter_list
  (identifier) @variable.parameter)

(keyword_parameter
  (identifier) @variable.parameter)

(keyword_flag
  (identifier) @variable.parameter)

; Labels
(label
  (identifier) @label)

; Structure fields
(struct_field
  name: (identifier) @property)

; Struct names
(struct_expression
  name: (identifier) @type)

; Common block names
(common_block
  name: (identifier) @type)

; Punctuation
["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["," ":" "::" "." "->" "@"] @punctuation.delimiter

; Operators
["+" "-" "*" "/" "^" "#" "##" "=" "+=" "-=" "*=" "/=" "?" "~" "<" ">" "&&" "||"] @operator

; Identifiers (catch-all, lowest priority)
(identifier) @variable
