from http import client
import json
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mistralai.client import MistralClient  
from mistralai.models.chat_completion import ChatMessage
import google.generativeai as genai
import cohere
from dotenv import load_dotenv
from openai import OpenAI
import requests
import asyncio
from middleware.auth import require_auth
import jwt  # PyJWT
from jwt import PyJWTError


load_dotenv()


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Explicitly set your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


cohere_api_key = os.getenv("COHERE_API_KEY")
mistral_api_key = os.getenv("MISTRAL_API_KEY")
gemini_api_key = os.getenv("GEMINI_API_KEY")
Chat_api_key = os.getenv("CHATGPT_API_KEY")
Qwen_api_key = os.getenv("QWEN_API_KEY")
Deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
Roguerose_api_key = os.getenv("ROGUEROSE_API_KEY")
Meta_api_key = os.getenv("META_API_KEY")

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
print("SUPABASE_JWT_SECRET:", repr(SUPABASE_JWT_SECRET))
if not SUPABASE_JWT_SECRET:
    raise RuntimeError("SUPABASE_JWT_SECRET is not set! Please set it in your .env file.")

clients = {}

if cohere_api_key:
    clients["cohere"] = cohere.Client(cohere_api_key)
if mistral_api_key:
    clients["mistral"] = MistralClient(api_key=mistral_api_key)
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
if Chat_api_key:
    clients["openai"] = OpenAI(api_key=Chat_api_key)


@app.get("/")
async def root():
    return {"message": "Echo.AI Backend is running! Access the API at /api/query"}


@app.post("/api/query")
# @require_auth  # Removed authentication for prompt queries
async def query(request: Request):
    body = await request.json()
    prompt = body.get("prompt")
    selected_models = body.get("models", [])  # Get selected models from request
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    if not selected_models:
        raise HTTPException(status_code=400, detail="No models selected")

    # Get user ID from the authenticated request (now optional)
    user_id = None
    # If you want to keep user_id for future use, you can try to get it from the token if present
    # else leave as None

    responses = {}
    
    # Only query selected models
    if "Cohere" in selected_models:
        try:
            responses["Cohere"] = await query_cohere(prompt)
        except Exception as e:
            responses["Cohere"] = f"Cohere Error: {str(e)}"

    if "Mistral" in selected_models:
        try:
            responses["Mistral"] = await query_mistral(prompt)
        except Exception as e:
            responses["Mistral"] = f"Mistral Error: {str(e)}"
    
    if "Gemini" in selected_models:
        try:
            responses["Gemini"] = query_gemini(prompt)
        except Exception as e:
            responses["Gemini"] = f"Gemini Error: {str(e)}"
    
    if "ChatGPT" in selected_models:
        try:
            responses["ChatGPT"] = await query_openai(prompt)
        except Exception as e:
            responses["ChatGPT"] = f"ChatGPT Error: {str(e)}"
    
    if "Qwen" in selected_models:
        try:
            responses["Qwen"] = await query_Qwen(prompt)
        except Exception as e:
            responses["Qwen"] = f"Qwen Error: {str(e)}"
    
    if "Deepseek" in selected_models:
        try:
            responses["Deepseek"] = await query_Deepseek(prompt)
        except Exception as e:
            responses["Deepseek"] = f"Deepseek Error: {str(e)}"
    
    if "Rogue Rose" in selected_models:
        try:
            responses["Rogue Rose"] = await query_RogueRose(prompt)
        except Exception as e:
            responses["Rogue Rose"] = f"Rogue Rose Error: {str(e)}"
    
    if "Meta" in selected_models:
        try:
            responses["Meta"] = await query_Meta(prompt)
        except Exception as e:
            responses["Meta"] = f"Meta Error: {str(e)}"

    # Get evaluation and ranking of responses
    try:
        evaluation_results = await evaluate_responses(prompt, responses)
        return {
            "responses": responses,
            "evaluation": evaluation_results,
            "user_id": user_id
        }
    except Exception as e:
        return {
            "responses": responses,
            "evaluation": {"error": f"Evaluation Error: {str(e)}"},
            "user_id": user_id
        }


