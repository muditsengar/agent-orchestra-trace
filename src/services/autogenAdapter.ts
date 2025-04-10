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
  private connectPromise: Promise<boolean> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  private constructor() {}

  public static getInstance(): AutoGenAdapter {
    if (!AutoGenAdapter.instance) {
      AutoGenAdapter.instance = new AutoGenAdapter();
    }
    return AutoGenAdapter.instance;
  }

  // Check if connected to AutoGen backend
  public isBackendConnected(): boolean {
    return this.isConnected && this.websocket?.readyState === WebSocket.OPEN;
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
    // If there's already a connection attempt in progress, return that promise
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise(async (resolve) => {
      try {
        // Check if backend is running
        const response = await fetch(`${BACKEND_URL}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`Backend status check failed: ${response.status}`);
          this.isConnected = false;
          resolve(false);
          return;
        }

        const status = await response.json();
        console.log("Backend status:", status);
        
        if (!status.autogen_installed) {
          toast.error("AutoGen is not installed on the backend");
          this.isConnected = false;
          resolve(false);
          return;
        }
        
        if (!status.openai_api_key_configured) {
          toast.error("OpenAI API key is not configured on the backend");
          this.isConnected = false;
          resolve(false);
          return;
        }

        // Connect to WebSocket for real-time updates
        await this.connectWebSocket();
        
        this.isConnected = true;
        toast.success("Connected to AutoGen backend");
        resolve(true);
      } catch (error) {
        console.error("Failed to connect to AutoGen backend:", error);
        toast.error("Failed to connect to AutoGen backend. Make sure the backend is running.");
        this.isConnected = false;
        resolve(false);
      } finally {
        this.connectPromise = null;
      }
    });

    return this.connectPromise;
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
    console.log("Notifying message callbacks with:", messages);
    this.messageCallbacks.forEach(callback => callback(messages));
  }

  // Notify all trace callbacks
  private notifyTraceCallbacks(traces: Trace[]): void {
    console.log("Notifying trace callbacks with:", traces);
    this.traceCallbacks.forEach(callback => callback(traces));
  }

  // Notify all task callbacks
  private notifyTaskCallbacks(tasks: AgentTask[]): void {
    console.log("Notifying task callbacks with:", tasks);
    this.taskCallbacks.forEach(callback => callback(tasks));
  }

  // Connect to WebSocket for real-time updates
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          console.log("WebSocket already connected");
          resolve();
          return;
        }

        if (this.websocket) {
          this.websocket.close();
        }

        this.websocket = new WebSocket(`ws://localhost:8000/ws`);
        
        this.websocket.onopen = () => {
          console.log("WebSocket connection established");
          this.reconnectAttempts = 0;
          this.isConnected = true;
          
          // Send ping to keep connection alive
          const pingInterval = setInterval(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
              this.websocket.send(JSON.stringify({ type: "ping" }));
            } else {
              clearInterval(pingInterval);
            }
          }, 30000);
          
          resolve();
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
                id: data.data.id || uuidv4(),
                from: data.data.from || data.data.sender || (data.data.from_agent || "unknown-agent"),
                to: data.data.to || data.data.recipient || (data.data.to_agent || "user"),
                content: data.data.content || "",
                timestamp: new Date(data.data.timestamp ? data.data.timestamp * 1000 : Date.now()), // Convert UNIX timestamp to Date or use current time
                type: data.data.type || 'response'
              };
              console.log("Processed message:", message);
              this.notifyMessageCallbacks([message]);
            } else if (data.type === "trace") {
              // Convert backend trace format to frontend format
              const trace: Trace = {
                id: data.data.id || uuidv4(),
                agentId: data.data.agentId || data.data.agent_id || "unknown-agent",
                action: data.data.action || "unknown-action",
                details: data.data.details || "",
                timestamp: new Date(data.data.timestamp ? data.data.timestamp * 1000 : Date.now()) // Convert UNIX timestamp to Date or use current time
              };
              this.notifyTraceCallbacks([trace]);
            } else if (data.type === "task" || data.type === "task_update") {
              // Convert backend task format to frontend format
              const task: AgentTask = {
                id: data.data.id || uuidv4(),
                assignedTo: data.data.assignedTo || data.data.agent_id || "unknown-agent",
                description: data.data.description || "",
                status: data.data.status || "pending",
                createdAt: new Date(data.data.createdAt ? data.data.createdAt * 1000 : Date.now()), // Convert UNIX timestamp to Date or use current time
                completedAt: data.data.completedAt ? new Date(data.data.completedAt * 1000) : undefined,
                result: data.data.result || undefined
              };
              this.notifyTaskCallbacks([task]);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error, "Raw message:", event.data);
          }
        };
        
        this.websocket.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.isConnected = false;
          reject(error);
        };
        
        this.websocket.onclose = (event) => {
          console.log(`WebSocket connection closed with code ${event.code}, reason: ${event.reason}`);
          this.isConnected = false;
          
          // Try to reconnect after a delay, with exponential backoff
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
            setTimeout(() => this.connectWebSocket(), delay);
          } else {
            console.log("Maximum reconnection attempts reached, giving up.");
            toast.error("Failed to maintain connection to backend after multiple attempts.");
          }
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        reject(error);
      }
    });
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

      console.log("Sending message to backend:", content);
      
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
        let errorMessage = `Backend request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = `Backend request failed: ${errorData.detail || response.statusText}`;
        } catch (e) {
          // If parsing JSON fails, use the original error message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Backend request result:", result);

      // Create a new conversation to track this request
      if (result.conversation_id && !this.conversations.has(result.conversation_id)) {
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
      toast.error(`Failed to send message to AutoGen backend: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}

export const autogenAdapter = AutoGenAdapter.getInstance();
