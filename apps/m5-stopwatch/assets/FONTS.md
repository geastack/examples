# Font assets

The `Montserrat` CSS family uses `Montserrat-Medium.ttf`, matching the body
fonts in the factory firmware's pinned LVGL 9.5.0 dependency. LVGL's built-in
`lv_font_montserrat_*` files are generated from this Medium face.

- Source: [LVGL 9.5.0 Montserrat-Medium.ttf](https://github.com/lvgl/lvgl/blob/v9.5.0/scripts/built_in_font/Montserrat-Medium.ttf)
- Font identity: Montserrat Medium, version 7.200, weight 500.
- Size: 243,180 bytes.
- SHA-256: `421f26b23e2be6b98373d32acd3cb2897b154d4bf0a77d26534ce476e4cbed53`.
- License: [Montserrat-Medium-OFL.txt](Montserrat-Medium-OFL.txt), copied from
  [the same LVGL tag](https://github.com/lvgl/lvgl/blob/v9.5.0/scripts/built_in_font/font_license/Montserrat/OFL.txt).

Embedded builds use the adjacent `factory-*.json` bitmap font sources through
`--gea-font-source` on each `@font-face`. Browser `src` keeps the original TTF.
The JSON carriers reproduce the pinned LVGL glyph coverage, bearings, line
height, baseline, 1/16-pixel advances and kerning adjustments directly. The
native renderer rounds each advance together with its following-pair adjustment
as LVGL does. Existing TTF-based applications keep their original generation.

Run `python3 scripts/import-factory-fonts.py` from this application to regenerate
all four carriers from the pinned factory checkout and its LVGL v9.5.0 dependency.
Each face records source path, SHA-256, original bitmap depth and conversion
provenance. The factory's enabled missing-glyph placeholder is retained as an
explicit fallback bitmap. The carriers have no LVGL runtime dependency and are
excluded from runtime asset bundling; they are generator inputs.

Exact glyph bytes and metrics do not by themselves prove whole-screen pixel
identity: layout, transformed sampling and framebuffer blending remain separate
renderer behavior requiring paired device validation.

The other CSS aliases remain `Maple` → `MapleMono-Medium.ttf`,
`Commissioner` → `Commissioner-Medium.ttf`, and `MontserratBold` →
`Montserrat-SemiBold.ttf`. `Montserrat-Regular.ttf` remains in the assets
directory but is no longer the body face.
