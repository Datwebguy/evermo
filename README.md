# Evermo

**Rules that last forever.** Evermo turns any app rule into a permanent TapeOut circuit on X Layer that anyone can check
and nobody can change.

1. **Describe** a rule in a simple form.
2. **Build** the smallest NAND circuit, with every input tested.
3. **Tape out** on the Evermo processor on X Layer.
4. **Use** it from a contract with `eval(circuitId, inputs)`.
5. **Verify** it on a public DeWEB page, with no wallet.

Full design: `docs/DESIGN.md`. Submission answers: `docs/SUBMISSION.md`.

## Status

Idea stage for X Layer TapeOut Accelerate (deadline 7 December 2026, 23:59 UTC). The build starts on the go-ahead.

The code now in `contracts/`, `frontend/`, `test/` and `scripts/` is an early prototype of an earlier idea (a yield vault,
archived in `docs/archive/vault/`) and will be removed when the build starts. The circuit generator in `circuit/` is
reused for Evermo's rule engine.

## Layout

| Path | Contents |
|------|----------|
| `circuit/` | Rule definition, NAND synthesizer, generated netlist, exhaustive tests (to become the rule engine) |
| `docs/` | `DESIGN.md`, `SUBMISSION.md`, `POST.md`, `RESOURCES.md`; `archive/` for the earlier vault idea |
| `contracts/`, `frontend/`, `test/`, `scripts/` | Prototype of the earlier vault idea |

## Commands

```sh
npm install
npm run circuit:build
npm run circuit:test
npm test
```

MIT licensed.
