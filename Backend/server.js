const express = require('express');
const cors = require('cors');
const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

// Mock AI model responses
const mockResponses = {
  Gemini: "I'm Gemini, and I can help you with general knowledge questions. I aim to provide accurate and helpful information.",
  Mistral: "As Mistral, I specialize in code generation and programming assistance. I can help you write, debug, and optimize code.",
  Cohere: "I'm Cohere, focused on text analysis and natural language processing. I can help you understand and analyze text data.",
  ChatGPT: "I'm ChatGPT, and I excel at creative writing and generating engaging content. I can help you craft stories, articles, and more.",
  Qwen: "I'm Qwen, and I specialize in multilingual support. I can help you with translation and language-related tasks.",
  Deepseek: "I'm Deepseek, focused on deep learning and AI research. I can help you understand complex AI concepts.",
  "Rogue Rose": "I'm Rogue Rose, specializing in art generation. I can help you create and understand visual art.",
  Meta: "I'm Meta, and I excel at summarization tasks. I can help you condense and understand large amounts of text."
};

// Mock evaluation function
const evaluateResponse = (model, response) => {
  const baseScore = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
  return {
    overall: baseScore,
    accuracy: baseScore - Math.floor(Math.random() * 10),
    relevance: baseScore - Math.floor(Math.random() * 10)
  };
};

app.post('/api/query', (req, res) => {
  const { prompt, models } = req.body;
  
  if (!prompt || !models || !Array.isArray(models)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Generate responses for selected models
  const responses = {};
  const evaluations = {};
  
  models.forEach(model => {
    if (mockResponses[model]) {
      responses[model] = mockResponses[model] + `\n\nRegarding your question: "${prompt}"\n\nThis is a mock response from ${model}. In a real implementation, this would be the actual AI model's response.`;
      evaluations[model] = evaluateResponse(model, responses[model]);
    }
  });

  // Generate ranking based on overall scores
  const ranking = Object.entries(evaluations)
    .sort(([, a], [, b]) => b.overall - a.overall)
    .map(([model]) => model);

  res.json({
    responses,
    evaluation: {
      evaluations,
      ranking
    }
  });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
}); 