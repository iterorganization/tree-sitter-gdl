#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" TSLanguage *tree_sitter_gdl();

// "tree-sitter", "currentParser" heuristic
static napi_value LanguageGDL(napi_env env, napi_callback_info info) {
    napi_value result;
    napi_status status =
        napi_create_external(env, tree_sitter_gdl(), NULL, NULL, &result);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to create external for GDL language");
        return NULL;
    }
    return result;
}

static napi_value Init(napi_env env, napi_value exports) {
    napi_value language_fn;
    napi_create_function(env, "language", NAPI_AUTO_LENGTH, LanguageGDL, NULL,
                         &language_fn);
    napi_set_named_property(env, exports, "language", language_fn);

    napi_value name;
    napi_create_string_utf8(env, "gdl", NAPI_AUTO_LENGTH, &name);
    napi_set_named_property(env, exports, "name", name);

    return exports;
}

NAPI_MODULE(tree_sitter_gdl_binding, Init)
