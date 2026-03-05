; GDL/IDL locals (scope/definition) queries

(procedure_definition) @scope
(function_definition) @scope
(if_statement) @scope
(for_statement) @scope
(foreach_statement) @scope
(while_statement) @scope
(repeat_statement) @scope

(procedure_definition
  name: (identifier) @definition.function)

(function_definition
  name: (identifier) @definition.function)

(parameter_list
  (identifier) @definition.parameter)

(keyword_parameter
  (identifier) @definition.parameter)

(keyword_flag
  (identifier) @definition.parameter)

(assignment
  left: (identifier) @definition.var)

(for_statement
  (identifier) @definition.var)

(common_block
  name: (identifier) @definition.type)

(identifier) @reference
