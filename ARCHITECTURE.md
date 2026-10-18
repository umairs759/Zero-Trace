# Architecture & Tech Stack
- **Runtime**: Vanilla JS (ES6+) + Vite for bundling.
- **Styling**: Tailwind CSS via PostCSS.
- **Core Processing Modules**:
  - `exifr`: Fast EXIF/GPS/XMP extraction.
  - `pdf-lib`: PDF metadata manipulation.
  - `jszip`: Batch archiving.
  - Native Web APIs: `FileReader`, `OffscreenCanvas`, `Blob`, `URL.createObjectURL()`.
- **Data Flow**:
  1. User drops file -> `FileReader.readAsArrayBuffer()`.
  2. Buffer passed to `metadataReader.js` -> Renders UI cards.
  3. User clicks Clean -> `stripper.js` processes buffer -> returns new Blob.
  4. Blob converted to Object URL for download. Memory revoked post-download.
