
from fastapi import FastAPI, WebSocket, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import asyncio
import logging
import os
import uuid
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import time
from fastapi.staticfiles import StaticFiles
import importlib.util

# Load environment variables
load_dotenv()

# Check if AutoGen is installed
autogen_installed = importlib.util.find_spec("autogen") is not None
if not autogen_installed:
    print("WARNING: AutoGen is not installed. Please install it with 'pip install pyautogen'")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="AutoGen Multi-Agent Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check for OpenAI API key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not found in environment variables.")

# Pydantic models
class UserRequest(BaseModel):
    content: str
    framework: str = "autogen"  # Default to AutoGen

class Message(BaseModel):
    id: str
    from_agent: str
    to_agent: str
    content: str
    timestamp: float
    type: str

class Trace(BaseModel):
    id: str
    agent_id: str
    action: str
    details: str
    timestamp: float

class Task(BaseModel):
    id: str
    agent_id: str
    description: str
    status: str
    created_at: float
    completed_at: Optional[float] = None
    result: Optional[str] = None

# Store active connections
active_connections: List[WebSocket] = []

# In-memory storage for conversations (replace with database in production)
conversations: Dict[str, Dict[str, Any]] = {}

@app.get("/")
async def root():
    return {"message": "AutoGen Multi-Agent Backend API"}

@app.get("/status")
async def status():
    return {
        "status": "running",
        "autogen_installed": autogen_installed,
        "openai_api_key_configured": bool(OPENAI_API_KEY),
        "active_connections": len(active_connections)
    }

@app.post("/api/request")
async def create_request(request: UserRequest):
    if request.framework == "autogen" and not autogen_installed:
        raise HTTPException(status_code=400, detail="AutoGen framework is not installed")
    
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY not configured")
    
    # Create a new conversation
    conversation_id = str(uuid.uuid4())
    conversations[conversation_id] = {
        "id": conversation_id,
        "request": request.content,
        "framework": request.framework,
        "messages": [],
        "traces": [],
        "tasks": [],
        "status": "processing",
        "created_at": time.time()
    }
    
    # Start processing asynchronously
    asyncio.create_task(process_request(conversation_id, request))
    
    return {"conversation_id": conversation_id, "status": "processing"}

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversations[conversation_id]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        active_connections.remove(websocket)

async def broadcast_update(update_type: str, data: Dict[str, Any]):
    """Broadcast updates to all connected clients."""
    if not active_connections:
        return
    
    message = {
        "type": update_type,
        "data": data,
        "timestamp": time.time()
    }
    
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")

async def add_message(conversation_id: str, from_agent: str, to_agent: str, content: str, msg_type: str = "internal"):
    """Add a message to the conversation and broadcast it."""
    if conversation_id not in conversations:
        return
    
    message = {
        "id": str(uuid.uuid4()),
        "from": from_agent,
        "to": to_agent,
        "content": content,
        "timestamp": time.time(),
        "type": msg_type
    }
    
    conversations[conversation_id]["messages"].append(message)
    await broadcast_update("message", message)
    return message

async def add_trace(conversation_id: str, agent_id: str, action: str, details: str):
    """Add a trace to the conversation and broadcast it."""
    if conversation_id not in conversations:
        return
    
    trace = {
        "id": str(uuid.uuid4()),
        "agentId": agent_id,
        "action": action,
        "details": details,
        "timestamp": time.time()
    }
    
    conversations[conversation_id]["traces"].append(trace)
    await broadcast_update("trace", trace)
    return trace

async def add_task(conversation_id: str, agent_id: str, description: str, status: str = "pending"):
    """Add a task to the conversation and broadcast it."""
    if conversation_id not in conversations:
        return
    
    task = {
        "id": str(uuid.uuid4()),
        "assignedTo": agent_id,
        "description": description,
        "status": status,
        "createdAt": time.time()
    }
    
    conversations[conversation_id]["tasks"].append(task)
    await broadcast_update("task", task)
    return task

async def update_task(conversation_id: str, task_id: str, status: str, result: Optional[str] = None):
    """Update a task in the conversation and broadcast it."""
    if conversation_id not in conversations:
        return
    
    for task in conversations[conversation_id]["tasks"]:
        if task["id"] == task_id:
            task["status"] = status
            if status in ["completed", "failed"]:
                task["completedAt"] = time.time()
            if result:
                task["result"] = result
            await broadcast_update("task_update", task)
            return task
    
    return None

