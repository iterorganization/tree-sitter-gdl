"""Tests for tree-sitter-gdl Python bindings."""

import tree_sitter_gdl
from tree_sitter import Language, Parser


def _parse(source: str):
    """Parse GDL source code and return the root node."""
    parser = Parser()
    parser.language = tree_sitter_gdl.language()
    tree = parser.parse(source.encode("utf-8"))
    return tree.root_node


class TestLanguageBinding:
    """Test that the Python binding loads correctly."""

    def test_language_returns_language(self):
        lang = tree_sitter_gdl.language()
        assert isinstance(lang, Language)

    def test_language_creates_parser(self):
        parser = Parser()
        parser.language = tree_sitter_gdl.language()
        assert parser is not None

    def test_parse_empty_source(self):
        root = _parse("")
        assert root.type == "source_file"
        assert root.child_count == 0


class TestProcedures:
    """Test procedure parsing via Python bindings."""

    def test_simple_procedure(self):
        root = _parse("pro greet\n  print, 'hello'\nend")
        assert root.type == "source_file"
        proc = root.children[0]
        assert proc.type == "procedure_definition"
        assert proc.child_by_field_name("name").text == b"greet"

    def test_procedure_with_params(self):
        root = _parse("pro add, a, b\n  c = a + b\nend")
        proc = root.children[0]
        assert proc.type == "procedure_definition"
        assert proc.child_by_field_name("name").text == b"add"

    def test_procedure_with_keywords(self):
        root = _parse("pro setup, verbose=verbose\nend")
        proc = root.children[0]
        assert proc.type == "procedure_definition"


class TestFunctions:
    """Test function parsing."""

    def test_simple_function(self):
        root = _parse("function square, x\n  return, x^2\nend")
        func = root.children[0]
        assert func.type == "function_definition"
        assert func.child_by_field_name("name").text == b"square"

    def test_function_return(self):
        root = _parse("function identity, x\n  return, x\nend")
        func = root.children[0]
        body = [c for c in func.children if c.type == "body"][0]
        ret = body.children[0]
        assert ret.type == "return_statement"


class TestExpressions:
    """Test expression parsing."""

    def test_assignment(self):
        root = _parse("x = 42")
        assign = root.children[0]
        assert assign.type == "assignment"
        assert assign.child_by_field_name("left").text == b"x"

    def test_binary_expression(self):
        root = _parse("x = a + b")
        assign = root.children[0]
        expr = assign.child_by_field_name("right")
        assert expr.type == "binary_expression"

    def test_call_expression(self):
        root = _parse("x = sqrt(4)")
        assign = root.children[0]
        call = assign.child_by_field_name("right")
        assert call.type == "call_expression"

    def test_subscript_expression(self):
        root = _parse("x = arr[0]")
        assign = root.children[0]
        sub = assign.child_by_field_name("right")
        assert sub.type == "subscript_expression"

    def test_system_variable(self):
        root = _parse("x = !pi")
        assign = root.children[0]
        sysvar = assign.child_by_field_name("right")
        assert sysvar.type == "system_variable"

    def test_ternary(self):
        root = _parse("x = a gt 0 ? a : 0")
        assign = root.children[0]
        tern = assign.child_by_field_name("right")
        assert tern.type == "ternary_expression"

    def test_struct_expression(self):
        root = _parse("x = {name: 'test', value: 42}")
        assign = root.children[0]
        struct = assign.child_by_field_name("right")
        assert struct.type == "struct_expression"


class TestControlFlow:
    """Test control flow parsing."""

    def test_if_inline(self):
        root = _parse("if x gt 0 then print, 'positive'")
        stmt = root.children[0]
        assert stmt.type == "if_statement"

    def test_if_block(self):
        root = _parse("if x gt 0 then begin\n  y = 1\nendif")
        stmt = root.children[0]
        assert stmt.type == "if_statement"

    def test_for_loop(self):
        root = _parse("for i = 0, 9 do begin\n  x = i\nendfor")
        stmt = root.children[0]
        assert stmt.type == "for_statement"

    def test_while_loop(self):
        root = _parse("while x gt 0 do begin\n  x = x - 1\nendwhile")
        stmt = root.children[0]
        assert stmt.type == "while_statement"

    def test_case_statement(self):
        root = _parse("case x of\n  1: print, 'one'\n  else: print, 'other'\nendcase")
        stmt = root.children[0]
        assert stmt.type == "case_statement"


class TestMDSplus:
    """Test MDSplus access patterns common in fusion code."""

    def test_mds_open(self):
        root = _parse("mds$open, 'experiment', shot")
        call = root.children[0]
        assert call.type == "procedure_call"
        assert call.children[0].text == b"mds$open"

    def test_mds_value(self):
        root = _parse("val = mds$value('\\diagnostics::channel')")
        assign = root.children[0]
        call = assign.child_by_field_name("right")
        assert call.type == "call_expression"
        assert call.children[0].text == b"mds$value"

    def test_dollar_in_identifiers(self):
        root = _parse("lib$routine, arg")
        call = root.children[0]
        assert call.children[0].text == b"lib$routine"


class TestErrorRecovery:
    """Test that parsing produces valid trees even for edge cases."""

    def test_no_errors_on_valid_procedure(self):
        root = _parse(
            "pro analyze, shot\n"
            "  mds$open, 'tree', shot\n"
            "  data = mds$value('\\node::path')\n"
            "  if n_elements(data) gt 0 then begin\n"
            "    result = total(data)\n"
            "  endif\n"
            "  mds$close\n"
            "  return\n"
            "end\n"
        )
        assert not root.has_error

    def test_no_errors_on_complex_code(self):
        root = _parse(
            "function compute, arr, /verbose, scale=scale\n"
            "  compile_opt idl2\n"
            "  n = n_elements(arr)\n"
            "  result = fltarr(n)\n"
            "  for i = 0, n-1 do begin\n"
            "    result[i] = arr[i] * scale + !pi\n"
            "  endfor\n"
            "  return, result\n"
            "end\n"
        )
        assert not root.has_error

    def test_line_continuations_no_errors(self):
        root = _parse(
            "x = first + $\n"
            "  second + $\n"
            "  third\n"
        )
        assert not root.has_error


class TestNodeTraversal:
    """Test AST traversal capabilities useful for chunking."""

    def test_walk_procedure_body(self):
        root = _parse(
            "pro example\n"
            "  x = 1\n"
            "  y = 2\n"
            "end\n"
        )
        proc = root.children[0]
        body = [c for c in proc.children if c.type == "body"][0]
        stmts = [c for c in body.children if c.is_named]
        assert len(stmts) == 2
        assert all(s.type == "assignment" for s in stmts)

    def test_find_all_procedures(self):
        root = _parse(
            "pro first\n  x = 1\nend\n"
            "pro second\n  y = 2\nend\n"
        )
        procs = [c for c in root.children if c.type == "procedure_definition"]
        assert len(procs) == 2
        names = [p.child_by_field_name("name").text for p in procs]
        assert names == [b"first", b"second"]

    def test_find_all_function_calls(self):
        root = _parse("x = sqrt(abs(y))")
        calls = []

        def walk(node):
            if node.type == "call_expression":
                calls.append(node.children[0].text)
            for child in node.children:
                walk(child)

        walk(root)
        assert b"sqrt" in calls
        assert b"abs" in calls
