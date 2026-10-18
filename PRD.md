# ZeroTrace - Product Requirements Document
**Objective**: Build a lightweight, zero-latency, high-privacy web tool that extracts, visualizes, and completely sanitizes metadata from images (JPEG, PNG, WebP) and PDF files strictly in the browser.
**Target Audience**: Journalists, whistleblowers, privacy advocates, and general users wanting to remove GPS/EXIF data before sharing.
**Core Features**:
1. Drag-and-drop file ingestion (Images & PDFs).
2. Live metadata inspection (Camera specs, GPS coordinates, Timestamps).
3. 100% Client-side sanitization (Lossless binary chunk stripping for JPEGs, Canvas redraw fallback, PDF dictionary clearing).
4. Batch ZIP export of sanitized files.
5. Zero network requests post-load (PWA / Offline-capable).
