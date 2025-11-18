# PDF Tutor - Web Application

A web application for viewing PDFs with synchronized transcriptions and note-taking capabilities.

## Features

- 📤 **PDF Upload**: Drag-and-drop or browse to upload PDF files
- 📖 **PDF Viewer**: Built with PDF.js for reliable rendering
- 🔍 **Zoom Controls**: Zoom in/out with configurable scale
- 📄 **Page Navigation**: Navigate through PDF pages easily
- 📝 **Transcriptions**: Display synchronized text content by page
- ✍️ **Notes**: Take and save notes for specific pages
- 🎯 **Interactive**: Click transcriptions to jump to corresponding pages

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8787`

### 3. Upload a PDF

1. Open the application in your browser
2. Drag and drop a PDF file or click to browse
3. Click "Upload PDF" to process the file

## Transcription JSON Format

To enable transcriptions for your PDF, create a JSON file with the same name as your PDF in the `./public/temp` directory.

### Example: `example.pdf` → `example.json`

```json
{
  "transcriptions": [
    {
      "page": 1,
      "text": "Introduction to the main topic. This section covers fundamental concepts."
    },
    {
      "page": 1,
      "text": "Key definitions and terminology."
    },
    {
      "page": 2,
      "text": "Detailed analysis with examples and case studies."
    },
    {
      "page": 3,
      "text": "Summary and conclusions with recommendations."
    }
  ]
}
```

### JSON Schema

- **transcriptions**: Array of transcription objects
  - **page**: (number) The PDF page number this transcription references
  - **text**: (string) The transcription text content

### Creating Transcription Files

1. Name your JSON file to match your PDF (e.g., `document.pdf` → `document.json`)
2. Place it in the `./public/temp` directory
3. Upload the corresponding PDF through the web interface
4. Transcriptions will automatically load and display in the right panel

## Project Structure

```
cf_ai_mini_pdf_tutor/
├── public/
│   ├── index.html          # Main HTML file with UI
│   ├── app.js              # Frontend JavaScript logic
│   └── temp/               # Storage for PDFs and JSON files
│       └── sample.json     # Example transcription file
├── src/
│   └── index.ts            # Cloudflare Worker backend
├── package.json
└── wrangler.jsonc          # Cloudflare Workers configuration
```

## Usage Guide

### Uploading PDFs

1. **Landing Page**: Start by uploading a PDF file
2. **Drag & Drop**: Simply drag your PDF onto the upload area
3. **Browse**: Click the upload area to select a file from your computer

### Viewing PDFs

- **Navigation**: Use Previous/Next buttons to move between pages
- **Zoom**: Use +/- buttons to adjust zoom level
- **Canvas**: PDF renders on a high-quality canvas element

### Working with Transcriptions

1. **View**: Transcriptions appear in the right panel
2. **Navigate**: Click any transcription to jump to that page
3. **Highlight**: Current page transcriptions are highlighted
4. **Reference**: Each transcription shows its page number

### Taking Notes

1. Switch to the "Notes" tab
2. Type your notes in the text area
3. Click "Save Note" to store them
4. Notes are associated with the current page

## Technical Details

### Frontend

- **PDF.js**: Mozilla's PDF rendering library (v3.11.174)
- **Vanilla JavaScript**: No framework dependencies
- **Responsive Design**: Works on desktop and mobile

### Backend (Cloudflare Worker)

- **TypeScript**: Type-safe server code
- **In-Memory Storage**: Demo storage (use R2/KV for production)
- **API Endpoints**:
  - `POST /upload-pdf`: Upload PDF files
  - `GET /temp/{filename}`: Serve uploaded files
  - `POST /save-note`: Save user notes
  - `GET /get-notes`: Retrieve saved notes

## Development

### Running Tests

```bash
npm test
```

### Deploying to Production

```bash
npm run deploy
```

## Production Recommendations

For production deployment, consider:

1. **Storage**: Use Cloudflare R2 for file storage instead of in-memory
2. **Database**: Use Cloudflare D1 or KV for notes and metadata
3. **Authentication**: Add user authentication for multi-user support
4. **File Limits**: Implement file size limits and validation
5. **Rate Limiting**: Add rate limiting for uploads
6. **HTTPS**: Ensure all connections use HTTPS

## Customization

### Styling

Edit the `<style>` section in `public/index.html` to customize:
- Colors and themes
- Layout and spacing
- Responsive breakpoints

### Features

Modify `public/app.js` to add:
- Search functionality
- Annotations and highlights
- Export capabilities
- Additional transcription metadata

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers with HTML5 Canvas support

## License

MIT License - Feel free to use and modify for your projects.

## Support

For issues or questions, please check the documentation or create an issue in the repository.
