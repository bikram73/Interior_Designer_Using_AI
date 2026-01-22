# Interior Designer AI 🏠✨

A modern, AI-powered application for transforming interior spaces with cutting-edge design. Upload a photo of your room and get a redesigned space in seconds - **completely free!**

![interior-design-image](public/app-screenshot.png)

[![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.2-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://choosealicense.com/licenses/mit/)

## 🌟 Features

- **🎨 Modern UI** with glassmorphism effects and fluid animations
- **🤖 AI-Powered Design** generation using free Pollinations.ai API
- **🎭 Multiple Design Styles** including Modern, Vintage, Minimalist, and Professional
- **🏠 Various Room Types** such as Living Room, Dining Room, Bedroom, Bathroom, and Office
- **📱 Responsive Design** that works on both desktop and mobile devices
- **💰 100% Free** - No API keys, registration, or payment required
- **⚡ Instant Generation** - Get AI-designed rooms in seconds
- **📥 Download Feature** - Save your generated designs
- **🎯 Drag & Drop** - Easy image upload interface

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or later
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bikram73/Interior_Designer_Using_AI.git
   cd Interior_Designer_Using_AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

**That's it!** No API keys, no registration, no payment required. 🎉

## 📁 Project Structure

```
interior-designer-ai/
├── 📁 .github/                    # GitHub workflows and templates
│   ├── 📄 CODEOWNERS
│   └── 📄 pull_request_template.md
├── 📁 .husky/                     # Git hooks
│   ├── 📄 .gitignore
│   └── 📄 pre-commit
├── 📁 app/                        # Next.js 14 App Router
│   ├── 📁 api/                    # API routes
│   │   └── 📁 replicate/
│   │       └── 📄 route.ts        # AI image generation endpoint
│   ├── 📁 components/             # React components
│   │   └── 📄 page-components.tsx # Main UI components
│   ├── 📄 desktop-sidebar.tsx     # Desktop navigation
│   ├── 📄 favicon.ico
│   ├── 📄 globals.css             # Global styles
│   ├── 📄 header.tsx              # Header component
│   ├── 📄 layout.tsx              # Root layout
│   ├── 📄 mobile-sidebar.tsx      # Mobile navigation
│   ├── 📄 page.tsx                # Home page
│   ├── 📄 selectmenu.tsx          # Dropdown component
│   └── 📄 sidebar.tsx             # Sidebar component
├── 📁 common/                     # Shared utilities
│   └── 📄 index.ts
├── 📁 public/                     # Static assets
│   ├── 📄 app-screenshot.png
│   ├── 📄 create-account-in-replicate.png
│   ├── 📄 create-api-token.png
│   ├── 📄 go-to-api-tokens.png
│   ├── 📄 next.svg
│   ├── 📄 see-running-app.png
│   └── 📄 vercel.svg
├── 📁 types/                      # TypeScript type definitions
│   └── 📄 index.ts
├── 📁 utils/                      # Utility functions
│   └── 📄 index.ts
├── 📄 .env.example                # Environment variables template
├── 📄 .env.local                  # Local environment variables
├── 📄 .gitignore                  # Git ignore rules
├── 📄 .nvmrc                      # Node.js version
├── 📄 .prettierrc                 # Prettier configuration
├── 📄 CODE_OF_CONDUCT.md          # Code of conduct
├── 📄 LICENSE                     # MIT License
├── 📄 README.md                   # Project documentation
├── 📄 next.config.js              # Next.js configuration
├── 📄 package-lock.json           # Dependency lock file
├── 📄 package.json                # Project dependencies
├── 📄 postcss.config.js           # PostCSS configuration
├── 📄 tailwind.config.js          # Tailwind CSS configuration
└── 📄 tsconfig.json               # TypeScript configuration
```

## 🛠️ Technologies Used

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.2.35 | React framework for production |
| **React** | 18.2.0 | UI component library |
| **TypeScript** | 5.1.3 | Type-safe JavaScript |
| **Tailwind CSS** | 3.3.2 | Utility-first CSS framework |
| **Framer Motion** | 12.5.0 | Animation library for React |
| **Headless UI** | 1.7.15 | Unstyled, accessible UI components |
| **React Dropzone** | 14.2.3 | File upload component |
| **File Saver** | 2.0.5 | File download functionality |
| **Pollinations.ai** | Free API | AI-powered image generation |

## 🤖 AI Integration

This application uses **Pollinations.ai**, a completely free AI image generation service:

### Features
- **Cost**: 100% Free - No payment required
- **Setup**: No API keys or registration needed
- **Technology**: Uses Stable Diffusion AI models
- **Speed**: Generates images in 2-5 seconds
- **Quality**: High-quality interior design images

### How It Works

1. **Input Processing**: Takes your selected design style and room type
2. **Prompt Generation**: Creates detailed prompts like:
   ```
   "A stunning modern style living room interior design, 
   professional photography, high-end furniture, beautiful lighting, 
   clean and organized, architectural digest style, 4k, ultra-detailed, 
   realistic, modern decor, elegant, spacious, well-lit"
   ```
3. **AI Generation**: Sends the prompt to Pollinations.ai's free API
4. **Image Delivery**: Returns a unique AI-generated interior design image

### API Endpoint Example
```
https://image.pollinations.ai/prompt/[encoded_prompt]?width=768&height=768&seed=[random]
```

## 🎨 Design Styles Available

| Style | Description |
|-------|-------------|
| **Modern** | Clean lines, minimalist approach, contemporary furniture |
| **Vintage** | Classic elements, warm colors, retro furniture pieces |
| **Minimalist** | Simple, uncluttered spaces with neutral colors |
| **Professional** | Sophisticated, business-appropriate interior designs |

## 🏠 Room Types Supported

- **Living Room** - Main gathering spaces with seating areas
- **Dining Room** - Formal and casual dining spaces
- **Bedroom** - Master bedrooms, guest rooms, children's rooms
- **Bathroom** - Modern and traditional bathroom designs
- **Office** - Home offices and professional workspaces

## 📱 Usage Guide

### Step 1: Upload Your Room Photo
- Click or drag to upload an image
- Supports JPEG, JPG, and PNG formats
- Maximum file size: 5MB
- Best results with well-lit, clear room photos

### Step 2: Select Design Preferences
- Choose your preferred **Design Style** (Modern, Vintage, etc.)
- Select the **Room Type** (Living Room, Bedroom, etc.)

### Step 3: Generate Design
- Click the "Design this room" button
- Wait 2-5 seconds for AI generation
- View your new interior design concept

### Step 4: Download (Optional)
- Click the download button on the generated image
- Save your design for future reference

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
npx vercel --prod
```

### Netlify
```bash
npm run build
npm run export
# Upload the 'out' folder to Netlify
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Development

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Install git hooks
npm run prepare
```

### Environment Variables

Create a `.env.local` file (optional - no API keys required):

```env
# Optional: Add any custom environment variables here
# No API keys needed for Pollinations.ai
```

## 🤝 Contributing

We welcome contributions! Here's how you can help improve the Interior Designer AI project:

### Code Style
 
- We use **Prettier** for code formatting
- **ESLint** for code linting
- **Husky** for pre-commit hooks
- Follow **TypeScript** best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


