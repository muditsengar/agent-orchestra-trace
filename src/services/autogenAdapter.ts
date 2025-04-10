
// This adapter integrates with Microsoft AutoGen through our Python backend
import { v4 as uuidv4 } from 'uuid';
import { Message, Trace, AgentTask } from '../types/agent';
import { toast } from '@/components/ui/sonner';

// Backend connection configuration
const BACKEND_URL = 'http://localhost:8000'; // Use environment variable in production

// Define AutoGen specific types
export interface AutoGenAgent {
  name: string;
  role: string;
  description: string;
}

export interface AutoGenMessage {
  sender: string;
  recipient: string;
  content: string;
  timestamp: Date;
}

export interface AutoGenConversation {
  id: string;
  agents: AutoGenAgent[];
  messages: AutoGenMessage[];
  status: 'initializing' | 'active' | 'completed' | 'error';
}

class AutoGenAdapter {
  private static instance: AutoGenAdapter;
  private conversations: Map<string, AutoGenConversation> = new Map();
  private isConnected: boolean = false;
  private websocket: WebSocket | null = null;
  private messageCallbacks: ((messages: Message[]) => void)[] = [];
  private traceCallbacks: ((traces: Trace[]) => void)[] = [];
  private taskCallbacks: ((tasks: AgentTask[]) => void)[] = [];
  private currentConversationId: string | null = null;

  private constructor() {}

  public static getInstance(): AutoGenAdapter {
    if (!AutoGenAdapter.instance) {
      AutoGenAdapter.instance = new AutoGenAdapter();
    }
    return AutoGenAdapter.instance;
  }

  // Check if connected to AutoGen backend
  public isBackendConnected(): boolean {
    return this.isConnected;
  }

  // Create a new conversation and return its ID
  public async createConversation(): Promise<string> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error("Cannot create conversation - not connected to backend");
        }
      }
      
      // Generate a unique ID for the conversation
      const conversationId = uuidv4();
      this.currentConversationId = conversationId;
      
      // Initialize an empty conversation
      this.conversations.set(conversationId, {
        id: conversationId,
        agents: [],
        messages: [],
        status: 'initializing'
      });
      
      console.log("Created new conversation with ID:", conversationId);
      return conversationId;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
      throw error;
    }
  }

  // Connect to AutoGen backend
  public async connect(): Promise<boolean> {
    try {
      // Check if backend is running
      const response = await fetch(`${BACKEND_URL}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Backend status check failed: ${response.status}`);
      }

      const status = await response.json();
      console.log("Backend status:", status);
      
      if (!status.autogen_installed) {
        toast.error("AutoGen is not installed on the backend");
        return false;
      }
      
      if (!status.openai_api_key_configured) {
        toast.error("OpenAI API key is not configured on the backend");
        return false;
      }

      // Connect to WebSocket for real-time updates
      this.connectWebSocket();
      
      this.isConnected = true;
      toast.success("Connected to AutoGen backend");
      return true;
    } catch (error) {
      console.error("Failed to connect to AutoGen backend:", error);
      toast.error("Failed to connect to AutoGen backend. Make sure the backend is running.");
      this.isConnected = false;
      return false;
    }
  }

  // Register callback for message updates
  public registerMessageCallback(callback: (messages: Message[]) => void): void {
    this.messageCallbacks.push(callback);
  }

  // Register callback for trace updates
  public registerTraceCallback(callback: (traces: Trace[]) => void): void {
    this.traceCallbacks.push(callback);
  }

  // Register callback for task updates
  public registerTaskCallback(callback: (tasks: AgentTask[]) => void): void {
    this.taskCallbacks.push(callback);
  }

  // Notify all message callbacks
  private notifyMessageCallbacks(messages: Message[]): void {
    this.messageCallbacks.forEach(callback => callback(messages));
  }

  // Notify all trace callbacks
  private notifyTraceCallbacks(traces: Trace[]): void {
    this.traceCallbacks.forEach(callback => callback(traces));
  }

  // Notify all task callbacks
  private notifyTaskCallbacks(tasks: AgentTask[]): void {
    this.taskCallbacks.forEach(callback => callback(tasks));
  }

  // Connect to WebSocket for real-time updates
  private connectWebSocket() {
    try {
      if (this.websocket) {
        this.websocket.close();
      }

      this.websocket = new WebSocket(`ws://localhost:8000/ws`);
      
      this.websocket.onopen = () => {
        console.log("WebSocket connection established");
        // Send ping to keep connection alive
        setInterval(() => {
          if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);
          
          // Handle different types of messages
          if (data.type === "pong") {
            console.log("Pong received from server");
          } else if (data.type === "message") {
            // Convert backend message format to frontend format
            const message: Message = {
              id: data.data.id,
              from: data.data.from,
              to: data.data.to,
              content: data.data.content,
              timestamp: new Date(data.data.timestamp * 1000), // Convert UNIX timestamp to Date
              type: data.data.type
            };
            this.notifyMessageCallbacks([message]);
          } else if (data.type === "trace") {
            // Convert backend trace format to frontend format
            const trace: Trace = {
              id: data.data.id,
              agentId: data.data.agentId,
              action: data.data.action,
              details: data.data.details,
              timestamp: new Date(data.data.timestamp * 1000) // Convert UNIX timestamp to Date
            };
            this.notifyTraceCallbacks([trace]);
          } else if (data.type === "task" || data.type === "task_update") {
            // Convert backend task format to frontend format
            const task: AgentTask = {
              id: data.data.id,
              assignedTo: data.data.assignedTo,
              description: data.data.description,
              status: data.data.status,
              createdAt: new Date(data.data.createdAt * 1000), // Convert UNIX timestamp to Date
              completedAt: data.data.completedAt ? new Date(data.data.completedAt * 1000) : undefined,
              result: data.data.result
            };
            this.notifyTaskCallbacks([task]);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnected = false;
        toast.error("WebSocket connection error");
      };
      
      this.websocket.onclose = () => {
        console.log("WebSocket connection closed");
        this.isConnected = false;
        // Try to reconnect after a delay
        setTimeout(() => this.connectWebSocket(), 5000);
      };
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
    }
  }

  // Submit a message to the backend AutoGen
  public async sendMessage(
    conversationId: string, 
    content: string
  ): Promise<{messages: AutoGenMessage[], traces: Trace[], tasks: AgentTask[]} | null> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error("Cannot send message - not connected to backend");
        }
      }

      // Store the current conversation ID
      this.currentConversationId = conversationId;

      // Send request to backend
      const response = await fetch(`${BACKEND_URL}/api/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          framework: "autogen"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Backend request failed: ${errorData.detail || response.statusText}`);
      }

      const result = await response.json();
      console.log("Backend request result:", result);

      // Create a new conversation to track this request
      if (!this.conversations.has(result.conversation_id)) {
        this.conversations.set(result.conversation_id, {
          id: result.conversation_id,
          agents: [],
          messages: [],
          status: 'active'
        });
      }

      // The actual messages will come through WebSocket
      // Return empty arrays for now
      return {
        messages: [],
        traces: [],
        tasks: []
      };
    } catch (error) {
      console.error("Error sending message to AutoGen backend:", error);
      toast.error("Failed to send message to AutoGen backend");
      return null;
    }
  }
}

export const autogenAdapter = AutoGenAdapter.getInstance();
