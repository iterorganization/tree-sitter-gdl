{
  "targets": [
    {
      "target_name": "tree_sitter_gdl_binding",
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except"
      ],
      "include_dirs": [
        "src"
      ],
      "sources": [
        "bindings/node/binding.cc",
        "src/parser.c"
      ],
      "conditions": [
        ["OS!='win'", {
          "cflags_c": [
            "-std=c11",
            "-fvisibility=hidden"
          ]
        }, {
          "cflags_c": [
            "/std:c11"
          ]
        }]
      ]
    }
  ]
}
