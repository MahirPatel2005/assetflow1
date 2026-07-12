import os
import psycopg2
from psycopg2.extras import RealDictCursor
from google import genai
from google.genai import types

DB_URL = os.getenv("DATABASE_URL", "postgresql://assetflow:assetflow@postgres:5432/assetflow")

def get_db_conn():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

async def run_predictive_maintenance_analysis() -> str:
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, asset_tag, condition, status FROM assets")
                assets = cur.fetchall()
                cur.execute("""
                    SELECT m.*, a.name as asset_name, a.asset_tag 
                    FROM maintenance_requests m
                    JOIN assets a ON m.asset_id = a.id
                    ORDER BY m.created_at DESC
                """)
                logs = cur.fetchall()

        assets_summary = "\n".join([f"- {a['asset_tag']}: {a['name']} | Condition: {a['condition']} | Status: {a['status']}" for a in assets])
        logs_summary = "\n".join([
            f"- Asset: {l['asset_tag']} ({l['asset_name']}) | Issue: {l['issue_description']} | Priority: {l['priority']} | Status: {l['status']} | Date: {l['created_at']}"
            for l in logs
        ]) if logs else "No maintenance logs found."

        prompt = (
            f"Analyze our company's asset maintenance records and flag any predictive anomalies.\n\n"
            f"Current inventory:\n{assets_summary}\n\n"
            f"Maintenance/repair history:\n{logs_summary}\n\n"
            f"Generate a comprehensive Markdown report detailing:\n"
            f"1. **Anomalies Detected**: High-frequency failure components, recurrent issues, or priority spikes.\n"
            f"2. **Risk Analysis**: Predict which assets are likely to fail next based on condition and maintenance counts.\n"
            f"3. **Proactive Recommendations**: Clear, actionable preventive steps."
        )

        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are an expert Reliability Engineer and Predictive Maintenance AI Analyst. Analyze data deeply and format outputs in structured Markdown.",
            ),
        )

        return response.text or "No analysis generated."

    except Exception as e:
        return f"### Predictive Maintenance Analysis Error\nFailed to run analysis: {str(e)}"
