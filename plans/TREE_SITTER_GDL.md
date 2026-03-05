# Tree-sitter Grammar for GDL (GNU Data Language)

> **Goal**: Create a tree-sitter grammar for GDL/IDL to enable AST-based code parsing for fusion and astronomy scientific code.

**Repository**: `iterorganization/tree-sitter-gdl` (forked to `simon-mcintosh/tree-sitter-gdl` for development)
**PyPI Package**: `tree-sitter-gdl`
**Grammar Name**: `gdl`

## Context: TCV Code Discovery Data (March 2026)

First-pass code file discovery at TCV reveals 63,945 code files across 7 languages:

| Language | Files | % of Total | Tree-sitter Support | Chunking Method |
|----------|------:|----------:|---------------------|-----------------|
| MATLAB | 41,911 | 65.5% | **Yes** — `tree-sitter-language-pack` | AST chunking |
| Fortran | 9,090 | 14.2% | **Yes** — `tree-sitter-language-pack` | AST chunking |
| IDL/GDL | 4,667 | 7.3% | **No** — this project | Text fallback |
| Python | 3,315 | 5.2% | **Yes** — `tree-sitter-language-pack` | AST chunking |
| TDI | 3,005 | 4.7% | **No** — domain-specific | Text fallback |
| C | 1,530 | 2.4% | **Yes** — `tree-sitter-language-pack` | AST chunking |
| C++ | 427 | 0.7% | **Yes** — `tree-sitter-language-pack` | AST chunking |

**Key finding**: IDL is the **only general-purpose language** lacking tree-sitter support. TDI is a domain-specific MDSplus expression language — not a candidate for tree-sitter. All other languages (MATLAB, Fortran, Python, C, C++, Julia) have confirmed working parsers via `tree-sitter-language-pack ≥0.13.0`.

### Verified Tree-sitter Support (March 2026)

All parsers confirmed working end-to-end through `tree-sitter-language-pack`:

```
python:  OK — tree-sitter-language-pack.get_parser('python')
matlab:  OK — tree-sitter-language-pack.get_parser('matlab')
fortran: OK — tree-sitter-language-pack.get_parser('fortran')
c:       OK — tree-sitter-language-pack.get_parser('c')
cpp:     OK — tree-sitter-language-pack.get_parser('cpp')
julia:   OK — tree-sitter-language-pack.get_parser('julia')
bash:    OK — tree-sitter-language-pack.get_parser('bash')
idl:     NOT SUPPORTED — "Could not find language library for idl"
gdl:     NOT SUPPORTED — "Could not find language library for gdl"
tdi:     NOT SUPPORTED — "Could not find language library for tdi"
```

### imas-codex Dependencies (pyproject.toml)

Current dependencies are correct and sufficient for all supported languages:

```toml
"tree-sitter>=0.25.2",
"tree-sitter-languages>=1.10.2",         # Legacy — may be removable
"tree-sitter-language-pack>=0.13.0",      # Primary: 165+ languages
```

The `tree-sitter-languages` dependency may be vestigial — `tree-sitter-language-pack` supersedes it. Consider removing in a future cleanup.

### Current IDL Handling in imas-codex

IDL files (`.pro`) fall back to text-based chunking (sliding-window on line boundaries):

- [imas_codex/ingestion/readers/remote.py](imas_codex/ingestion/readers/remote.py): `TEXT_SPLITTER_LANGUAGES = {"tdi", "idl", ...}`
- [imas_codex/config/patterns/file_types.yaml](imas_codex/config/patterns/file_types.yaml): `idl: tree_sitter: false`
- [imas_codex/ingestion/chunkers.py](imas_codex/ingestion/chunkers.py): Routes to `chunk_text()` when `language in TEXT_SPLITTER_LANGUAGES`

Text-based splitting works but produces lower-quality chunks: it can't respect procedure/function boundaries, splits mid-expression across line continuations, and doesn't understand IDL block structure (begin/end pairs).

> **Note**: imas-codex uses tree-sitter directly via `tree-sitter-language-pack.get_parser()` — there is no LlamaIndex intermediary. tree-sitter-gdl is a **tree-sitter plugin**, not a framework plugin. This means integration is a single `get_parser()` call.

