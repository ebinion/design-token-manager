# DTCG Format Cheat Sheet

Quick reference for the **Design Tokens Format Module**, the storage format this project is built on (see [CLAUDE.md](../../CLAUDE.md) — "Storage format is W3C DTCG JSON").

- **Spec version:** `2025.10` — the **first stable release** (published 2025-10-28). Canonical: <https://www.designtokens.org/tr/2025.10/>
- **Status:** A DTCG Community Group report, _not_ a W3C Standard / not on the W3C Standards Track.
- **Draft caveat:** the "drafts" URL (`/tr/drafts/`) is ahead of stable and marked "do not implement from." Build against `2025.10`.
- **File:** extension `.tokens` or `.tokens.json`; media type `application/design-tokens+json`.

> Our internal model should abstract this format so spec churn doesn't ripple through the codebase. Treat the `$`-property shapes below as the wire format, not the in-memory model.

---

## 1. Token vs. Group

A JSON object is a **token** if it has `$value`, otherwise it's a **group**. An object can never be both.

```jsonc
{
  "color": {
    // group (no $value)
    "$type": "color", // default type for descendants
    "red": {
      // token (has $value)
      "$value": {
        "colorSpace": "srgb",
        "components": [0.87, 0, 0],
        "hex": "#dd0000",
      },
    },
  },
}
```

The object **key** is the token/group name.

### Reserved `$` properties

| Property       | On             | Meaning                                                                                           |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `$value`       | token          | The value. **Required.** Shape depends on `$type`.                                                |
| `$type`        | token or group | Type category. Inherited if omitted (see §2).                                                     |
| `$description` | token or group | Plain-text doc / IDE tooltip.                                                                     |
| `$extensions`  | token or group | Vendor data, reverse-domain keys (`io.couplefi.foo`). Tools **must preserve** unknown extensions. |
| `$deprecated`  | token or group | `true` \| `false` (override group default) \| string explanation.                                 |

### Name rules

Token/group names must **not** start with `$` and must **not** contain `{`, `}`, or `.` (all reserved for references).

---

## 2. `$type` inheritance

Resolution order, highest precedence first:

1. The token's own `$type`.
2. Nearest ancestor **group**'s `$type` (walk up the tree).
3. The `$type` of the token an alias resolves to.
4. Otherwise → **invalid** (must report).

→ Our parser needs to compute an _effective type_ per token, not just read `$type` locally. Cycle/validity checks live here too.

---

## 3. References / aliases

### Curly-brace (token-level) — the common case

`{group.subgroup.token}` resolves to the **entire `$value`** of the target. Target must be a token (have `$value`), not a group.

```jsonc
"semantic": { "primary": { "$type": "color", "$value": "{color.red}" } }
```

**Chained** aliases are allowed — follow until a literal value: `{ui.link}` → `{semantic.brand}` → `{base.primary}` → literal.

### JSON Pointer (property-level) — `$ref` / RFC 6901

For targeting _inside_ a composite value (a single component, one shadow field, etc.):

```jsonc
"components": [
  { "$ref": "#/color/red/$value/components/0" },
  { "$ref": "#/color/red/$value/components/1" },
  0.7
]
```

### Cycle detection is mandatory

`a → b → c → a` makes **every** token in the cycle invalid. This is a first-class requirement for our reference engine (CLAUDE.md: "references… requires cycle detection").

---

## 4. Color (the module that matters most here)

CLAUDE.md mandates OKLCH / Display-P3 authoring with auto hex/sRGB fallbacks — all directly supported.

```jsonc
{
  "$type": "color",
  "$value": {
    "colorSpace": "oklch", // required
    "components": [0.628, 0.225, 29.2], // required: array of number | "none"
    "alpha": 1, // optional, 0–1, default 1
    "hex": "#dd0000", // optional sRGB fallback, 6-digit "#RRGGBB"
  },
}
```

- **`components`** — each entry is a number **or** the string `"none"` (missing/undefined channel; matters for interpolation, e.g. hue `"none"` ≠ `0`).
- **`alpha`** — `0`–`1`, default `1`.
- **`hex`** — optional fallback in 6-digit CSS hex. Useful to disambiguate when `alpha ≠ 1`. This is the "auto-generated, override-able hex/sRGB fallback" from our spec.

### Supported `colorSpace` values

| `colorSpace`   | Components | Ranges                              |
| -------------- | ---------- | ----------------------------------- |
| `srgb`         | [R, G, B]  | each 0–1                            |
| `srgb-linear`  | [R, G, B]  | each 0–1                            |
| `display-p3`   | [R, G, B]  | each 0–1                            |
| `a98-rgb`      | [R, G, B]  | each 0–1                            |
| `prophoto-rgb` | [R, G, B]  | each 0–1                            |
| `rec2020`      | [R, G, B]  | each 0–1                            |
| `hsl`          | [H, S, L]  | H 0–360, S 0–100, L 0–100           |
| `hwb`          | [H, W, B]  | H 0–360, W 0–100, B 0–100           |
| `lab`          | [L, a, b]  | L 0–100; a,b unbounded (±160 typ.)  |
| `lch`          | [L, C, H]  | L 0–100; C 0–∞ (≤230 typ.); H 0–360 |
| `oklab`        | [L, a, b]  | L 0–1; a,b unbounded (±0.5 typ.)    |
| `oklch`        | [L, C, H]  | L 0–1; C 0–∞ (≤0.5 typ.); H 0–360   |
| `xyz-d65`      | [X, Y, Z]  | each 0–1                            |
| `xyz-d50`      | [X, Y, Z]  | each 0–1                            |

