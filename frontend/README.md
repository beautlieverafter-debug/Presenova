# AI Presentation & Document Analyzer - Frontend

A modern React + TypeScript + Vite frontend for analyzing presentations and documents with AI-powered insights.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn installed
- Flask backend running on `http://localhost:5000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Layout.tsx       # Main layout wrapper with navbar
│   │   ├── FileUploader.tsx # File upload component
│   │   └── Button.tsx       # Reusable button component
│   │
│   ├── pages/               # Main page components
│   │   ├── Dashboard.tsx      # Home/welcome page
│   │   ├── DocumentAnalyzer.tsx # Phase 2: Document analysis
│   │   ├── SpeechAnalyzer.tsx   # Phase 4: Speech analysis
│   │   └── PracticeMode.tsx     # Phase 5: AI coach chat
│   │
│   ├── services/            # API integration
│   │   └── api.ts          # All backend API calls
│   │
│   ├── types/              # TypeScript interfaces
│   │   └── index.ts        # Data type definitions
│   │
│   ├── App.tsx             # Router configuration
│   └── main.tsx            # Vite entry point
│
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## 🔌 API Integration

All backend API calls are handled in `src/services/api.ts`:

- **Phase 2**: `POST /api/analyze-document` - Document analysis
- **Phase 4**: `POST /api/analyze-speech` - Speech analysis
- **Phase 5**: `POST /api/practice-chat` - AI coach chat

The base URL is configured in `.env`:
```
VITE_API_BASE_URL=http://localhost:5000
```

## 🎯 Features

### Dashboard
- Health check for backend connectivity
- Quick overview of all available features
- Navigation links to different analyzers

### Document Analyzer (Phase 2)
- File upload interface
- AI-powered document analysis
- Scores and 7Cs evaluation
- Actionable recommendations

### Speech Analyzer (Phase 4)
- Speech transcript input
- Word count and filler word analysis
- Speech speed metrics (WPM)
- Sentiment analysis
- Real-time feedback

### AI Coach (Phase 5)
- Chat interface with AI coach
- Message history
- Suggested prompts
- Real-time coaching feedback

## 🎨 Styling

- **Color Scheme**: Purple gradient (#667eea to #764ba2)
- **Framework**: CSS3 with custom styling
- **Responsive**: Mobile-first design
- **Animations**: Smooth transitions and hover effects

## 📦 Dependencies

- **React 18.2.0**: UI library
- **React Router DOM 6.20.0**: Routing
- **TypeScript 5.2.2**: Type safety
- **Vite 5.0.8**: Build tool

## 🛠️ Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🔒 Environment Variables

Create a `.env` file with:

```
VITE_API_BASE_URL=http://localhost:5000
```

## 📝 Notes

- Ensure Flask backend is running before starting the frontend
- CORS is enabled on the backend for frontend requests
- All API calls use fetch API (no axios required)
- TypeScript types ensure type-safe API responses

## 🚨 Troubleshooting

### Backend not connecting?
- Verify Flask server is running on port 5000
- Check CORS is enabled in Flask app
- Check `.env` API URL is correct

### Styling issues?
- Clear browser cache
- Restart dev server
- Check CSS files are in correct directories

### TypeScript errors?
- Run `npm run build` to check all errors
- Ensure all API responses match defined types

## 📄 License

This project is part of a Final Year Project (FYP).

## 👥 Author

AI Presentation & Document Analyzer Team
