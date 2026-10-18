# Security Verification
- [ ] CSP (Content Security Policy) header defined in `index.html` `meta` tag to prevent external connections (`default-src 'self'`).
- [ ] No `innerHTML` usage found in codebase.
- [ ] `URL.revokeObjectURL()` called for every generated file blob.
- [ ] Maximum file size limit enforced (e.g., 50MB per file).
