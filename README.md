# PDF Unlocker

A privacy-focused web tool to remove password protection from PDF files. All processing happens locally in your browser—your files never leave your device.

## Features

- 🔓 **Native PDF Decryption** – Preserves original text, fonts, and document structure
- 🔒 **100% Client-Side** – Files are processed entirely in your browser using WebAssembly
- ⚡ **Fast & Lightweight** – No server uploads, no waiting
- 📱 **Responsive Design** – Works on desktop and mobile

## How It Works

1. Upload a password-protected PDF
2. Enter the document password
3. Download the unlocked PDF

### Architecture

PDF decryption is computationally intensive and would freeze the browser if run on the main thread. To solve this, the app uses a **Web Worker architecture**:

```
Main Thread (UI)          Web Worker (Background)
     │                           │
     │── Upload PDF + Password ──▶│
     │                           │── Load MuPDF WASM
     │                           │── Authenticate password
     │                           │── Decrypt & rebuild PDF
     │◀── Unlocked PDF bytes ────│
     │
     ▼
  Download
```

- **[MuPDF](https://mupdf.com/)** is compiled to WebAssembly, enabling native-quality PDF processing in the browser
- The **Web Worker** runs MuPDF in a separate thread, keeping the UI responsive during decryption
- A custom **React hook** (`useMupdfWorker`) manages worker lifecycle and message passing
- Files are transferred as `ArrayBuffer` for zero-copy performance

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **MuPDF.js** for native PDF decryption via WebAssembly
- **shadcn/ui** components

## Development

```bash
npm install
npm run dev
npm run build
```

## Self-Hosting with Docker

The app is published as a Docker image on every push to `main`. Pull the latest image from the GitHub Container Registry:

```bash
docker pull ghcr.io/windmark/pdfunlocker:latest
```

Or pin to a specific commit:

```bash
docker pull ghcr.io/windmark/pdfunlocker:<commit-sha>
```

Run it:

```bash
docker run -d -p 8080:80 ghcr.io/windmark/pdfunlocker:latest
```

The app will be available at `http://localhost:8080`.

You can also build locally:

```bash
docker build -t pdfunlocker .
docker run -d -p 8080:80 pdfunlocker
```

> **Latest image:** [`ghcr.io/windmark/pdfunlocker:latest`](https://github.com/windmark/pdfunlocker/pkgs/container/pdfunlocker)

---

<div align="center">

### ✨ Built entirely with [Lovable](https://lovable.dev) ✨

</div>
