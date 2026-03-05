"""GDL/IDL grammar for tree-sitter."""

from tree_sitter import Language as _Language

from ._binding import language as _language


def language() -> _Language:
    """Return the tree-sitter Language for GDL/IDL."""
    return _Language(_language())
