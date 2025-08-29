# Echo AI

An AI model comparison platform that allows users to query multiple AI models simultaneously and compare their responses.

## Features

- Compare responses from multiple AI models (Gemini, Mistral, Cohere, ChatGPT, Qwen, Deepseek, Rogue Rose, Meta)
- Real-time evaluation and ranking of AI responses
- Modern React frontend with Material-UI
- FastAPI backend for AI model integration
- Docker support for easy deployment

## Tech Stack

### Frontend
- React 18
- Material-UI (MUI)
- React Router
- Axios for API calls

### Backend
- FastAPI (Python)
- Multiple AI model integrations
- CORS enabled
- JWT authentication support

## Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-github-repo-url>
   cd echo-ai
   ```

2. **Backend Setup**
   ```bash
   cd Backend
   python -m venv venv
   venv\Scripts\activate  # On Windows
   pip install -r requirements.txt
   # Set your API keys in environment variables or .env file
   uvicorn main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd ../echo-ai-frontend
   npm install
   npm start
   ```

### Docker Setup

```bash
docker-compose up --build
```

## API Keys Required

Set these environment variables or create a `.env` file:

- `COHERE_API_KEY`
- `MISTRAL_API_KEY`
- `GEMINI_API_KEY`
- `CHATGPT_API_KEY`
- `QWEN_API_KEY`
- `DEEPSEEK_API_KEY`
- `ROGUEROSE_API_KEY`
- `META_API_KEY`
- `SUPABASE_JWT_SECRET`

## Usage

1. Start both backend and frontend servers
2. Open http://localhost:3000
3. Select AI models to compare
4. Enter your query
5. View and compare responses with rankings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

ScreenShots of Echo.AI

<img width="1917" height="909" alt="ui1" src="https://github.com/user-attachments/assets/9243bcd2-08f7-41de-a9bd-69bcc093c229" />

![ui](https://github.com/user-attachments/assets/0f1f6da2-fde3-4d66-bb86-ff44117d18eb)




