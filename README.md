# Interior Designer AI 🏠✨

A modern AI-powered app to redesign interior spaces. Upload a room image or generate from scratch, pick a style, and get a high-quality interior concept in seconds.

![Interior Designer AI](public/app-screenshot.png)

![interior-design-image](public/app-screenshot.png)

[![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.2-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

## 🌟 Features

- 🎨 Clean, modern UI with animation and glassmorphism effects
- 🖼️ Upload-and-transform flow for existing room photos
- 🧠 Generate-new flow for fresh room concepts
- 🏷️ Multiple styles: Modern, Vintage, Minimalist, Professional
- 🏠 Multiple room presets: Living Room, Dining Room, Bedroom, Bathroom, Office
- 📱 Responsive layout for desktop and mobile
- 📥 Download generated images directly from the app
- 🔁 Built-in model and endpoint fallback logic for reliable generation

## 🤖 AI Provider

This project currently uses Hugging Face only.

- Required env variable: HUGGINGFACE_API_KEY
- Inference is executed through Hugging Face endpoints in API routes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm
- Hugging Face token with inference permissions

### 1. Clone

```bash
git clone https://github.com/bikram73/Interior_Designer_Using_AI.git
cd Interior_Designer_Using_AI
```

### 2. Install

```bash
npm install
```

### 3. Configure Environment

Create .env.local in project root:

```env
HUGGINGFACE_API_KEY=hf_your_token_here
```

You can also copy from .env.example and replace the token value.

### 4. Run

```bash
npm run dev
```

Open:

- http://localhost:3000

If port 3000 is busy, Next.js automatically runs on another port (typically 3001).

## 🧭 Usage

### Flow A: Transform Uploaded Room

1. Upload a room image
2. Select style and room type
3. Click the generate button
4. Preview and download result

### Flow B: Generate New Room

1. Do not upload any image
2. Select style and room type
3. Click generate to create a new room concept

## 🔌 API Endpoints

### POST /api/replicate

Image transformation endpoint (path retained for frontend compatibility).

Request body example:

```json
{
  "image": "data:image/jpeg;base64,...",
  "theme": "Modern",
  "room": "Living Room"
}
```

### POST /api/generate-new

Generate a new styled room concept without image upload.

Request body example:

```json
{
  "theme": "Modern",
  "room": "Living Room"
}
```

### POST /api/check-horde

Disabled endpoint (returns HTTP 410) and not used in current provider setup.

## 🗂️ Project Structure

```text
interior-designer-ai-main/
├── app/
│   ├── api/
│   │   ├── check-horde/
│   │   │   └── route.ts
│   │   ├── generate-new/
│   │   │   └── route.ts
│   │   └── replicate/
│   │       └── route.ts
│   ├── components/
│   │   └── page-components.tsx
│   ├── desktop-sidebar.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── header.tsx
│   ├── layout.tsx
│   ├── manifest.ts
│   ├── mobile-sidebar.tsx
│   ├── page.tsx
│   ├── selectmenu.tsx
│   └── sidebar.tsx
├── common/
│   └── index.ts
├── public/
│   ├── app-screenshot.png
│   └── see-running-app.png
├── types/
│   └── index.ts
├── utils/
│   └── index.ts
├── .env.example
├── .env.local
├── LICENSE
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🛠️ Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 🧩 Troubleshooting

### Windows .next cache/readlink error

If you get EINVAL/readlink issues on Windows, clear cache and restart:

```powershell
if (Test-Path .next) { attrib -R -S -H .next /S /D; Remove-Item -LiteralPath .next -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path .next) { cmd /c "rd /s /q .next" }
npm run dev
```

### Hugging Face generation fails

Check these quickly:

- HUGGINGFACE_API_KEY exists in .env.local
- Token has Inference permission
- Hugging Face quota/rate limits are available
- Terminal logs for endpoint/model fallback details

## 🔐 Security

- Do not commit real API tokens
- Rotate any token that was shared in chat, screenshots, or logs

## 📄 License

Licensed under MIT. See [LICENSE](LICENSE).
