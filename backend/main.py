from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import GeoVerseAgent
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="GeoVerse API", description="Agentic GIS-Based Spatial Decision Support System")

# Initialize the Agent
agent = GeoVerseAgent()

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"message": "Welcome to GeoVerse API"}

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    return agent.process_query(req.message)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