async def process_request(conversation_id: str, request: UserRequest):
    """Process a user request using the selected framework."""
    try:
        # Add initial messages
        await add_message(conversation_id, "user", "coordinator-1", request.content, "request")
        await add_trace(conversation_id, "coordinator-1", "received_request", f"Received: {request.content}")
        
        if request.framework == "autogen":
            await process_with_autogen(conversation_id, request.content)
        elif request.framework == "langchain":
            # Placeholder for LangChain processing
            await add_trace(conversation_id, "coordinator-1", "framework_selection", "Selected LangChain framework")
            # Add more LangChain specific processing here
        elif request.framework == "rasa":
            # Placeholder for Rasa processing
            await add_trace(conversation_id, "coordinator-1", "framework_selection", "Selected Rasa framework")
            # Add more Rasa specific processing here
        else:
            # Default processing
            await add_trace(conversation_id, "coordinator-1", "framework_selection", "Using default processing")
        
        # Mark conversation as completed
        conversations[conversation_id]["status"] = "completed"
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        await add_trace(conversation_id, "coordinator-1", "error", f"Error: {str(e)}")
        conversations[conversation_id]["status"] = "failed"

async def process_with_autogen(conversation_id: str, content: str):
    """Process a request using AutoGen framework."""
    # This is where the actual AutoGen integration will happen
    # For now, we'll simulate the processing to develop the frontend
    
    if not autogen_installed:
        await add_trace(conversation_id, "coordinator-1", "error", "AutoGen not installed")
        return
    
    # Step 1: Coordinator analyzes the request
    await add_trace(conversation_id, "coordinator-1", "analyzing_request", "Analyzing user request")
    
    # Step 2: Assign research task
    research_task = await add_task(conversation_id, "researcher-1", "Research relevant information")
    await add_message(conversation_id, "coordinator-1", "researcher-1", 
                     f"I need you to research information related to: {content}")
    
    # Step 3: Researcher works on the task
    await add_trace(conversation_id, "researcher-1", "research_started", "Beginning information gathering")
    await update_task(conversation_id, research_task["id"], "in-progress")
    
    # Step 4: Researcher completes their work
    await asyncio.sleep(2)  # Simulate processing time
    research_result = f"Research findings for '{content}':\n- Found key insight 1\n- Discovered relevant data point 2\n- Identified related concept 3"
    await update_task(conversation_id, research_task["id"], "completed", research_result)
    await add_trace(conversation_id, "researcher-1", "research_completed", "Completed information gathering")
    await add_message(conversation_id, "researcher-1", "coordinator-1", research_result)
    
    # Step 5: Coordinator assigns planning task
    await asyncio.sleep(1)
    planning_task = await add_task(conversation_id, "planner-1", "Create execution plan")
    await add_message(conversation_id, "coordinator-1", "planner-1", 
                     f"Based on these research findings, create a plan: {research_result}")
    
    # Step 6: Planner works on task
    await add_trace(conversation_id, "planner-1", "planning_started", "Creating execution plan")
    await update_task(conversation_id, planning_task["id"], "in-progress")
    
    # Step 7: Planner completes their work
    await asyncio.sleep(2)
    plan_result = f"Plan for '{content}':\n1. First step of implementation\n2. Second step with details\n3. Final integration approach"
    await update_task(conversation_id, planning_task["id"], "completed", plan_result)
    await add_trace(conversation_id, "planner-1", "planning_completed", "Completed execution plan")
    await add_message(conversation_id, "planner-1", "coordinator-1", plan_result)
    
    # Step 8: Coordinator assigns execution task
    await asyncio.sleep(1)
    execution_task = await add_task(conversation_id, "executor-1", "Execute plan and generate solution")
    await add_message(conversation_id, "coordinator-1", "executor-1", 
                     f"Please execute this plan: {plan_result}")
    
    # Step 9: Executor works on task
    await add_trace(conversation_id, "executor-1", "execution_started", "Implementing solution")
    await update_task(conversation_id, execution_task["id"], "in-progress")
    
    # Step 10: Executor completes their work
    await asyncio.sleep(3)
    solution = f"Final solution for '{content}':\n\nBased on our analysis, here is the complete solution:\n\n1. Key insight: [Details from research]\n2. Recommended approach: [Strategy from plan]\n3. Implementation steps: [Specific actions]\n\nThis solution addresses all aspects of your request."
    await update_task(conversation_id, execution_task["id"], "completed", solution)
    await add_trace(conversation_id, "executor-1", "execution_completed", "Completed implementation")
    await add_message(conversation_id, "executor-1", "coordinator-1", solution)
    
    # Step 11: Coordinator delivers response to user
    await asyncio.sleep(1)
    await add_trace(conversation_id, "coordinator-1", "solution_approved", "Approved final solution")
    await add_message(conversation_id, "coordinator-1", "user", solution, "response")
    await add_trace(conversation_id, "coordinator-1", "response_delivered", "Delivered final response to user")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
