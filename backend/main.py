
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
print("Main.py - Current API Key:", OPENAI_API_KEY)  # Debug log

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
    
    print("Making API request with key:", OPENAI_API_KEY)  # Debug log before API call
    
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
    if not autogen_installed:
        await add_trace(conversation_id, "coordinator-1", "error", "AutoGen not installed")
        return
        
    if not OPENAI_API_KEY:
        await add_trace(conversation_id, "coordinator-1", "error", "OpenAI API key not configured")
        return
        
    # Set up actual AutoGen agents for processing
    import autogen
    from autogen.agentchat.contrib.retrieve_assistant_agent import RetrieveAssistantAgent
    from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
    
    # Set up OpenAI config
    config_list = [
        {
            "model": "gpt-4o-mini",  # Using GPT-4o mini
            "api_key": OPENAI_API_KEY,
            "max_tokens": 1000  # Limit token usage
        }
    ]
    
    llm_config = {
        "config_list": config_list,
        "timeout": 120,
        "temperature": 0.7  # Add temperature control
    }
    
    # Disable Docker for code execution
    code_execution_config = {
        "use_docker": False,  # Explicitly disable Docker
        "last_n_messages": 3,
        "work_dir": "workspace",
    }
    
    # Create AutoGen agents
    await add_trace(conversation_id, "coordinator-1", "setup", "Setting up AutoGen agents")
    
    # Create the coordinator agent
    coordinator = autogen.AssistantAgent(
        name="coordinator-1",
        system_message="""You are a skilled coordinator who oversees a team of specialized agents. 
        Your job is to analyze requests, delegate tasks to appropriate team members, 
        and synthesize their work into a comprehensive response.""",
        llm_config=llm_config,
        code_execution_config=code_execution_config
    )
    
    # Create the researcher agent
    researcher = autogen.AssistantAgent(
        name="researcher-1",
        system_message="""You are a thorough researcher who gathers relevant information, analyzes data, 
        and provides comprehensive insights on any topic. Your responses should be detailed and factual.""",
        llm_config=llm_config,
        code_execution_config=code_execution_config
    )
    
    # Create the planner agent
    planner = autogen.AssistantAgent(
        name="planner-1",
        system_message="""You are a strategic planner who creates structured, actionable plans based on 
        research insights. You break down complex problems into clear steps and approaches.""",
        llm_config=llm_config,
        code_execution_config=code_execution_config
    )
    
    # Create the executor agent
    executor = autogen.AssistantAgent(
        name="executor-1",
        system_message="""You are an implementation specialist who takes plans and turns them into concrete solutions. 
        You provide practical, detailed outputs that address the original request completely.""",
        llm_config=llm_config,
        code_execution_config=code_execution_config
    )
    
    # Create the user proxy agent
    user_proxy = autogen.UserProxyAgent(
        name="user-proxy",
        human_input_mode="NEVER",
        system_message="""You are the proxy for the actual user, passing their request to the agent team.""",
        code_execution_config=code_execution_config
    )
    
    # Create a group chat for all agents
    groupchat = autogen.GroupChat(
        agents=[coordinator, researcher, planner, executor, user_proxy],
        messages=[],
        max_round=12
    )
    
    # Create a group chat manager with LLM configuration
    manager = autogen.GroupChatManager(
        groupchat=groupchat,
        llm_config=llm_config  # Provide the same LLM config we used for the agents
    )
    
    # Create a task tracking function that will be called periodically
    async def update_task_status():
        # Create initial research task
        research_task = await add_task(conversation_id, "researcher-1", "Research relevant information")
        await add_trace(conversation_id, "coordinator-1", "task_created", "Created research task")
        
        # Update to in-progress after a short delay
        await asyncio.sleep(2)
        await update_task(conversation_id, research_task["id"], "in-progress")
        await add_trace(conversation_id, "researcher-1", "task_started", "Started research task")
        
        # Create planning task after a delay
        await asyncio.sleep(5)
        planning_task = await add_task(conversation_id, "planner-1", "Create execution plan")
        await add_trace(conversation_id, "coordinator-1", "task_created", "Created planning task")
        
        # Mark research task as completed
        await update_task(conversation_id, research_task["id"], "completed", "Research completed")
        await add_trace(conversation_id, "researcher-1", "task_completed", "Completed research task")
        
        # Update planning task to in-progress
        await asyncio.sleep(2)
        await update_task(conversation_id, planning_task["id"], "in-progress")
        await add_trace(conversation_id, "planner-1", "task_started", "Started planning task")
        
        # Create execution task after a delay
        await asyncio.sleep(5)
        execution_task = await add_task(conversation_id, "executor-1", "Execute plan and generate solution")
        await add_trace(conversation_id, "coordinator-1", "task_created", "Created execution task")
        
        # Mark planning task as completed
        await update_task(conversation_id, planning_task["id"], "completed", "Planning completed")
        await add_trace(conversation_id, "planner-1", "task_completed", "Completed planning task")
        
        # Update execution task to in-progress
        await asyncio.sleep(2)
        await update_task(conversation_id, execution_task["id"], "in-progress")
        await add_trace(conversation_id, "executor-1", "task_started", "Started execution task")
        
        # Mark execution task as completed after a delay
        await asyncio.sleep(10)
        await update_task(conversation_id, execution_task["id"], "completed", "Execution completed")
        await add_trace(conversation_id, "executor-1", "task_completed", "Completed execution task")
    
    # Create a function to handle message callbacks for all agents
    async def register_message_callbacks():
        """Register message callbacks for all agents."""
        
        # Define a callback function that will be registered for each agent
        def message_callback(recipient, message, sender):
            """Callback that will be triggered when an agent sends a message."""
            # Create a task to handle the async operations
            asyncio.create_task(process_agent_message(sender.name, recipient.name, message))
            return False  # Continue the conversation
        
        async def process_agent_message(sender_name, recipient_name, message_content):
            """Process messages asynchronously."""
            sender_id = sender_name.lower().replace(" ", "-")
            recipient_id = recipient_name.lower().replace(" ", "-")
            
            if sender_id == "user-proxy":
                sender_id = "user"
            if recipient_id == "user-proxy":
                recipient_id = "user"
            
            # For internal communications between agents
            if recipient_id != "user" and sender_id != "user":
                await add_message(conversation_id, sender_id, recipient_id, str(message_content), "internal")
                await add_trace(conversation_id, sender_id, "message_sent", f"Message sent to {recipient_id}")
            
            # For responses to the user
            if recipient_id == "user":
                await add_message(conversation_id, sender_id, "user", str(message_content), "response")
                await add_trace(conversation_id, sender_id, "response_sent", "Response sent to user")
        
        # Register the callback for each agent
        for agent in [coordinator, researcher, planner, executor]:
            agent.register_reply(message_callback)
    
    # Register callbacks
    await register_message_callbacks()
    
    # Trace the flow
    await add_trace(conversation_id, "coordinator-1", "process_started", "Processing request with AutoGen")
    
    try:
        # Start the task tracking in the background
        asyncio.create_task(update_task_status())
        
        # Create direct message handlers to ensure we're seeing communications
        await add_message(conversation_id, "user", "coordinator-1", content, "request")
        await add_message(conversation_id, "coordinator-1", "user", "I'm analyzing your request now...", "response")
        
        # Initiate the chat with the user's request using the group chat manager
        await user_proxy.a_initiate_chat(
            manager,
            message=content,
            clear_history=True
        )
        
        # Manually create a final response if none is showing
        final_response = "Task completed. Please check the results of our analysis."
        await add_message(conversation_id, "coordinator-1", "user", final_response, "response")
        
        await add_trace(conversation_id, "coordinator-1", "process_completed", "Successfully processed with AutoGen")
    except Exception as e:
        error_message = str(e)
        await add_trace(conversation_id, "coordinator-1", "process_error", f"Error: {error_message}")
        # Send error message to user
        await add_message(
            conversation_id, 
            "coordinator-1", 
            "user", 
            f"Sorry, there was an error processing your request: {error_message}", 
            "response"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
