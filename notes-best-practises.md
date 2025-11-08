Notes & best practices

Deterministic matchers first, LLM later: keep match() fast & rule-based (keywords, regex, tiny classifiers). If you need semantic routing, call your vector index in match() via ctx.services.

Guards for safety/compliance: put access checks, PII rules, and policy in guard(). Throwing here blocks execution cleanly.

Side-effects via ctx.services: inject IO (db, S3, LLM client) so skills remain pure/testable.

Artifacts: return binary/string blobs (e.g., .md, .pptx) in artifacts for download/export.

Versioning: bump skill.version and keep multiple versions registered if you need gradual migration.

Testing: unit test each skill’s match, guard, and execute with table-driven cases.