## Naming Decision

We use **GDL** (GNU Data Language) rather than IDL because:
1. GDL is the open-source implementation — no trademark concerns
2. `tree-sitter-idl` already exists for OMG IDL (CORBA Interface Definition Language)
3. PyPI package `tree-sitter-gdl` is available
4. GDL is 100% syntax-compatible with IDL — same `.pro` files

## Motivation & Value Assessment

### Quantitative Impact

- **4,667 IDL files at TCV** would benefit from AST-aware chunking
- At typical ingestion rates (~75% pass triage), ~3,500 files would be chunked
- AST chunking produces ~30-50% fewer chunks with better semantic boundaries vs text splitting
- Procedure/function boundaries are preserved, improving embedding quality and downstream retrieval

### Qualitative Impact

- IDL code at TCV is heavily MDSplus-oriented (`mds$open`, `mds$value`, `mds$put` calls throughout)
- Procedure-level chunking would improve MDSplus path extraction accuracy
- Code evidence linking (DataReference → TreeNode → FacilitySignal) works better with semantically coherent chunks
- Benefits the broader scientific community (astronomy, earth science use IDL extensively)

### Is It Worth Building?

**Yes.** IDL is the **3rd most common language** at TCV (after MATLAB and Fortran), with nearly 5,000 files. The grammar complexity is moderate (~600-900 lines of JavaScript), simpler than Fortran or MATLAB which already have grammars. The effort-to-impact ratio is favorable.

## Discovering GDL/IDL Syntax

### MCP Server Access

The imas-codex MCP server (`python()` REPL tool) provides SSH access to TCV for exploring `.pro` files. When the MCP server is available:

```python
# Using the python() REPL tool — requires MCP server running

# Find .pro files
print(ssh("find /home -name '*.pro' -maxdepth 5 2>/dev/null | head -20"))

# Search for MDSplus access patterns
print(ssh("rg -l 'mds\\$open|mds\\$value' /home -g '*.pro' --max-depth 5 2>/dev/null | head -10"))

# Read sample file
print(ssh("cat /home/admele/Code/shotdesign/idl/liuqe_params.pro"))

# Find procedure/function definitions
print(ssh("rg '^pro |^function ' /home/admele/Code/shotdesign/idl/ -g '*.pro' 2>/dev/null"))
```

### Direct SSH Access (Alternative)

When MCP is not available, SSH to TCV directly:

```bash
ssh tcv "find /home -name '*.pro' -maxdepth 5 2>/dev/null | head -20"
ssh tcv "cat /home/admele/Code/shotdesign/idl/liuqe_params.pro"
```

### Known IDL File Locations at TCV

| Path | Content | Constructs |
|------|---------|------------|
| `/home/admele/Code/shotdesign/idl/` | Shot design recipes (TCVCS) | `mds$open`, `mds$value`, `mds$put`, `for/do`, `if/then/begin/endif` |
| `/home/cordaro/script_analisi/idl/` | Magnetic probe analysis | `mds$value`, `case/of`, `readcol`, array slicing |
| `/home/VMS/XYZ/MDSMGR/IDL/` | MDSplus management utilities | `mds$open`, `mds$close`, `mds$put`, line continuation `$` |
| `/home/agostini/tcv/` | Diagnostic analysis | Mixed MDSplus access patterns |

## GDL/IDL Syntax Overview (from TCV Inspection)

### Real-World Constructs Observed at TCV

The following syntax patterns are confirmed from actual TCV `.pro` files:

### 1. Procedures and Functions

```idl
; Simple procedure (liuqe_params.pro)
pro liuqe_params
  on_error, 2
  mds$open, 'tcv_shot', -1
  nequil = mds$value('\pcs::mgams.data:numeq')
end

; Function with return (pcs_invgains.pro)
function amp_gain, name, magvalues, magnames, labels, dim_labels
  label = labels(where(name eq dim_labels))
  index = where(magnames eq name)
  gain = mds$value('_amp_gainmat[_n-1,' + string(setting) + ']')
  return, -0.9969 * gain
end

; Procedure with keywords
pro analyze_shot, shot, verbose=verbose, output_dir=output_dir
  if n_elements(output_dir) eq 0 then output_dir = '~/analysis'
end
```

