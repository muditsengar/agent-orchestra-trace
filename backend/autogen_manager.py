
import autogen
import os
import time
import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable
from config import OPENAI_API_KEY, DEFAULT_MODEL, FAST_MODEL

logger = logging.getLogger(__name__)

class AutoGenManager:
    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set in environment variables")
        
        self.config_list = [
            {
                "model": DEFAULT_MODEL,
                "api_key": OPENAI_API_KEY,
            }
        ]
        
        self.fast_config_list = [
            {
                "model": FAST_MODEL,
                "api_key": OPENAI_API_KEY,
            }
        ]
        
        # Callbacks for external systems
        self.message_callback = None
        self.trace_callback = None
        self.task_callback = None
        self.task_update_callback = None
    
    def register_callbacks(self, 
                          message_cb: Optional[Callable] = None,
                          trace_cb: Optional[Callable] = None,
                          task_cb: Optional[Callable] = None,
                          task_update_cb: Optional[Callable] = None):
        """Register callbacks for external systems to receive events"""
        self.message_callback = message_cb
        self.trace_callback = trace_cb
        self.task_callback = task_cb
        self.task_update_callback = task_update_cb
    
    async def create_agents(self):
        """Create the agent system with the required roles"""
        # Create a custom message callback that will work with our frontend
        async def custom_message_callback(sender, recipient, message):
            if self.message_callback:
                sender_id = self._get_agent_id(sender.name)
                recipient_id = self._get_agent_id(recipient.name)
                await self.message_callback(sender_id, recipient_id, message)
        
        # Define the agents
        user_proxy = autogen.UserProxyAgent(
            name="User",
            system_message="I am the user proxy, representing the human user. I'll help coordinate the conversation.",
            human_input_mode="NEVER",
            code_execution_config={"use_docker": False},
        )
        
        coordinator = autogen.AssistantAgent(
            name="Coordinator",
            system_message="""You are the coordinator agent. Your job is to:
1. Understand the user's request
2. Break it down into sub-tasks
3. Assign tasks to the appropriate agents
4. Synthesize all information into a coherent response
5. Deliver the final answer to the user
You are thoughtful, strategic, and efficient.""",
            llm_config={"config_list": self.config_list}
        )
        
        researcher = autogen.AssistantAgent(
            name="Researcher",
            system_message="""You are the researcher agent. Your job is to:
1. Find and gather relevant information for the given query
2. Analyze the information and extract key insights
3. Provide comprehensive research findings
4. Be thorough, accurate, and cite sources where possible
You are detail-oriented, analytical, and precise.""",
            llm_config={"config_list": self.config_list}
        )
        
        planner = autogen.AssistantAgent(
            name="Planner",
            system_message="""You are the planner agent. Your job is to:
1. Create structured plans based on research findings
2. Break down complex problems into logical steps
3. Consider alternatives and prioritize approaches
4. Propose clear, actionable plans
You are organized, strategic, and forward-thinking.""",
            llm_config={"config_list": self.config_list}
        )
        
        executor = autogen.AssistantAgent(
            name="Executor",
            system_message="""You are the executor agent. Your job is to:
1. Implement plans created by the planner
2. Write code, create content, or execute other deliverables
3. Debug and improve implementations
4. Deliver polished final results
You are practical, detail-oriented, and results-focused.""",
            llm_config={"config_list": self.config_list}
        )
        
        # Create the group chat
        groupchat = autogen.GroupChat(
            agents=[user_proxy, coordinator, researcher, planner, executor],
            messages=[],
            max_round=50
        )
        
        manager = autogen.GroupChatManager(
            groupchat=groupchat,
            llm_config={"config_list": self.config_list}
        )
        
        return {
            "user_proxy": user_proxy,
            "coordinator": coordinator,
            "researcher": researcher,
            "planner": planner,
            "executor": executor,
            "groupchat": groupchat,
            "manager": manager
        }
    
    async def process_request(self, request_content: str):
        """Process a user request using AutoGen"""
        agents = await self.create_agents()
        
        # Create a task for tracking
        if self.task_callback:
            coordinator_task = await self.task_callback("coordinator-1", "Process user request and coordinate agents")
        
        # Log that the coordinator received the request
        if self.trace_callback:
            await self.trace_callback("coordinator-1", "received_request", f"Received: {request_content}")
        
        # Set up the initial messages
        if self.message_callback:
            await self.message_callback("user", "coordinator-1", request_content)
        
        # Start the conversation
        user_proxy = agents["user_proxy"]
        await user_proxy.initiate_chat(
            agents["manager"],
            message=request_content
        )
        
        # Update the coordinator task
        if self.task_update_callback and coordinator_task:
            await self.task_update_callback(coordinator_task["id"], "completed", "Request processed")
        
        # Return all messages from the conversation
        return agents["groupchat"].messages
    
    def _get_agent_id(self, agent_name: str) -> str:
        """Convert agent name to agent ID for frontend compatibility"""
        name_to_id = {
            "User": "user",
            "Coordinator": "coordinator-1",
            "Researcher": "researcher-1",
            "Planner": "planner-1",
            "Executor": "executor-1"
        }
        return name_to_id.get(agent_name, "unknown")

# Example usage
async def example():
    manager = AutoGenManager()
    
    async def print_message(sender, recipient, message):
        print(f"Message from {sender} to {recipient}: {message}")
    
    manager.register_callbacks(message_cb=print_message)
    
    await manager.process_request("Create a marketing plan for a new mobile app")

if __name__ == "__main__":
    asyncio.run(example())
