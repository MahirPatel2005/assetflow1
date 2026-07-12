import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from google import genai
from google.genai import types

DB_URL = os.getenv("DATABASE_URL", "postgresql://assetflow:assetflow@postgres:5432/assetflow")

def get_db_conn():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

# ── Tool implementations ──

def list_user_assets(user_id: int) -> str:
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT asset_tag, name, condition, status FROM assets WHERE current_holder_user_id = %s", (user_id,))
                rows = cur.fetchall()
                if not rows:
                    return "You do not have any assets currently assigned."
                return "\n".join([f"- {r['asset_tag']}: {r['name']} ({r['condition']}, {r['status']})" for r in rows])
    except Exception as e:
        return f"Error listing assets: {str(e)}"

def request_asset_transfer(asset_tag: str, requester_id: int, target_user_id: int, reason: str) -> str:
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, status, current_holder_user_id FROM assets WHERE asset_tag = %s", (asset_tag,))
                asset = cur.fetchone()
                if not asset:
                    return f"Asset with tag {asset_tag} not found."
                if asset["status"] != "Allocated":
                    return f"Asset {asset_tag} is not currently allocated."
                if asset["current_holder_user_id"] != requester_id:
                    return f"You can only request transfers for assets you currently hold."
                cur.execute(
                    "INSERT INTO transfer_requests (asset_id, requested_by_user_id, requested_to_user_id, reason) VALUES (%s, %s, %s, %s) RETURNING id",
                    (asset["id"], requester_id, target_user_id, reason)
                )
                req_id = cur.fetchone()["id"]
                conn.commit()
                return f"Transfer request #{req_id} created for asset {asset_tag} to user #{target_user_id}."
    except Exception as e:
        return f"Error requesting transfer: {str(e)}"

def book_resource(asset_tag: str, start_time: str, end_time: str, user_id: int, department_id: int) -> str:
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, shared_bookable FROM assets WHERE asset_tag = %s", (asset_tag,))
                asset = cur.fetchone()
                if not asset:
                    return f"Asset {asset_tag} not found."
                if not asset["shared_bookable"]:
                    return f"Asset {asset_tag} ({asset['name']}) is not a shared bookable resource."
                cur.execute(
                    "SELECT id FROM bookings WHERE asset_id = %s AND status IN ('Upcoming','Ongoing') AND start_time < %s AND end_time > %s",
                    (asset["id"], end_time, start_time)
                )
                if cur.fetchone():
                    return f"Overlap detected: {asset['name']} is already booked during that time range."
                cur.execute(
                    "INSERT INTO bookings (asset_id, resource_name, user_id, department_id, start_time, end_time) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (asset["id"], asset["name"], user_id, department_id, start_time, end_time)
                )
                booking_id = cur.fetchone()["id"]
                conn.commit()
                return f"Successfully booked {asset['name']} (Booking #{booking_id}) from {start_time} to {end_time}."
    except Exception as e:
        return f"Error creating booking: {str(e)}"

def raise_maintenance_request(asset_tag: str, description: str, priority: str, user_id: int) -> str:
    try:
        if priority not in ['Low', 'Medium', 'High', 'Critical']:
            priority = 'Medium'
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM assets WHERE asset_tag = %s", (asset_tag,))
                asset = cur.fetchone()
                if not asset:
                    return f"Asset {asset_tag} not found."
                cur.execute(
                    "INSERT INTO maintenance_requests (asset_id, raised_by_user_id, priority, issue_description) VALUES (%s, %s, %s, %s) RETURNING id",
                    (asset["id"], user_id, priority, description)
                )
                req_id = cur.fetchone()["id"]
                conn.commit()
                return f"Maintenance request #{req_id} raised for {asset['name']}."
    except Exception as e:
        return f"Error raising maintenance request: {str(e)}"

# ── Tool declarations for Gemini ──

TOOL_DECLARATIONS = types.Tool(function_declarations=[
    types.FunctionDeclaration(
        name="list_my_assets",
        description="List assets currently assigned to the user.",
        parameters=types.Schema(type="OBJECT", properties={}, required=[]),
    ),
    types.FunctionDeclaration(
        name="request_transfer",
        description="Request to transfer one of the user's assets to another employee.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "asset_tag": types.Schema(type="STRING", description="The asset tag, e.g. 'AF-0001'."),
                "target_user_id": types.Schema(type="INTEGER", description="The ID of the receiving employee."),
                "reason": types.Schema(type="STRING", description="Why the transfer is requested."),
            },
            required=["asset_tag", "target_user_id", "reason"],
        ),
    ),
    types.FunctionDeclaration(
        name="book_item",
        description="Book a shared resource like a conference room or device.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "asset_tag": types.Schema(type="STRING", description="The asset tag."),
                "start_time": types.Schema(type="STRING", description="ISO timestamp for booking start."),
                "end_time": types.Schema(type="STRING", description="ISO timestamp for booking end."),
            },
            required=["asset_tag", "start_time", "end_time"],
        ),
    ),
    types.FunctionDeclaration(
        name="report_issue",
        description="Report a technical problem or damage on an asset to raise a maintenance ticket.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "asset_tag": types.Schema(type="STRING", description="The asset tag."),
                "description": types.Schema(type="STRING", description="Problem details."),
                "priority": types.Schema(type="STRING", description="Low, Medium, High, or Critical."),
            },
            required=["asset_tag", "description"],
        ),
    ),
])


def _execute_tool(name: str, args: dict, user_id: int, department_id: int | None) -> str:
    if name == "list_my_assets":
        return list_user_assets(user_id)
    elif name == "request_transfer":
        return request_asset_transfer(args["asset_tag"], user_id, int(args["target_user_id"]), args["reason"])
    elif name == "book_item":
        return book_resource(args["asset_tag"], args["start_time"], args["end_time"], user_id, department_id or 0)
    elif name == "report_issue":
        return raise_maintenance_request(args["asset_tag"], args["description"], args.get("priority", "Medium"), user_id)
    else:
        return f"Unknown tool: {name}"


async def chat_with_assistant(message: str, user_id: int, role: str, department_id: int | None) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    system_instruction = (
        f"You are the AssetFlow AI Assistant. You help employees manage their company assets.\n"
        f"Active User Context: User ID = {user_id}, Role = {role}, Department ID = {department_id or 'None'}.\n"
        f"Answer questions clearly. If the user wants to execute an action (list their assets, transfer, book a room, "
        f"or report damage/raise maintenance), call the appropriate tool. Be helpful, concise, and professional."
    )

    contents = [types.Content(role="user", parts=[types.Part.from_text(text=message)])]

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[TOOL_DECLARATIONS],
        ),
    )

    # Handle tool calls if any
    if response.candidates and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if part.function_call:
                fn = part.function_call
                result = _execute_tool(fn.name, dict(fn.args) if fn.args else {}, user_id, department_id)

                # Send tool result back for final response
                contents.append(response.candidates[0].content)
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_function_response(
                        name=fn.name,
                        response={"result": result},
                    )],
                ))

                final_response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        tools=[TOOL_DECLARATIONS],
                    ),
                )
                return final_response.text or result

    return response.text or "I'm not sure how to help with that. Could you rephrase?"