→ Author in `oklch` / `display-p3`; generate `hex` (sRGB) on write for round-trip safety.

---

## 5. Other primitive types

| `$type`       | `$value` shape                                        | Notes                                                                                          |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `dimension`   | `{ "value": 16, "unit": "px" }`                       | `unit` is `"px"` or `"rem"` only; **required even for 0**.                                     |
| `fontFamily`  | `"Helvetica"` or `["Helvetica","Arial","sans-serif"]` | String or ordered fallback array.                                                              |
| `fontWeight`  | `400` or `"bold"`                                     | Number 1–1000, or named alias (`thin`→100 … `extra-black`→950; `normal`/`regular`/`book`→400). |
| `duration`    | `{ "value": 200, "unit": "ms" }`                      | `unit` is `"ms"` or `"s"`.                                                                     |
| `cubicBezier` | `[x1, y1, x2, y2]`                                    | x's clamped 0–1; y's any real number.                                                          |
| `number`      | `1.5`                                                 | Unitless (line-height, gradient stop, etc.).                                                   |

---

## 6. Composite types

Every sub-field below may be a literal value **or** an alias/`$ref` to a token of the matching type.

### `strokeStyle`

String keyword: `solid | dashed | dotted | double | groove | ridge | outset | inset`
or object:

```jsonc
{
  "dashArray": [
    { "value": 0.5, "unit": "rem" },
    { "value": 0.25, "unit": "rem" },
  ],
  "lineCap": "round",
} // round|butt|square
```

### `border`

```jsonc
{ "color": {…color}, "width": {…dimension}, "style": {…strokeStyle} }
```

### `transition`

```jsonc
{ "duration": {…duration}, "delay": {…duration}, "timingFunction": [x1,y1,x2,y2] }
```

### `shadow`

Single object **or** array (layered, outermost-last). Array refs are not flattened.

```jsonc
{ "color": {…color}, "offsetX": {…dim}, "offsetY": {…dim}, "blur": {…dim}, "spread": {…dim} }
```

### `gradient`

Array of ≥2 stops; positions are 0–100 (%), need not be pre-sorted.

```jsonc
[ { "color": {…color}, "position": 0 }, { "color": {…color}, "position": 100 } ]
```

### `typography`

```jsonc
{
  "fontFamily": {…fontFamily},   // required
  "fontSize":   {…dimension},    // required
  "fontWeight": {…fontWeight},   // required
  "lineHeight": 1.5,             // required, unitless number
  "letterSpacing": {…dimension}, // optional
  "textTransform": "uppercase",  // optional: none|uppercase|lowercase|capitalize
  "textDecoration": "underline"  // optional: none|underline|overline|line-through
}
```

---

## 7. Group features (stable in 2025.10)

### `$extends` — group inheritance

```jsonc
{
  "button": { "$type": "color", "background": { "$value": "{color.blue}" } },
  "button-primary": {
    "$extends": "{button}",
    "background": { "$value": "{color.red}" }, // overrides; other tokens inherited
  },
}
```

Deep-merge: inherited tokens kept unless a local token at the same path replaces them; new locals added. **Circular `$extends` prohibited.**

### `$root` — a token _at_ a group's path

Reserved child name `$root` lets a group also carry its own token value; reference it as `{color.accent.$root}`.

---

## 8. Theming / modes — ⚠️ not built in

The stable spec has **no** `$modes`/theming syntax. Light/dark, brand, and a11y variants are expected to be handled **outside** the format — typically **separate token files merged at build time**, or vendor data under `$extensions`.

This is load-bearing for our project: CLAUDE.md wants modes "managed side-by-side without duplication," but DTCG gives us no native mechanism. **Design decision required** — likely a layered-file or `$extensions` convention we own and abstract behind the internal model. Flag this in the Phase-1 PRD.

---

## 9. Implementation checklist for our parser/model

- [ ] Distinguish token vs. group by `$value` presence; reject objects that are both.
- [ ] Compute **effective `$type`** via inheritance chain (§2), incl. alias-derived types.
- [ ] Resolve both `{dotted.path}` and `$ref` JSON-Pointer references; follow chains.
- [ ] **Cycle detection** for aliases _and_ `$extends`.
- [ ] Preserve unknown `$extensions` on round-trip (clean, minimal diffs — CLAUDE.md).
- [ ] Color: store canonical `oklch`/`display-p3`; auto-write `hex` sRGB fallback; handle `"none"` components.
- [ ] Validate `dimension`/`duration` units; require `unit` even at 0.
- [ ] Own a theming/modes convention since the spec doesn't define one (§8).

---

## Sources

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/)
- [Design Tokens Color Module 2025.10](https://www.designtokens.org/tr/2025.10/color/)
- [First stable version announcement (2025-10-28)](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [DTCG community group](https://www.w3.org/community/design-tokens/) · [Style Dictionary DTCG notes](https://styledictionary.com/info/dtcg/)