async def evaluate_responses(prompt, responses):
    """
    Evaluate and rank the AI responses using Mistral as a judge.
    """
    if "mistral" not in clients:
        return {"error": "Mistral API key not configured for evaluation"}

    def build_eval_prompt():
        # Prepare the evaluation prompt
        evaluation_prompt = f"""
You are an AI response evaluator. Your task is to evaluate responses OBJECTIVELY, without any bias.

User Query: "{prompt}"

CRITICAL EVALUATION RULES:
1. You MUST evaluate responses based ONLY on their content quality
2. You MUST completely ignore which model generated each response
3. You MUST treat all responses equally, regardless of their source
4. You MUST NOT favor any particular model or type of response
5. You MUST evaluate each response independently and objectively
6. You MUST provide numerical scores between 0-100 ONLY
7. You MUST NOT use any other scoring format or range

EVALUATION CRITERIA:
1. Accuracy (0-100):
   - How factually correct is the response?
   - Does it provide accurate information?
   - Are the facts and details correct?

2. Relevance (0-100):
   - How well does it address the query?
   - Is the response directly related to the question?
   - Does it provide relevant information?

SCORING RULES:
- ALL scores MUST be whole numbers between 0-100 and each score should vary 
- NO decimals, fractions, or percentages allowed
- NO other scoring formats permitted
- Overall score = (accuracy + relevance) / 2
- Base scores ONLY on response content quality
- IGNORE which model generated the response

SCORING SCALE:
90-100: Exceptional - Highly accurate and directly relevant
75-89: Very Good - Mostly accurate and relevant
60-74: Good - Somewhat accurate and relevant
40-59: Fair - Partially accurate and relevant
0-39: Poor - Mostly inaccurate or irrelevant

AI Responses to Evaluate:
"""

        # Add each AI's response to the evaluation prompt
        for model_name, response in responses.items():
            if not response.startswith(f"{model_name} Error"):
                evaluation_prompt += f"\n--- Response {model_name} ---\n{response}\n"

        evaluation_prompt += """
You MUST return a JSON object with this EXACT structure:
{
  "evaluations": {
    "AI_Name": {
      "accuracy": 85,  // Must be a number between 0-100
      "relevance": 90, // Must be a number between 0-100
      "overall": 87,   // Must be a number between 0-100
      "explanation": "Brief explanation of the score"
    }
  },
  "ranking": ["AI_Name_1", "AI_Name_2", ...]
}

FINAL REQUIREMENTS:
1. ALL scores MUST be whole numbers between 0-100
2. NO decimals, fractions, or percentages allowed
3. NO other scoring formats permitted
4. Overall score MUST be the average of accuracy and relevance
5. Return ONLY the JSON object, no other text or formatting
6. Score based ONLY on response quality, IGNORE model names
7. Be completely objective and unbiased in your evaluation
8. Treat all responses equally, regardless of their source
9. Evaluate each response independently
10. Do not compare responses to each other, only to the criteria
"""
        return evaluation_prompt

    def parse_eval_response(evaluation_text):
        evaluation_text = evaluation_text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(evaluation_text)
        except Exception:
            return None

    try:
        messages = [ChatMessage(role="user", content=build_eval_prompt())]
        response = clients["mistral"].chat(model="mistral-small-latest", messages=messages)
        if not response.choices:
            return {"error": "Empty response from Mistral evaluator"}
        evaluation_text = response.choices[0].message.content.strip()
        evaluation_results = parse_eval_response(evaluation_text)
        if evaluation_results and "evaluations" in evaluation_results:
            # Process and validate scores
            processed_evaluations = {
                "evaluations": {},
                "ranking": []
            }

            # Process each model's evaluation
            for model, eval_data in evaluation_results.get("evaluations", {}).items():
                try:
                    # Convert scores to float and ensure they're between 0-100
                    accuracy = float(eval_data.get("accuracy", 0))
                    relevance = float(eval_data.get("relevance", 0))
                    
                    # Calculate overall score as average
                    overall = (accuracy + relevance) / 2
                    
                    # Ensure all scores are between 0-100
                    processed_evaluations["evaluations"][model] = {
                        "accuracy": min(100, max(0, accuracy)),
                        "relevance": min(100, max(0, relevance)),
                        "overall": min(100, max(0, overall)),
                        "explanation": eval_data.get("explanation", "")
                    }
                except (ValueError, TypeError) as e:
                    print(f"Error processing scores for {model}: {e}")
                    # If score conversion fails, use default values
                    processed_evaluations["evaluations"][model] = {
                        "accuracy": 0,
                        "relevance": 0,
                        "overall": 0,
                        "explanation": "Score calculation failed"
                    }

            # Sort models by overall score to create ranking
            processed_evaluations["ranking"] = sorted(
                processed_evaluations["evaluations"].keys(),
                key=lambda x: processed_evaluations["evaluations"][x]["overall"],
                reverse=True
            )
            
            if not processed_evaluations["evaluations"]:
                print("No valid evaluations were processed")
                return {"error": "No valid evaluations were processed"}
                
            return processed_evaluations
        else:
            return {"error": "Invalid evaluation results structure"}
    except Exception as e:
        return {"error": f"Evaluation Error: {str(e)}"}


