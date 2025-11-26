# PDF Tutor - AI-Powered PDF Learning Assistant

An intelligent web application for studying PDFs with AI-generated summaries, quizzes, and note-taking capabilities. Built on Cloudflare Workers with Workers AI.

## Features

- 📤 **PDF Management**: Upload, view, and manage your PDF library
- 📖 **Interactive PDF Viewer**: Smooth rendering with zoom and navigation controls
- 🤖 **AI-Generated Transcriptions**: Automatic page summaries using Cloudflare Workers AI
- 📝 **Smart MCQs**: AI-generated multiple choice questions with instant feedback and scoring
- ✍️ **Page Notes**: Take and save notes for specific pages
- ☁️ **Cloud Storage**: PDFs stored in Cloudflare R2 for reliable access

## Quick Start

### Prerequisites

- Node.js (v18+)
- Cloudflare account with Workers AI enabled
- R2 bucket configured (see `wrangler.jsonc`)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Access the app at `http://localhost:8787`

### Deployment

```bash
npm run deploy
```

## How It Works

1. **Upload PDF**: Drag and drop or browse to upload your PDF file
2. **AI Processing**: The system extracts text and generates:
   - Page-by-page summaries (transcriptions)
   - Multiple choice questions for self-testing
3. **Interactive Learning**: 
   - Read AI summaries alongside the PDF
   - Test your knowledge with generated quizzes
   - Track your score as you progress
   - Take personal notes on each page

## Project Structure

```
cf_ai_mini_pdf_tutor/
├── public/                   # Frontend assets
│   ├── index.html           # PDF library page
│   ├── viewer.html          # PDF viewer page
│   ├── js/
│   │   ├── components/      # UI components (PDF viewer, notes, MCQ, etc.)
│   │   ├── services/        # API service layer
│   │   └── shared/          # Utilities and constants
│   └── styles/              # CSS modules
├── src/                     # Backend (Cloudflare Worker)
│   ├── controllers/         # Request handlers
│   ├── services/            # Business logic (LLM, PDF, storage)
│   ├── routes/              # API routes
│   ├── middleware/          # CORS, validation, error handling
│   └── types/               # TypeScript definitions
└── wrangler.jsonc           # Cloudflare configuration
```

## API Endpoints

### PDF Management
- `POST /api/pdf/upload` - Upload PDF file
- `GET /api/pdf/list` - List all PDFs
- `GET /api/pdf/:id` - Get PDF file
- `DELETE /api/pdf/:id` - Delete PDF

### AI Content
- `GET /api/transcript/:docId/:page` - Get/generate AI transcript for page
- `GET /api/mcq/:docId/:page` - Get/generate MCQ questions for page

### User Data
- `POST /api/notes` - Save note
- `GET /api/notes/:docId` - Get all notes for document
- `POST /api/score` - Update quiz score
- `GET /api/score/:docId` - Get current score

## Technology Stack

### Frontend
- Vanilla JavaScript with ES6 modules
- PDF.js for rendering
- Component-based architecture
- Responsive CSS design

### Backend
- Cloudflare Workers (TypeScript)
- Workers AI (LLM integration)
- R2 Object Storage
- RESTful API design

## Configuration

Edit `wrangler.jsonc` to configure:
- R2 bucket name
- AI model settings
- Worker name and routes

## Development Notes

- **LLM Model**: Uses Cloudflare Workers AI for text generation
- **Storage**: R2 buckets for PDF storage and metadata
- **Text Extraction**: `unpdf` library for PDF text extraction
- **Architecture**: Modular design with separation of concerns

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

## License

MIT License - Free to use and modify.