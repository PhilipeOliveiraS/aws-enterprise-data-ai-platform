---
inclusion: fileMatch
fileMatchPattern: 'docs/adr/**/*.md'
---

# ADR Authoring Standards

## Mandatory YAML frontmatter
Every Architecture Decision Record (ADR) under `docs/adr/` MUST begin with the
following YAML frontmatter block at the very top of the file (before the `#`
Markdown title). Adjust `date` and `tags` to the document's context; keep
`author` and `role` unless a different author is explicitly given.

```yaml
---
author: Philipe Oliveira
role: Cloud Platform Engineer & AI Specialist
date: 2026-08-28
status: accepted
tags: [relevant, tags, here]
---
```

## Rules
- The frontmatter block (delimited by `---`) is the first content in the file.
- The Markdown H1 title (`# ADR NNNN: ...`) comes immediately after the closing `---`.
- Exactly one H1 title per ADR — no duplicate titles.
- `date` uses `YYYY-MM-DD`. `status` is one of: `proposed`, `accepted`, `superseded`, `deprecated`.
- `tags` is a YAML flow list of context-relevant keywords.
- ADR filenames follow `NNNN-kebab-title.md` with a unique, incrementing number.
