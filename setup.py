"""Build script for tree-sitter-gdl Python bindings."""

from os.path import join
from setuptools import Extension, setup

setup(
    packages=["tree_sitter_gdl"],
    package_dir={"tree_sitter_gdl": "bindings/python/tree_sitter_gdl"},
    package_data={"tree_sitter_gdl": ["*.pyi", "py.typed"]},
    ext_modules=[
        Extension(
            name="tree_sitter_gdl._binding",
            sources=[
                "bindings/python/tree_sitter_gdl/binding.c",
                "src/parser.c",
            ],
            extra_compile_args=(
                ["-std=c11", "-fvisibility=hidden"]
            ),
            define_macros=[
                ("PY_SSIZE_T_CLEAN", None),
                ("TREE_SITTER_HIDE_SYMBOLS", None),
            ],
            include_dirs=["src"],
        ),
    ],
)