### 2. Control Structures (all confirmed in TCV code)

```idl
; If/then inline
if nequil lt 1 then message, 'numeq < 1!'

; If/then/begin/endif block
if ilia(i) ne 0 then begin
  rbou = rlia1(0:ilia(i)-1, i)
  zbou = zlia1(0:ilia(i)-1, i)
endif else begin
  rbou = rlim1(0:ilie(i)-1, i)
endelse

; For loop
for i = 0, nequil-1 do begin
  if iansha(i) eq 0 then begin
    ; nested if/then
  endif
endfor

; Case statement
case button of
  1: begin
    t_bps3 = t
    bps3 = sig
  end
  2: begin
    t_bps7 = t
  end
endcase

; Goto (legacy pattern, still common)
goto, def_params
```

### 3. MDSplus Access Patterns (critical for imas-codex)

```idl
; Open/close tree
mds$open, 'tcv_shot', shot
mds$close

; Read node values
nequil = mds$value('\pcs::mgams.data:numeq')
ip = mds$value('\magnetics::ip')

; Write values
mds$put, '\pcs::feed_gains', '$', gains

; Dynamic TDI expressions
gain = mds$value('_amp_gainmat[_n-1,' + string(setting) + ']')
dum = mds$value('_pre_nnn=iii(element(3,"/","' + label(0) + '"))')

; GETnci introspection
ll = mds$value('getnci(".TRCF_001:CHANNEL_001","RLENGTH")')
```

### 4. Operators (word-based comparison is the main complexity)

```idl
; Word comparison operators
a eq b    ; equal
a ne b    ; not equal
a lt b    ; less than
a gt b    ; greater than
a le b    ; less or equal
a ge b    ; greater or equal

; Logical
a and b, a or b, not a

; Arithmetic
a + b, a - b, a * b, a / b, a ^ b, a mod b
```

### 5. Line Continuation

```idl
; $ at end of line continues to next line (very common at TCV)
if mds$value('getnci(".TRCF_001:CHANNEL_001","RLENGTH")') eq 24 then    $
   ll = 0                                                               $
else                                                                    $
   ll = mds$value('size(.TRCF_001:CHANNEL_001)')
```

### 6. Data Types and Arrays

```idl
; Arrays
rout = fltarr(nequil)
load_gains = intarr(24) + 1

; Array indexing
rbou = rlia1(0:ilia(i)-1, i)
load_gains(fix(outputs)-1) = gains

; String operations
outputs = strupcase(mds$value('\pcs::phys_mat_a_outputs'))
outputs = strmid(outputs, 2, 3)

; Structures
{tag1: value1, tag2: value2}
```

## Feasibility Assessment

### IDL Syntax Complexity

| Feature | Complexity | Notes |
|---------|------------|-------|
| Procedures/Functions | Low | `pro`/`function`...`end` blocks |
| Control structures | Medium | `if/then/else`, `for/do`, `case/of`, inline and block forms |
| Operators | Medium | Word operators (`eq`, `ne`, `and`, `or`) — context-sensitive |
| Array indexing | Medium | `[start:end:step]`, `[*]`, `(index)` function-call ambiguity |
| Keywords | Low | `/keyword`, `keyword=value` |
| Strings | Low | Single `'` and double `"` quoted |
| Comments | Low | `;` to end of line |
| Line continuation | Low | `$` at end of line |
| Object-oriented | Medium | `obj->method` syntax (less common at TCV) |
| MDSplus calls | Low | `mds$open`, `mds$value` — just identifiers with `$` |
| Goto | Low | `goto, label` — legacy but still used |
| Common blocks | Low | `common block_name, var1, var2` |

### Key Parsing Challenge: `$` Character

The `$` character has **dual meaning** in IDL:
1. **Line continuation** — `$` at end of line (before optional comment)
2. **Identifier character** — `mds$value`, `mds$open` include `$` as part of the name

This requires the grammar to distinguish: `mds$value` (single identifier) vs `result = value $\n+ more` (continuation). This is resolvable via context — `$` followed by optional whitespace/comment and newline is continuation; `$` within an alphanumeric sequence is part of the identifier.

