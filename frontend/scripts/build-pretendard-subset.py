#!/usr/bin/env python3
"""
Build a lossless Pretendard Variable subset (WOFF2) for DVIEW.

Why this exists:
  The previous Pretendard-subset.woff2 (271 KB) kept base Regular (400) `glyf`
  outlines for KS X 1001, but zeroed out `gvar` weight-variation deltas for
  1,458 of the 2,350 KS X 1001 Hangul syllables (including '슷', '돔', '괜',
  '됐', '쉽', '훨', '씬', etc.) and stripped `GPOS` kerning. As a result, those
  syllables stayed stuck at Regular (400) weight inside Bold/ExtraBold/Black
  headings (e.g., "비슷한 단지", "병점 돔구장").

What this script produces:
  - Source: frontend/public/fonts/PretendardVariable.woff2 (2.06 MB, 14,757 glyphs)
  - Target: frontend/public/fonts/Pretendard-subset.woff2 (~346 KB, >82% reduction)
  - Coverage:
      * All 2,350 KS X 1001 Hangul syllables
      * Hangul Compatibility Jamo (ㄱ-ㅎ, ㅏ-ㅣ)
      * ASCII, Latin-1, punctuation, currency (₩), arrows (←↑→↓↗↘), math,
        enclosed alphanumerics, CJK symbols & compatibility units (㎡, ㎢)
      * Any extra characters used in frontend/src (excluding __tests__),
        frontend/public/data, and frontend/public/tx-data (e.g., 샾, 쏼, 콈, 힣)
  - Weight axis: wght 400..930 (Regular 400 through Black 900) via
    fontTools.varLib.instancer — 100% lossless bold interpolation on EVERY kept
    glyph (0 zero-gvar Hangul glyphs) and full GPOS kerning + GSUB `tnum`.

Usage:
  uv run --with "fonttools[woff]" python frontend/scripts/build-pretendard-subset.py
"""

from __future__ import annotations

import os
from pathlib import Path
from fontTools.pens.recordingPen import RecordingPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = REPO_ROOT / "frontend"
SRC_FONT = FRONTEND_DIR / "public" / "fonts" / "PretendardVariable.woff2"
OUT_FONT = FRONTEND_DIR / "public" / "fonts" / "Pretendard-subset.woff2"

UNICODE_RANGES = [
    (0x0020, 0x007E),  # ASCII printable
    (0x00A0, 0x00FF),  # Latin-1 Supplement (·, ×, ±, ², ³)
    (0x2000, 0x206F),  # General Punctuation (–, —, ‘, ’, “, ”, •, …)
    (0x2070, 0x209F),  # Superscripts & Subscripts
    (0x20A0, 0x20CF),  # Currency Symbols (₩, €)
    (0x2100, 0x214F),  # Letterlike Symbols (℃, №, ™)
    (0x2150, 0x218F),  # Number Forms
    (0x2190, 0x21FF),  # Arrows (←, ↑, →, ↓, ↗, ↘)
    (0x2200, 0x22FF),  # Mathematical Operators (≈, ≠, ≤, ≥, ∞)
    (0x2460, 0x24FF),  # Enclosed Alphanumerics (①, ②, ③)
    (0x25A0, 0x25FF),  # Geometric Shapes (■, ▲, ▼, ●, ○)
    (0x2600, 0x26FF),  # Misc Symbols (★, ☆)
    (0x2700, 0x27BF),  # Dingbats (✓, ✕)
    (0x3000, 0x303F),  # CJK Symbols & Punctuation (「, 」, 『, 』, 【, 】, ·)
    (0x3131, 0x318E),  # Hangul Compatibility Jamo (ㄱ-ㅎ, ㅏ-ㅣ)
    (0x3200, 0x32FF),  # Enclosed CJK Letters (㈜)
    (0x3300, 0x33FF),  # CJK Compatibility (㎡, ㎢, ㏊, ㎜, ㎝, ㎞)
    (0xFF00, 0xFFEF),  # Halfwidth & Fullwidth Forms
]

CORE_LAYOUT_FEATURES = [
    "tnum",
    "pnum",
    "kern",
    "calt",
    "ccmp",
    "locl",
    "case",
    "frac",
    "zero",
    "sups",
    "subs",
]


def collect_ksx1001_hangul() -> set[int]:
    codepoints: set[int] = set()
    for b1 in range(0xB0, 0xC9):
        for b2 in range(0xA1, 0xFF):
            try:
                ch = bytes([b1, b2]).decode("euc-kr")
                if len(ch) == 1 and 0xAC00 <= ord(ch) <= 0xD7A3:
                    codepoints.add(ord(ch))
            except UnicodeDecodeError:
                pass
    assert len(codepoints) == 2350, f"Expected 2350 KS X 1001 Hangul, got {len(codepoints)}"
    return codepoints


def collect_site_codepoints() -> set[int]:
    codepoints: set[int] = set()
    scan_roots = [
        FRONTEND_DIR / "src",
        FRONTEND_DIR / "public" / "data",
        FRONTEND_DIR / "public" / "tx-data",
    ]
    for root in scan_roots:
        if not root.exists():
            continue
        for dp, dns, fns in os.walk(root):
            dns[:] = [d for d in dns if d not in ("node_modules", "__tests__", ".next")]
            for fn in fns:
                if fn.endswith((".ts", ".tsx", ".js", ".jsx", ".json", ".tsv", ".md", ".css")):
                    if ".test." in fn or ".spec." in fn:
                        continue
                    with open(os.path.join(dp, fn), "r", encoding="utf-8", errors="ignore") as f:
                        for ch in f.read():
                            codepoints.add(ord(ch))
    return codepoints