async def query_cohere(prompt):
    if "cohere" not in clients:
        return "Cohere API key not configured"
    
    try:
        response = clients["cohere"].generate(model="command", prompt=prompt)
        return response.generations[0].text.strip()
    except Exception as e:
        return f"Cohere Error: {str(e)}"


async def query_mistral(prompt):
    if "mistral" not in clients:
        return "Mistral API key not configured"
    
    try:
        messages = [ChatMessage(role="user", content=prompt)]
        response = clients["mistral"].chat(model="mistral-small-latest", messages=messages)
        return response.choices[0].message.content if response.choices else "No response received"
    except Exception as e:
        return f"Mistral Error: {str(e)}"


def query_gemini(prompt):
    if not gemini_api_key:
        return "Gemini API key not configured"
    
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Gemini Error: {str(e)}"


async def query_openai(prompt):
    if "openai" not in clients:
        return "OpenAI API key not configured"
    
    try:
        completion = clients["openai"].chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return f"GPT Error: {str(e)}"
    
    
async def query_Deepseek(prompt):
    if not Deepseek_api_key:
        return "Deepseek API key not configured"
    
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {Deepseek_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "deepseek/deepseek-chat-v3-0324:free",  
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        response = requests.post(url, headers=headers, json=payload)
        response_data = response.json()

        if response.status_code == 200:
            return response_data["choices"][0]["message"]["content"].strip()
        else:
            return f"Deepseek Error: {response_data.get('error', 'Unknown error')}"
    except Exception as e:
        return f"Deepseek Error: {str(e)}"


async def query_Qwen(prompt):
    if not Qwen_api_key:
        return "Qwen API key not configured"
    
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {Qwen_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "qwen/qwen2.5-vl-32b-instruct:free",  
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        response = requests.post(url, headers=headers, json=payload)
        response_data = response.json()

        if response.status_code == 200:
            return response_data["choices"][0]["message"]["content"].strip()
        else:
            return f"Qwen Error: {response_data.get('error', 'Unknown error')}"
    except Exception as e:
        return f"Qwen Error: {str(e)}"
    
    
async def query_RogueRose(prompt):
    if not Roguerose_api_key:
        return "Rogue Rose API key not configured"
    
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {Roguerose_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "sophosympatheia/rogue-rose-103b-v0.2:free",  
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        response = requests.post(url, headers=headers, json=payload)
        response_data = response.json()

        if response.status_code == 200:
            return response_data["choices"][0]["message"]["content"].strip()
        else:
            return f"Rogue Rose Error: {response_data.get('error', 'Unknown error')}"
    except Exception as e:
        return f"Rogue Rose Error: {str(e)}"
    
    
async def query_Meta(prompt):
    if not Meta_api_key:
        return "Meta API key not configured"
    
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {Meta_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "meta-llama/llama-3.3-70b-instruct:free",  
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        response = requests.post(url, headers=headers, json=payload)
        response_data = response.json()

        if response.status_code == 200:
            return response_data["choices"][0]["message"]["content"].strip()
        else:
            return f"Meta Error: {response_data.get('error', 'Unknown error')}"
    except Exception as e:
        return f"Meta Error: {str(e)}"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# THUDM: GLM Z1 9B (free) general pupose.
# Google: Gemma 3 27B (free) 140 lang and reasoning