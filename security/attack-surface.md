# Attack Surface Inventory
- **Inputs**: File Dropzone (accepts .jpg, .jpeg, .png, .webp, .pdf).
- **DOM Rendering**: Rendering EXIF strings (e.g., Camera Model) into the DOM. Risk of DOM-based XSS. Mitigation: Use `textContent` instead of `innerHTML` exclusively.
