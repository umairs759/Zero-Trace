# Coding Conventions & Rules
- **Zero Telemetry**: Under no circumstances should `fetch` or `XMLHttpRequest` be used to send data out.
- **Memory Management**: Always call `URL.revokeObjectURL()` after a download completes or an image preview is destroyed to prevent browser memory leaks.
- **Error Handling**: Wrap all binary parsing in `try...catch`. Invalid/corrupt files must show a clean toast notification, not crash the main thread.
- **Atomic Commits**: Ensure code changes correspond exactly to the current active task in `TASKS.md`.
- **Vanilla JS Standard**: Use ES Modules (`import`/`export`). No inline scripts. Keep DOM manipulation modular in `src/modules/uiRenderer.js`.
