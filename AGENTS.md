# AI Agent Rules — Soostori Mobile

> **CRITICAL:** These rules are STRICTLY ENFORCED. Read `.ai/coding-rules.md` before any work.

## Before Modifying Code

1. Read `.ai/coding-rules.md` — enforcement rules, non-negotiable
2. Read `.ai/project-manifest.md` — system overview
3. Read `.ai/review-checklist.md` — must complete every item
4. Inspect existing implementation
5. Do NOT rewrite working systems
6. Check blast radius before making changes

## When Adding Features

Required updates — every time, without exception:

- [ ] `CHANGELOG.md` — update with files changed and description
- [ ] `.ai/review-checklist.md` — complete every item

## Strict Rules

### NEVER do any of these:

- Create `helpers.ts`, `common.ts`, `misc.ts`, `utils.ts`, `tools.ts` — **forbidden**
- Put business logic in React Native components — **forbidden**
- Put DB calls directly in components — use `src/services/` only
- Exceed **150 lines per file** — split immediately
- Add dependencies without explicit approval
- Skip `CHANGELOG.md` update — it is **mandatory**
- Use `any` type without documented exception
- Use native `Alert.alert()` for non-critical UX — use toast/snackbar
- Comment out code instead of deleting — **delete it**
- Add commented-out code as "future reference" — **never**

- **No sparkle icon (✨ or `<Sparkles>`) anywhere in UI** — canonical AI tell, strictly forbidden
- **No AI-tell icons** (stars ★, magic wand, robot, brain, lightning bolt) — use Lucide or no icon

### Always do these:

- Follow `[domain]-[action]-type.ts` naming
- Keep UI in components, logic in `src/services/` or `src/lib/`
- Run `npx tsc --noEmit` before committing
- Verify file line counts: `wc -l <file>` — must be ≤ 150

## Commit Format

```
feat(domain): description
fix(domain): description
docs(domain): description
refactor(domain): description
```

## Review Checklist

Run `.ai/review-checklist.md` before declaring done. Do not skip items.