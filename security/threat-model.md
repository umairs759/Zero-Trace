# STRIDE Analysis
- **Spoofing**: N/A (No auth).
- **Tampering**: Malicious EXIF payloads targeting `exifr` parser. Mitigation: Strict try-catch and output escaping in UI.
- **Repudiation**: N/A.
- **Information Disclosure**: Memory leaks retaining original files. Mitigation: Strict blob revocation.
- **Denial of Service**: Zip bomb / massive files freezing browser. Mitigation: Max file size limit (50MB) and Web Worker utilization if necessary.
- **Elevation of Privilege**: N/A.