### Comparison to Existing Grammars

| Grammar | Lines | Complexity | Notes |
|---------|-------|------------|-------|
| tree-sitter-matlab | ~800 | Similar family | Most relevant reference — same era, same scientific domain |
| tree-sitter-fortran | ~1,200 | More complex | Fixed/free form, MODULE/PROGRAM/SUBROUTINE |
| tree-sitter-python | ~1,500 | More complex | Significant-whitespace, decorators, comprehensions |
| tree-sitter-bash | ~1,000 | Comparable | Context-sensitive keywords, similar to IDL |

**Estimate**: GDL grammar ~600-900 lines of JavaScript. Simpler than MATLAB (no class system, no namespace), simpler than Fortran (no fixed-form). The `$` dual-meaning and word operators are the main complexities.

## Implementation Plan

### Phase 1: Repository Setup & Core Grammar

**Deliverables:**
- [x] `tree-sitter init` scaffolding (grammar.js, package.json, bindings/)
- [x] Install `tree-sitter-cli` via npm
- [x] Basic expressions: numbers (int, long, float, double, scientific), strings, identifiers (including `$` in names)
- [x] Operators: arithmetic (`+`, `-`, `*`, `/`, `^`, `mod`, `<`, `>`), comparison (`eq`, `ne`, `lt`, `gt`, `le`, `ge`), logical (`and`, `or`, `xor`, `not`)
- [x] Comments (`;` to end of line, including `;+`/`;-` docstring blocks)
- [x] Line continuation (`$` at EOL)
- [x] Assignment (`=`)
- [x] First corpus tests

### Phase 2: Statements and Control Flow

**Deliverables:**
- [x] Procedure definitions (`pro name, args`...`end`)
- [x] Function definitions (`function name, args`...`end`)
- [x] If/then/else — inline form (`if cond then stmt`)
- [x] If/then/begin — block form (`if cond then begin`...`endif`...`endelse`)
- [x] For loops (`for i=0, n-1 do begin`...`endfor`)
- [x] While loops (`while cond do begin`...`endwhile`)
- [x] Repeat/until (`repeat begin`...`endrep until cond`)
- [x] Case/switch statements (`case expr of`...`endcase`)
- [x] Goto (`goto, label`)
- [x] Return (`return, value`)
- [x] Common blocks (`common name, var1, var2`)
- [x] Batch include (`@filename`)

### Phase 3: Expressions and Advanced Features

**Deliverables:**
- [x] Function/procedure calls with positional and keyword arguments
- [x] Keyword shorthand (`/keyword`)
- [x] Array indexing: `arr[0]`, `arr[0:10]`, `arr[*]`, `arr[0:*:2]`
- [x] Parenthesized subscript: `arr(0)` (ambiguous with function call — use MATLAB approach)
- [x] Structure definitions: `{tag1: val1}`, `{name, tag1: val1}`
- [x] Structure member access: `struct.member`
- [x] Object method calls: `obj->method`
- [x] Matrix operators: `#`, `##`
- [x] System variable access: `!variable` (e.g., `!pi`, `!stime`)
- [x] Ternary: `cond ? expr1 : expr2` (IDL 8.0+)
- [x] Array literals: `[expr, expr, ...]`
- [x] Min/max operators: `<`, `>`

### Phase 4: Python Bindings & Wheel Publishing

**Deliverables:**
- [x] `pyproject.toml` with `tree-sitter` build system
- [x] Python bindings via `tree-sitter init --update` (generates `bindings/python/`)
- [x] `setup.py` for C extension compilation
- [x] GitHub Actions CI: test on Linux/macOS/Windows
- [x] GitHub Actions release: build wheels via `cibuildwheel`, publish to PyPI
- [x] `Cargo.toml` for Rust bindings (optional, for tree-sitter ecosystem)
- [x] Syntax highlighting queries (`queries/highlights.scm`)
- [x] Scope/definition queries (`queries/locals.scm`)
- [x] Python pytest tests (29 tests)
- [x] Edge case and MDSplus corpus tests (118 total corpus tests)
- [x] Real-world validation with complex synthetic code (0 parse errors)

### Phase 5: imas-codex Integration

