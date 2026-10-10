#!/usr/bin/env python3
"""Account named font/artwork payload symbols in a retained firmware ELF."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess


def analyze(elf, nm, framework):
    result = subprocess.run([str(nm), '-S', '--defined-only', str(elf)],
                            check=True, capture_output=True, text=True)
    groups = {}
    for line in result.stdout.splitlines():
        match = re.fullmatch(r'([0-9a-fA-F]+) ([0-9a-fA-F]+) (\S) (.+)', line)
        if not match:
            continue
        address, size, kind, name = match.groups()
        address, size = int(address, 16), int(size, 16)
        if not size or not (0x3C000000 <= address < 0x3E000000):
            continue
        group = None
        if framework == 'gea':
            if name.startswith('gea_asset_'):
                group = 'raw_ttf_assets' if name.endswith('_ttf') else (
                    'png_assets' if name.endswith('_png') else (
                        'wav_assets' if name.endswith('_wav') else 'other_asset_payloads'))
            elif 'gea_font_atlas_' in name:
                group = 'baked_font_atlases'
            elif 'font_glyphs_' in name:
                group = 'baked_font_glyph_metadata'
            elif 'font_kerning_' in name:
                group = 'baked_font_kerning_metadata'
            elif 'font_data_' in name:
                group = 'baked_font_descriptors'
        elif name == 'glyph_bitmap':
            group = 'lvgl_font_bitmaps'
        elif name == 'glyph_dsc':
            group = 'lvgl_font_glyph_metadata'
        elif name in ('kern_left_class_mapping', 'kern_right_class_mapping', 'kern_class_values'):
            group = 'lvgl_font_kerning_metadata'
        elif name.endswith('_map'):
            group = 'named_image_maps'
        if group:
            groups.setdefault(group, []).append({
                'symbol': name, 'address': address, 'bytes': size, 'kind': kind})
    return {
        'framework': framework,
        'elf': str(elf.resolve()),
        'elfSha256': hashlib.sha256(elf.read_bytes()).hexdigest(),
        'method': 'Defined ELF symbols in mapped DROM range; explicit name categories only.',
        'limits': 'Not total renderer cost. Categories exclude code, unnamed data, alignment and metadata not matching these names. Symbols may share names; each address is counted separately.',
        'groups': {name: {'bytes': sum(row['bytes'] for row in rows),
                          'symbolCount': len(rows), 'symbols': rows}
                   for name, rows in sorted(groups.items())},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--elf', type=Path, required=True)
    parser.add_argument('--nm', type=Path, required=True)
    parser.add_argument('--framework', choices=['factory', 'gea'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.write_text(json.dumps(analyze(args.elf, args.nm, args.framework), indent=2) + '\n')


if __name__ == '__main__':
    main()
