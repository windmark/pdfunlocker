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

The app uses [MuPDF](https://mupdf.com/) compiled to WebAssembly, running in a Web Worker for non-blocking performance.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **MuPDF.js** for native PDF decryption via WebAssembly
- **shadcn/ui** components

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## License

MIT

---

Built with [Lovable](https://lovable.dev)