**Deliverables:**
- [ ] Add `tree-sitter-gdl` as optional dependency in imas-codex `pyproject.toml`
- [ ] Register GDL parser in `imas_codex/ingestion/chunkers.py` — one `get_parser()` call
- [ ] Remove `"idl"` from `TEXT_SPLITTER_LANGUAGES` in `remote.py`
- [ ] Update `file_types.yaml`: `idl: tree_sitter: true`
- [ ] PR to `tree-sitter-language-pack` to include `gdl` grammar
- [ ] Once merged upstream, switch to `tree-sitter-language-pack` and remove standalone dep

## Integration Architecture

tree-sitter-gdl is a **tree-sitter plugin** — it produces a compiled grammar that any tree-sitter host can load. imas-codex uses tree-sitter directly (not via LlamaIndex or any other framework), so integration is straightforward.

### Before tree-sitter-language-pack Inclusion

Until `gdl` is merged into `tree-sitter-language-pack`, imas-codex registers the custom parser:

```python
# imas_codex/ingestion/chunkers.py — get_parser() with GDL fallback
def get_parser(language: str) -> Parser:
    """Get a tree-sitter parser for the given language."""
    if language == "idl":
        try:
            import tree_sitter_gdl
            return Parser(tree_sitter_gdl.language())
        except ImportError:
            raise ValueError(
                "tree-sitter-gdl not installed. "
                "Install with: uv add tree-sitter-gdl"
            )
    # All other languages — use tree-sitter-language-pack
    from tree_sitter_language_pack import get_parser
    return get_parser(language)
```

No framework intermediary — this is a direct tree-sitter API call. The parser object feeds into `chunk_code()` which walks the AST and produces chunks respecting function/procedure boundaries.

### After tree-sitter-language-pack Inclusion

