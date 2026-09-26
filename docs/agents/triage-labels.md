# Triage labels

Local issue files use these status values: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `resolved`, and `wontfix`.

Use `Status: ready-for-agent` for a fully specified issue ready for implementation.
Use `Status: resolved` when the ticket's acceptance checks pass and code review has no blocking findings. A merge is not required: record the implementation PR and whether it is still open. If review finds missing work, return the ticket to `ready-for-agent`.
