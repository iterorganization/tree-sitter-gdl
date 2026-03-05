# tree-sitter-gdl

GDL/IDL grammar for [tree-sitter](https://tree-sitter.github.io/tree-sitter/).

Parses `.pro` files written in [GDL](https://gnudatalanguage.github.io/) (GNU Data Language) / IDL (Interactive Data Language), used extensively in fusion research, astronomy, and earth science.

## Installation

### Python

```bash
uv add tree-sitter-gdl
```

Or with pip:

```bash
pip install tree-sitter-gdl
```

### Usage

```python
import tree_sitter_gdl
from tree_sitter import Parser

parser = Parser(tree_sitter_gdl.language())

code = b"""
pro analyze_data, shot, verbose=verbose
  mds$open, 'experiment', shot
  signal = mds$value('\\diagnostics::channel_01')
  if n_elements(signal) gt 0 then begin
    result = total(signal) / n_elements(signal)
  endif
  mds$close
end
"""

tree = parser.parse(code)
print(tree.root_node.type)  # "source_file"
```

### Node.js

```bash
npm install tree-sitter-gdl
```

```javascript
const Parser = require("tree-sitter");
const GDL = require("tree-sitter-gdl");

const parser = new Parser();
parser.setLanguage(GDL);

const tree = parser.parse("pro hello\n  print, 'world'\nend");
```

## Supported Syntax

| Feature | Status |
|---------|--------|
| Procedures (`pro`...`end`) | ✅ |
| Functions (`function`...`end`) | ✅ |
| If/then/else (inline and block) | ✅ |
| For/foreach/while/repeat loops | ✅ |
| Case/switch statements | ✅ |
| Function/procedure calls | ✅ |
| Keyword arguments (`name=value`, `/flag`) | ✅ |
| Array subscripting (`arr[i]`, `arr[0:10:2]`) | ✅ |
| Structures (`{tag: value}`) | ✅ |
| Member access (`struct.member`) | ✅ |
| Object methods (`obj->method()`) | ✅ |
| Word operators (`eq`, `ne`, `lt`, `gt`, `and`, `or`) | ✅ |
| System variables (`!pi`, `!error_state`) | ✅ |
| Line continuation (`$`) | ✅ |
| Comments (`;`) | ✅ |
| Ternary (`cond ? a : b`) | ✅ |
| Matrix operators (`#`, `##`) | ✅ |
| Common blocks | ✅ |
| Goto/labels | ✅ |
| Batch include (`@file`) | ✅ |
| MDSplus calls (`mds$open`, `mds$value`) | ✅ |

## Development

### Prerequisites

- Node.js 20+
- tree-sitter CLI (`npm install tree-sitter-cli@0.24.7`)
- Python 3.10+ (for Python bindings)
- C compiler (gcc, clang, or MSVC)

### Build

```bash
# Generate parser from grammar
npx tree-sitter generate

# Run corpus tests
npx tree-sitter test

# Build and install Python bindings (editable)
uv pip install -e .

# Run Python tests
uv run pytest tests/ -v
```

### Testing

```bash
# Run all tree-sitter corpus tests
npx tree-sitter test

# Parse a file
npx tree-sitter parse example.pro

# Run Python tests
uv run pytest tests/ -v
```

### Versioning

Versions are derived automatically from git tags using `setuptools-scm`.
To release a new version:

```bash
# Tag on your fork
git tag v0.1.0
git push origin v0.1.0

# Push tag to upstream to trigger the release workflow
git push upstream v0.1.0
```

The release workflow builds wheels via `cibuildwheel` and publishes to PyPI
using trusted publishing (OIDC).

## License

MIT
