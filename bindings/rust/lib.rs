//! GDL/IDL grammar for tree-sitter.

use tree_sitter_language::LanguageFn;

extern "C" {
    fn tree_sitter_gdl() -> *const ();
}

/// Returns the tree-sitter [`LanguageFn`] for GDL/IDL.
///
/// # Examples
///
/// ```
/// let language = tree_sitter_gdl::LANGUAGE;
/// let mut parser = tree_sitter::Parser::new();
/// parser.set_language(&language.into()).expect("Error loading GDL parser");
/// ```
pub const LANGUAGE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_gdl) };

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_load_grammar() {
        let mut parser = tree_sitter::Parser::new();
        parser
            .set_language(&LANGUAGE.into())
            .expect("Error loading GDL parser");
    }
}
