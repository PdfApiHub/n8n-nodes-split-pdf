# n8n-nodes-split-pdf

[![NPM Version](https://img.shields.io/npm/v/n8n-nodes-split-pdf.svg)](https://www.npmjs.com/package/n8n-nodes-split-pdf)
[![License](https://img.shields.io/npm/l/n8n-nodes-split-pdf.svg)](LICENSE.md)

> Split a PDF into individual pages, specific page ranges, or equal-sized chunks.

This is an [n8n](https://n8n.io/) community node powered by **[PDF API Hub](https://pdfapihub.com)**.

---

## 🚀 Install

1. Go to **Settings → Community Nodes** in n8n
2. Enter `n8n-nodes-split-pdf`
3. Click **Install**

## 🔑 Setup

1. Sign up at [pdfapihub.com](https://pdfapihub.com) (free tier available)
2. Copy your API key
3. In n8n → **Credentials → New → PDF API Hub API** → paste your key

---

## ✨ Features

| Parameter | Description |
|-----------|-------------|
| **Input Type** | URL or Binary file |
| **Split Mode** | **Each** (one PDF per page), **Pages** (specific ranges like `1-3,5,8-10`), or **Chunks** (equal parts) |
| **Chunks** | Number of equal parts (2–100) |
| **Output Format** | URL, Base64, or Binary File (always returns a ZIP) |
| **Output Filename** | Custom filename for the output ZIP |

---

## 💡 Use Cases

- **Extract specific pages** — pull out just the pages you need
- **Distribute chapters** — split a book into individual chapters
- **Batch processing** — break large documents into manageable parts
- **Archival** — split scanned documents by section

## 📚 Resources

- [PDF API Hub Docs](https://pdfapihub.com/docs)

## License

[MIT](LICENSE.md)