Submit PR to [Goldziher/tree-sitter-language-pack](https://github.com/Goldziher/tree-sitter-language-pack) adding `gdl` as a vendored grammar. Once merged and released:

1. Remove `tree-sitter-gdl` from imas-codex dependencies
2. Remove custom parser registration in `chunkers.py`
3. Remove `"idl"` from `TEXT_SPLITTER_LANGUAGES`
4. Everything routes through standard `get_parser('gdl')` path

## Repository Structure

```
tree-sitter-gdl/
├── grammar.js              # Main grammar definition (~600-900 lines)
├── src/
│   ├── parser.c            # Generated by tree-sitter generate
│   ├── scanner.c           # Custom scanner for $ disambiguation (if needed)
│   └── tree_sitter/
│       └── parser.h
├── bindings/
│   ├── python/
│   │   └── tree_sitter_gdl/
│   │       ├── __init__.py
│   │       ├── __init__.pyi
│   │       └── binding.c
│   ├── rust/
│   │   ├── lib.rs
│   │   └── build.rs
│   └── node/
│       ├── index.js
│       ├── index.d.ts
│       └── binding.cc
├── queries/
│   ├── highlights.scm      # Syntax highlighting queries
│   └── locals.scm          # Scope/definition queries
├── test/
│   └── corpus/             # Tree-sitter corpus tests
│       ├── expressions.txt
│       ├── statements.txt
│       ├── control_flow.txt
│       ├── procedures.txt
│       ├── functions.txt
│       ├── mdsplus.txt     # MDSplus access patterns
│       └── arrays.txt
├── .github/
│   └── workflows/
│       ├── ci.yml          # Test on push/PR
│       └── release.yml     # Build wheels + publish to PyPI
├── package.json
├── Cargo.toml
├── pyproject.toml
├── setup.py                # C extension build
├── tree-sitter.json        # Tree-sitter metadata
├── LICENSE                 # MIT
└── README.md
```

## Testing Strategy

### Principle: No Real TCV Data in Public Tests

The `tree-sitter-gdl` repo is public. Test corpus files must **never** contain:
- Actual TCV shot numbers
- Real MDSplus node paths from TCV infrastructure
- Real user names or file paths from EPFL
- Proprietary diagnostic names or calibration data

### Approach: Synthetic Test Corpus

Create test cases that exercise the **same syntactic patterns** observed at TCV while using entirely fictional content. The patterns are language syntax — they are not proprietary. The content (variable names, paths, numeric values) is replaced with generic equivalents.

**Example: Translating real patterns to test cases**

Real TCV code (NOT for tests):
```idl
mds$open, 'tcv_shot', shot
ip = mds$value('\magnetics::ip')
```

Synthetic test equivalent:
```idl
mds$open, 'experiment', shot_number
signal = mds$value('\diagnostics::measurement')
```

The grammar doesn't care about string content — it parses the syntax structure. We test that `mds$open` is recognized as an identifier (with `$`), that the comma-separated arguments parse correctly, and that the string literal is captured.

### Corpus Test Files

Each corpus file tests one syntactic area:

#### `test/corpus/expressions.txt`
```text
================================================================================
Integer literals
================================================================================

x = 42
y = 42L
z = 42LL

--------------------------------------------------------------------------------

(source_file
  (assignment (identifier) (integer))
  (assignment (identifier) (long_integer))
  (assignment (identifier) (long64_integer)))

================================================================================
Float literals
================================================================================

a = 3.14
b = 3.14d0
c = 1e10
d = 1d10

--------------------------------------------------------------------------------

(source_file
  (assignment (identifier) (float))
  (assignment (identifier) (double))
  (assignment (identifier) (float))
  (assignment (identifier) (double)))

================================================================================
String literals
================================================================================

s1 = 'single quoted'
s2 = "double quoted"

--------------------------------------------------------------------------------

(source_file
  (assignment (identifier) (string))
  (assignment (identifier) (string)))

================================================================================
Identifiers with dollar sign
================================================================================

result = lib$routine
data = mds$value('test')

--------------------------------------------------------------------------------

(source_file
  (assignment (identifier) (identifier))
  (assignment (identifier) (call_expression (identifier) (argument_list (string)))))

================================================================================
System variables
================================================================================

pi_val = !pi
err = !error_state

--------------------------------------------------------------------------------

(source_file
  (assignment (identifier) (system_variable))
  (assignment (identifier) (system_variable)))
```

#### `test/corpus/procedures.txt`
```text
================================================================================
Simple procedure
================================================================================

pro greet, name
  print, 'Hello, ' + name
end

--------------------------------------------------------------------------------

(source_file
  (procedure_definition
    name: (identifier)
    parameters: (parameter_list (identifier))
    body: (body
      (call_expression
        (identifier)
        (argument_list
          (binary_expression (string) (identifier)))))))

================================================================================
Procedure with keywords
================================================================================

pro configure, device, verbose=verbose, timeout=timeout
  if keyword_set(verbose) then print, 'Configuring...'
end

--------------------------------------------------------------------------------

(source_file
  (procedure_definition
    name: (identifier)
    parameters: (parameter_list
      (identifier)
      (keyword_parameter (identifier) (identifier))
      (keyword_parameter (identifier) (identifier)))
    body: (body
      (if_statement
        (call_expression (identifier) (argument_list (identifier)))
        (call_expression (identifier) (argument_list (string)))))))
```

#### `test/corpus/control_flow.txt`
```text
================================================================================
If/then inline
================================================================================

if count lt 1 then print, 'Empty'

--------------------------------------------------------------------------------

(source_file
  (if_statement
    (comparison_expression (identifier) (identifier))
    (call_expression (identifier) (argument_list (string)))))

================================================================================
If/then/begin block
================================================================================

if count gt 0 then begin
  total = total + count
endif else begin
  total = 0
endelse

--------------------------------------------------------------------------------

(source_file
  (if_statement
    (comparison_expression (identifier) (integer))
    (body (assignment (identifier) (binary_expression (identifier) (identifier))))
    (else_clause
      (body (assignment (identifier) (integer))))))

================================================================================
For loop
================================================================================

for i = 0, n-1 do begin
  values[i] = compute(i)
endfor

--------------------------------------------------------------------------------

(source_file
  (for_statement
    (identifier)
    (integer)
    (binary_expression (identifier) (integer))
    (body
      (assignment
        (subscript_expression (identifier) (identifier))
        (call_expression (identifier) (argument_list (identifier)))))))

================================================================================
Case statement
================================================================================

case mode of
  1: print, 'First'
  2: begin
    print, 'Second'
    result = compute()
  end
  else: print, 'Default'
endcase

--------------------------------------------------------------------------------

(source_file
  (case_statement
    (identifier)
    (case_clause (integer) (call_expression (identifier) (argument_list (string))))
    (case_clause (integer)
      (body
        (call_expression (identifier) (argument_list (string)))
        (assignment (identifier) (call_expression (identifier)))))
    (else_clause (call_expression (identifier) (argument_list (string))))))
```

#### `test/corpus/mdsplus.txt`
```text
================================================================================
MDS open and close
================================================================================

mds$open, 'experiment', shot_num
mds$close

--------------------------------------------------------------------------------

(source_file
  (call_expression (identifier) (argument_list (string) (identifier)))
  (call_expression (identifier)))

================================================================================
MDS value with path
================================================================================

signal = mds$value('\diagnostics::channel_01')

--------------------------------------------------------------------------------

(source_file
  (assignment
    (identifier)
    (call_expression (identifier) (argument_list (string)))))

================================================================================
MDS put
================================================================================

mds$put, '\controls::gains', '$', gain_array

--------------------------------------------------------------------------------

(source_file
  (call_expression
    (identifier)
    (argument_list (string) (string) (identifier))))

================================================================================
MDS value with string concatenation
================================================================================

result = mds$value('data[_n-1,' + string(idx) + ']')

--------------------------------------------------------------------------------

(source_file
  (assignment
    (identifier)
    (call_expression
      (identifier)
      (argument_list
        (binary_expression
          (binary_expression
            (string)
            (call_expression (identifier) (argument_list (identifier))))
          (string))))))
```

#### `test/corpus/line_continuation.txt`
```text
================================================================================
Line continuation in expression
================================================================================

result = first_value + $
  second_value

--------------------------------------------------------------------------------

(source_file
  (assignment
    (identifier)
    (binary_expression (identifier) (identifier))))

================================================================================
Line continuation in if/else
================================================================================

if condition eq 1 then $
  value = 0 $
else $
  value = mds$value('test')

--------------------------------------------------------------------------------

(source_file
  (if_statement
    (comparison_expression (identifier) (integer))
    (assignment (identifier) (integer))
    (else_clause
      (assignment (identifier)
        (call_expression (identifier) (argument_list (string)))))))
```

### Integration Tests (Private, imas-codex repo)

Once the grammar is functional, add integration tests in imas-codex that:
1. Parse actual TCV code fetched via SSH (tests live in imas-codex, not tree-sitter-gdl)
2. Verify chunk boundaries align with procedure/function definitions
3. Compare chunk quality vs text-splitter fallback
4. These tests can reference real TCV paths since imas-codex is a private context

## Wheel Publishing Strategy

### Build Infrastructure

Use `cibuildwheel` via GitHub Actions, following the pattern established by `tree-sitter-matlab`:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build-wheels:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Build wheels
        uses: pypa/cibuildwheel@v2.22
        env:
          CIBW_BUILD: "cp310-* cp311-* cp312-* cp313-*"
          CIBW_SKIP: "*-musllinux*"
      - uses: actions/upload-artifact@v4
        with:
          name: wheels-${{ matrix.os }}
          path: wheelhouse/

  publish:
    needs: build-wheels
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # PyPI trusted publisher
    steps:
      - uses: actions/download-artifact@v4
      - uses: pypa/gh-action-pypi-publish@release/v1
        with:
          packages-dir: wheels-*/
```

### pyproject.toml (tree-sitter-gdl)

```toml
[project]
name = "tree-sitter-gdl"
version = "0.1.0"
description = "GDL/IDL tree-sitter grammar with Python bindings"
license = "MIT"
requires-python = ">=3.10"
keywords = ["tree-sitter", "gdl", "idl", "parser", "scientific-computing"]
classifiers = [
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Topic :: Scientific/Engineering",
    "Topic :: Software Development :: Compilers",
]

[build-system]
requires = ["setuptools>=75.0", "tree-sitter>=0.25"]
build-backend = "setuptools.build_meta"
```

### Wheel Platform Coverage

Following `tree-sitter-matlab` pattern, target:
- Linux: x86_64, aarch64 (manylinux)
- macOS: x86_64, arm64 (universal2)
- Windows: x86_64
- Python: 3.10, 3.11, 3.12, 3.13

## Effort Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Setup & Core | 2-3 sessions | `npm install tree-sitter-cli` |
| Phase 2: Control Flow | 2-3 sessions | Phase 1 |
| Phase 3: Expressions | 2-3 sessions | Phase 2 |
| Phase 4: Wheels & CI | 1-2 sessions | Phase 3 (GitHub Actions familiarity) |
| Phase 5: imas-codex Integration | 1 session | Phase 4 (published wheel) |
| **Total** | **8-12 sessions** | |

The bulk of effort is in Phase 2 (control flow) due to IDL's multiple end-keywords (`endif`, `endelse`, `endfor`, `endwhile`, `endcase`, `endrep`) and the inline vs block form duality of `if/then`.

## Resources

### Tree-sitter Documentation
- [Creating Parsers](https://tree-sitter.github.io/tree-sitter/creating-parsers)
- [Grammar DSL Reference](https://tree-sitter.github.io/tree-sitter/creating-parsers#the-grammar-dsl)

### GDL/IDL Language Reference
- [IDL Language Reference](https://www.nv5geospatialsoftware.com/docs/idl_language.html)
- [GDL Source Code](https://github.com/gnudatalanguage/gdl) — primary reference for grammar edge cases
- [GDL Documentation](https://gnudatalanguage.github.io/gdl-documentation/)

### Reference Grammars (study these)
- [tree-sitter-matlab](https://github.com/acristoffers/tree-sitter-matlab) — most similar syntax family, actively maintained, good CI/wheel example
- [tree-sitter-fortran](https://github.com/stadelmanma/tree-sitter-fortran) — scientific language with similar era
- [tree-sitter-bash](https://github.com/tree-sitter/tree-sitter-bash) — context-sensitive keywords similar to IDL

### Wheel Publishing Reference
- [tree-sitter-matlab wheel CI](https://github.com/acristoffers/tree-sitter-matlab/blob/main/.github/workflows/) — GitHub Actions for cibuildwheel
- [tree-sitter-language-pack contributing](https://github.com/Goldziher/tree-sitter-language-pack/blob/main/CONTRIBUTING.md) — how to add a new language

## Decision Points

### 1. Custom Scanner Needed?

IDL's `$` dual-meaning (line continuation vs identifier character) may need a custom scanner in C. However, this can likely be handled in `grammar.js` via:
- Defining identifiers as `/[a-zA-Z_][a-zA-Z0-9_$]*/` (dollar within alphanumeric)
- Defining line continuation as `$` followed by optional whitespace before newline
- Precedence rules to prefer identifier over continuation

**Decision**: Start without custom scanner. Add only if grammar conflicts prove unresolvable.

### 2. Scope: Core vs Full

**Chosen**: Core syntax (Option B) — sufficient for AST-aware chunking. Covers:
- Procedure/function boundaries (critical for chunking quality)
- Control flow blocks (improved chunk coherence)
- All expression types (operators, subscripts, calls)
- Comments and docstrings

**Deferred** (extend later for community value):
- OOP (`obj_new`, `obj->method`, class definitions)
- Compile options (`compile_opt idl2`, `strictarr`)
- Format codes
- SAVE/RESTORE
- Widget programming

### 3. tree-sitter-language-pack Inclusion Strategy

**Phase 1**: Standalone `tree-sitter-gdl` PyPI package, custom parser injection in imas-codex.
**Phase 2**: Submit PR to `tree-sitter-language-pack` for upstream inclusion.
**Phase 3**: Once merged, remove standalone dep from imas-codex, everything routes through standard path.

## Next Steps

1. **Run `tree-sitter init`** in the `tree-sitter-gdl` repo to scaffold the project
2. **Study `tree-sitter-matlab`** grammar.js closely — it's the best reference for similar scientific language syntax
3. **Implement Phase 1** (core expressions, operators, comments)
4. **Validate with corpus tests** using synthetic IDL patterns modeled on TCV observations
5. **Do NOT copy any TCV code into the public repo** — all test cases must be synthetic
