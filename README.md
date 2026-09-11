# GeoVerse: Agentic GIS-Based Spatial Decision Support System

GeoVerse is an intelligent, multi-agent platform designed to automate geospatial analysis and provide spatial decision support through a natural language interface. It integrates multi-source Earth observation data (Sentinel-1/2, OSM) with autonomous AI agents to generate explainable spatial intelligence.

## Architecture
- **Frontend**: React.js, Tailwind CSS (v4), Leaflet Maps
- **Backend**: Python, FastAPI, LangChain
- **Database**: PostgreSQL + PostGIS (Docker)
- **AI Engine**: 5-Agent Architecture (Planning, Data Retrieval, Analysis, Validation, Decision Support)

## Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Docker & Docker Compose
- Free Groq API Key (for LLM reasoning)

## Setup & Installation

### 1. Database Setup
Ensure Docker Desktop is running, then start the spatial database:
```bash
docker-compose up -d
```

### 2. Backend Setup
Navigate to the backend directory, create a virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Set up your environment variables:
Copy `.env.example` to `.env` and insert your API keys.

Start the API Server:
```bash
uvicorn main:app --reload
```
*The API will be available at http://localhost:8000*

### 3. Frontend Setup
Navigate to the frontend directory and install the Node packages:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*The UI will be available at http://localhost:5173*

## Team Division (Batch C3)
- **Geospatial Data & GIS**: Ch. Rupak Sujay Varma
- **AI / Agentic Systems**: B. Ayush Rajay
- **Earth Observation & AI Models**: D. Pooja Sai Rishitha
- **Full Stack & Integration**: E. Jessica Grace
