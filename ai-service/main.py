from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import os
import uvicorn

from agents.asset_assistant import chat_with_assistant
from agents.maintenance_agent import run_predictive_maintenance_analysis
from agents.audit_agent import run_smart_audit_analysis

app = FastAPI(title="AssetFlow AI Microservice")

class ChatRequest(BaseModel):
    message: str
    userId: int
    role: str
    departmentId: Optional[int] = None

class AuditAnalysisRequest(BaseModel):
    auditId: int

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/ai/chat")
async def ai_chat(req: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail="GEMINI_API_KEY is not configured. Please get one at https://aistudio.google.com/app/api-keys and add it to your .env file."
        )
    try:
        reply = await chat_with_assistant(req.message, req.userId, req.role, req.departmentId)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/analyze-maintenance")
async def analyze_maintenance():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail="GEMINI_API_KEY is not configured. Please get one at https://aistudio.google.com/app/api-keys and add it to your .env file."
        )
    try:
        report = await run_predictive_maintenance_analysis()
        return {"report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/analyze-audit")
async def analyze_audit(req: AuditAnalysisRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail="GEMINI_API_KEY is not configured. Please get one at https://aistudio.google.com/app/api-keys and add it to your .env file."
        )
    try:
        report = await run_smart_audit_analysis(req.auditId)
        return {"report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