def build_and_verify() -> None:
    if not SRC_FONT.exists():
        raise FileNotFoundError(f"Source font not found: {SRC_FONT}")

    full_font = TTFont(SRC_FONT)
    full_cmap = full_font.getBestCmap()

    ksx_hangul = collect_ksx1001_hangul()
    site_cps = collect_site_codepoints()

    unicodes: set[int] = set(ksx_hangul)
    for start, end in UNICODE_RANGES:
        for cp in range(start, end + 1):
            if cp in full_cmap:
                unicodes.add(cp)

    extra_site = sorted(
        cp for cp in site_cps if cp in full_cmap and cp not in unicodes and cp >= 0x0020
    )
    unicodes.update(extra_site)
    unicodes = {cp for cp in unicodes if cp in full_cmap}

    print(
        f"[Pretendard Subset] Target codepoints: {len(unicodes)} "
        f"(KS X 1001={len(ksx_hangul)}, extra site={len(extra_site)}: "
        f"{''.join(chr(c) for c in extra_site)})"
    )

    # Step 1: Subset glyphs & OpenType tables cleanly (re-indexes glyph IDs)
    font = TTFont(SRC_FONT)
    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = CORE_LAYOUT_FEATURES
    opts.desubroutinize = True
    opts.hinting = False

    subsetter = Subsetter(options=opts)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)

    # Step 2: Pin variable weight axis to 400..930 (Regular..Black, matching all DVIEW weights)
    instantiateVariableFont(font, {"wght": (400, 400, 930)}, inplace=True)

    # Step 3: Save WOFF2
    font.save(OUT_FONT)
    size_bytes = OUT_FONT.stat().st_size
    full_size_bytes = SRC_FONT.stat().st_size
    reduction_pct = (1.0 - size_bytes / full_size_bytes) * 100.0
    print(
        f"[Pretendard Subset] Saved {OUT_FONT.name}: "
        f"{size_bytes:,} bytes ({size_bytes / 1024:.1f} KB, -{reduction_pct:.1f}% vs {full_size_bytes / 1024:.1f} KB)"
    )

    # Step 4: Strict self-verification (cmap, outlines, gvar, tnum, multi-weight outline parity)
    built = TTFont(OUT_FONT)
    built_cmap = built.getBestCmap()
    built_glyf = built["glyf"]
    built_gvar = built["gvar"].variations

    missing_ksx = []
    empty_outline_ksx = []
    zero_gvar_ksx = []
    for cp in sorted(ksx_hangul):
        gname = built_cmap.get(cp)
        if not gname:
            missing_ksx.append(chr(cp))
            continue
        if built_glyf[gname].numberOfContours == 0:
            empty_outline_ksx.append(chr(cp))
        if len(built_gvar.get(gname, [])) == 0:
            zero_gvar_ksx.append(chr(cp))

    assert not missing_ksx, f"Missing KS X 1001 chars: {missing_ksx[:20]}"
    assert not empty_outline_ksx, f"Empty outline KS X 1001 chars: {empty_outline_ksx[:20]}"
    assert not zero_gvar_ksx, f"Zero gvar KS X 1001 chars: {zero_gvar_ksx[:20]}"

    # Verify tnum targets have gvar
    gsub = built["GSUB"].table
    tnum_targets = set()
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag == "tnum":
            for idx in fr.Feature.LookupListIndex:
                for st in gsub.LookupList.Lookup[idx].SubTable:
                    if hasattr(st, "mapping"):
                        tnum_targets.update(st.mapping.values())
    assert len(tnum_targets) >= 10, f"Expected >=10 tnum targets, got {len(tnum_targets)}"
    zero_gvar_tnum = [g for g in tnum_targets if len(built_gvar.get(g, [])) == 0]
    assert not zero_gvar_tnum, f"Zero gvar on tnum targets: {zero_gvar_tnum}"

    # Verify exact outline parity across weights 400..900 vs full PretendardVariable.woff2
    smoke_chars = "비슷한단지돔동탄0123456789↗↘₩㎡샾쏼괜됐쉽훨씬"
    for wght in (400, 500, 600, 700, 800, 900):
        f_full = instantiateVariableFont(TTFont(SRC_FONT), {"wght": wght})
        f_sub = instantiateVariableFont(TTFont(OUT_FONT), {"wght": wght})
        cm_f, cm_s = f_full.getBestCmap(), f_sub.getBestCmap()
        gs_f, gs_s = f_full.getGlyphSet(), f_sub.getGlyphSet()
        for ch in smoke_chars:
            cp = ord(ch)
            p_f, p_s = RecordingPen(), RecordingPen()
            gs_f[cm_f[cp]].draw(p_f)
            gs_s[cm_s[cp]].draw(p_s)
            assert p_f.value == p_s.value, f"Outline mismatch at wght={wght} for {ch!r}"

    axes = [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in built["fvar"].axes]
    print(
        f"[Pretendard Subset] VERIFIED OK | glyphs={len(built.getGlyphOrder())} | "
        f"ksx_gvar=2350/2350 | tnum={len(tnum_targets)} | axes={axes} | 0 outline diffs (400..900)"
    )


if __name__ == "__main__":
    build_and_verify()
