# Interleaf Level Corpus V2 — Runtime NOTICE

Package: `interleaf-level-corpus-v2.0.0-frozen`

These files are byte-identical copies of the frozen offline package.
Do not rewrite whitelist lemma lists, `form_index.json`, or BY-SA sidecars in place.

## Runtime role

- `level1_basic_words.json` … `level5_basic_words.json` — Base Whitelist lemmas only (no definitions or glosses)
- `form_index.json` — deterministic surface → canonical morphology map
- `phrase_inventory.json` — multi-word inventory (shipped; not required for single-token level filtering)
- `provenance_license_manifest.json` — source and license provenance
- `bysa_derived/` — CC BY-SA 4.0 separable materials (keep separate from Interleaf-only licensing)

## Required attribution

- CEFR-J Wordlist Version 1.6 — Yukio Tono / Tokyo University of Foreign Studies
- NGSL 1.2 — Browne, Culligan, Phillips (CC BY-SA 4.0) — form expansions
- wordfreq 3.1.1 — Robyn Speer; frequency data CC BY-SA 4.0; credit SUBTLEX authors
- Names filter CC0 — popular-names-by-country-dataset v1.2 (build-time only)

## ShareAlike separation

Files under `bysa_derived/` are CC BY-SA 4.0 derived. Keep them separable.
See `bysa_derived/README.json` and `provenance_license_manifest.json`.

L5 is provisional Advanced Fiction (L5-Balanced), not a formal C1/C2/IELTS band.
