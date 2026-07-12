import os
import psycopg2
from psycopg2.extras import RealDictCursor
from google import genai
from google.genai import types

DB_URL = os.getenv("DATABASE_URL", "postgresql://assetflow:assetflow@postgres:5432/assetflow")

def get_db_conn():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

async def run_smart_audit_analysis(audit_id: int) -> str:
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM audits WHERE id = %s", (audit_id,))
                audit = cur.fetchone()
                if not audit:
                    return f"Audit #{audit_id} not found."
                cur.execute("""
                    SELECT i.*, a.name as asset_name, a.asset_tag, a.location as expected_location, u.name as auditor_name
                    FROM audit_items i
                    JOIN assets a ON i.asset_id = a.id
                    LEFT JOIN users u ON i.auditor_user_id = u.id
                    WHERE i.audit_id = %s
                """, (audit_id,))
                items = cur.fetchall()

        audit_summary = (
            f"Audit #{audit['id']} | Scope Type: {audit['scope_type']} | "
            f"Scope Value: {audit['scope_value']} | Status: {audit['status']}"
        )
        items_summary = "\n".join([
            f"- Asset: {item['asset_tag']} ({item['asset_name']}) | Verification: {item['verification_status']} | Location: {item['expected_location']} | Auditor: {item['auditor_name'] or 'Unassigned'} | Notes: {item['remarks'] or 'None'}"
            for item in items
        ]) if items else "No audit items found."

        prompt = (
            f"Run a smart inventory analysis for the following stock audit:\n{audit_summary}\n\n"
            f"Audited items and verification check results:\n{items_summary}\n\n"
            f"Generate a professional Markdown report detailing:\n"
            f"1. **Audit Summary**: Counts of Verified vs Missing vs Damaged items.\n"
            f"2. **Critical Anomalies**: Clusters of missing or damaged items.\n"
            f"3. **Security/Operational Risks**: Flag potential theft or structural wear risks.\n"
            f"4. **Recommendations**: Suggested remedial audits or repairs."
        )

        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are a senior Internal Audit Specialist and Smart Risk Auditor. Flag discrepancies and layout findings clearly in Markdown.",
            ),
        )

        return response.text or "No analysis generated."

    except Exception as e:
        return f"### Smart Auditor Error\nFailed to run audit analysis: {str(e)}"
