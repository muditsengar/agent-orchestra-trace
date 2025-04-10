
import { v4 as uuidv4 } from 'uuid';
import { Message, Trace, AgentTask } from '../types/agent';
import { autogenAdapter } from './autogenAdapter';
import { rasaAdapter } from './rasaAdapter';

// Define the type for the callback function
type UpdateCallback = () => void;

class AgentService {
  private static instance: AgentService | null = null;
  
  private messages: Message[] = [];
  private traces: Trace[] = [];
  private tasks: AgentTask[] = [];
  private processing: boolean = false;
  private updateCallbacks: UpdateCallback[] = [];
  private conversationId: string | null = null;
  
  // Framework flags
  private useAutogen: boolean = false;
  private useLangChain: boolean = false;
  private useRasa: boolean = false;
  private currentFramework: 'native' | 'autogen' | 'langchain' | 'rasa' = 'native';

  private constructor() {
    // Register for updates from autogenAdapter
    autogenAdapter.registerMessageCallback(this.handleNewMessages.bind(this));
    autogenAdapter.registerTraceCallback(this.handleNewTraces.bind(this));
    autogenAdapter.registerTaskCallback(this.handleNewTasks.bind(this));
  }

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  // Handler for new messages from AutoGen
  private handleNewMessages(messages: Message[]): void {
    this.messages = [...this.messages, ...messages];
    this.notifyUpdate();
  }

  // Handler for new traces from AutoGen
  private handleNewTraces(traces: Trace[]): void {
    this.traces = [...this.traces, ...traces];
    this.notifyUpdate();
  }

  // Handler for new tasks from AutoGen
  private handleNewTasks(tasks: AgentTask[]): void {
    // Check if we need to update existing tasks or add new ones
    const updatedTasks = [...this.tasks];
    
    tasks.forEach(newTask => {
      const existingTaskIndex = updatedTasks.findIndex(t => t.id === newTask.id);
      if (existingTaskIndex >= 0) {
        // Update existing task
        updatedTasks[existingTaskIndex] = newTask;
      } else {
        // Add new task
        updatedTasks.push(newTask);
      }
    });
    
    this.tasks = updatedTasks;
    this.notifyUpdate();
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public getTraces(): Trace[] {
    return this.traces;
  }

  public getTasks(): AgentTask[] {
    return this.tasks;
  }

  public isProcessing(): boolean {
    return this.processing;
  }

  public toggleAutogen(enabled: boolean): void {
    this.useAutogen = enabled;
    if (enabled) {
      this.currentFramework = 'autogen';
      this.useLangChain = false;
      this.useRasa = false;
    }
  }

  public toggleLangChain(enabled: boolean): void {
    this.useLangChain = enabled;
    if (enabled) {
      this.currentFramework = 'langchain';
      this.useAutogen = false;
      this.useRasa = false;
    }
  }

  public toggleRasa(enabled: boolean): void {
    this.useRasa = enabled;
    if (enabled) {
      this.currentFramework = 'rasa';
      this.useAutogen = false;
      this.useLangChain = false;
    }
  }

  public setFramework(framework: 'native' | 'autogen' | 'langchain' | 'rasa'): void {
    this.currentFramework = framework;
    this.useAutogen = framework === 'autogen';
    this.useLangChain = framework === 'langchain';
    this.useRasa = framework === 'rasa';
  }

  public registerUpdateCallback(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  public unregisterUpdateCallback(callback: UpdateCallback): void {
    this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => callback());
  }

  public async submitUserRequest(content: string): Promise<void> {
    try {
      this.processing = true;
      this.notifyUpdate();
      
      // Create a user message
      const userMessage: Message = {
        id: uuidv4(),
        from: 'user',
        to: 'coordinator-1',
        content: content,
        timestamp: new Date(),
        type: 'request'
      };
      
      this.messages.push(userMessage);
      this.notifyUpdate();
      
      // Process with the appropriate framework
      if (this.useAutogen) {
        await this.processWithAutogen(content);
      } else if (this.useLangChain) {
        // Not simulating LangChain anymore - just add a message that this is not implemented
        this.addTrace('coordinator-1', 'langchain_not_implemented', 'LangChain processing is not implemented yet');
      } else if (this.useRasa) {
        await this.processWithRasa(content);
      } else {
        // Not simulating Native anymore - just add a message that this is not implemented
        this.addTrace('coordinator-1', 'native_not_implemented', 'Native processing is not implemented yet');
      }
      
    } catch (error) {
      console.error('Error processing request:', error);
      this.addTrace('coordinator-1', 'error', `Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.processing = false;
      this.notifyUpdate();
    }
  }

  public async sendDirectMessage(agentId: string, content: string): Promise<void> {
    try {
      this.processing = true;
      this.notifyUpdate();
      
      // Create a user message to the specific agent
      const userMessage: Message = {
        id: uuidv4(),
        from: 'user',
        to: agentId,
        content: content,
        timestamp: new Date(),
        type: 'internal'
      };
      
      this.messages.push(userMessage);
      this.notifyUpdate();
      
      // Process with the appropriate framework
      if (this.useAutogen) {
        await this.processDirectMessageWithAutogen(agentId, content);
      } else if (this.useLangChain) {
        // Not simulating LangChain anymore
        this.addTrace(agentId, 'direct_message_received', `Direct message from user: ${content}`);
        this.addTrace(agentId, 'langchain_not_implemented', 'LangChain direct messaging is not implemented yet');
      } else if (this.useRasa) {
        await this.processDirectMessageWithRasa(agentId, content);
      } else {
        // Not simulating Native anymore
        this.addTrace(agentId, 'direct_message_received', `Direct message from user: ${content}`);
        this.addTrace(agentId, 'native_not_implemented', 'Native direct messaging is not implemented yet');
      }
      
    } catch (error) {
      console.error('Error processing direct message:', error);
      this.addTrace(agentId, 'error', `Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.processing = false;
      this.notifyUpdate();
    }
  }

  private async processWithAutogen(content: string): Promise<void> {
    try {
      // Create a conversation if not exists
      if (!this.conversationId) {
        this.conversationId = await autogenAdapter.createConversation();
      }
      
      if (!this.conversationId) {
        throw new Error('Failed to create AutoGen conversation');
      }
      
      // Send message to AutoGen
      await autogenAdapter.sendMessage(this.conversationId, content);
      
      // The responses will be handled by the registered callbacks
      
    } catch (error) {
      console.error('Error in AutoGen processing:', error);
      throw error;
    }
  }

  private async processDirectMessageWithAutogen(agentId: string, content: string): Promise<void> {
    try {
      // Create a conversation if not exists
      if (!this.conversationId) {
        this.conversationId = await autogenAdapter.createConversation();
      }
      
      if (!this.conversationId) {
        throw new Error('Failed to create AutoGen conversation');
      }
      
      // Add a trace
      this.addTrace(agentId, 'direct_message_received', `Direct message from user: ${content}`);
      
      // In a full implementation, this would send the message directly to the specific agent
      // For now, we'll simulate by using the existing sendMessage but adding context
      const directedContent = `[DIRECT MESSAGE TO ${agentId}] ${content}`;
      await autogenAdapter.sendMessage(this.conversationId, directedContent);
      
      // The responses will be handled by the registered callbacks
      
    } catch (error) {
      console.error('Error in AutoGen direct message processing:', error);
      throw error;
    }
  }

  private async processWithRasa(content: string): Promise<void> {
    try {
      // We would implement actual Rasa integration here
      const rasaConnected = await rasaAdapter.isBackendConnected();
      if (!rasaConnected) {
        await rasaAdapter.connect();
      }
      
      const conversationId = await rasaAdapter.createConversation();
      if (!conversationId) {
        throw new Error('Failed to create Rasa conversation');
      }
      
      const response = await rasaAdapter.sendMessage(conversationId, content);
      if (response) {
        // Process any messages received from Rasa
        if (response.messages && response.messages.length > 0) {
          const formattedMessages = response.messages.map(msg => ({
            id: uuidv4(),
            from: msg.sender || 'rasa-agent',
            to: msg.recipient || 'user',
            content: msg.content,
            timestamp: new Date(),
            type: 'response'
          }));
          
          this.handleNewMessages(formattedMessages);
        }
        
        // Process any traces received from Rasa
        if (response.traces && response.traces.length > 0) {
          this.handleNewTraces(response.traces);
        }
        
        // Process any tasks received from Rasa
        if (response.tasks && response.tasks.length > 0) {
          this.handleNewTasks(response.tasks);
        }
      }
    } catch (error) {
      console.error('Error in Rasa processing:', error);
      throw error;
    }
  }

  private async processDirectMessageWithRasa(agentId: string, content: string): Promise<void> {
    try {
      // We would implement actual Rasa direct message integration here
      const rasaConnected = await rasaAdapter.isBackendConnected();
      if (!rasaConnected) {
        await rasaAdapter.connect();
      }
      
      const conversationId = await rasaAdapter.createConversation();
      if (!conversationId) {
        throw new Error('Failed to create Rasa conversation');
      }
      
      // Add a trace
      this.addTrace(agentId, 'direct_message_received', `Direct message from user to ${agentId}: ${content}`);
      
      const directedContent = `[DIRECT MESSAGE TO ${agentId}] ${content}`;
      const response = await rasaAdapter.sendMessage(conversationId, directedContent);
      
      if (response) {
        // Process any messages received from Rasa
        if (response.messages && response.messages.length > 0) {
          const formattedMessages = response.messages.map(msg => ({
            id: uuidv4(),
            from: msg.sender || agentId,
            to: msg.recipient || 'user',
            content: msg.content,
            timestamp: new Date(),
            type: 'response'
          }));
          
          this.handleNewMessages(formattedMessages);
        }
        
        // Process any traces received from Rasa
        if (response.traces && response.traces.length > 0) {
          this.handleNewTraces(response.traces);
        }
        
        // Process any tasks received from Rasa
        if (response.tasks && response.tasks.length > 0) {
          this.handleNewTasks(response.tasks);
        }
      }
    } catch (error) {
      console.error('Error in Rasa direct message processing:', error);
      throw error;
    }
  }

  // Commented out all simulation methods
  /*
  private async simulateLangChain(content: string): Promise<void> {
    // Simulation code removed
  }

  private async simulateDirectMessageWithLangChain(agentId: string, content: string): Promise<void> {
    // Simulation code removed
  }

  private async simulateRasa(content: string): Promise<void> {
    // Simulation code removed
  }

  private async simulateDirectMessageWithRasa(agentId: string, content: string): Promise<void> {
    // Simulation code removed
  }

  private async simulateNative(content: string): Promise<void> {
    // Simulation code removed
  }

  private async simulateDirectMessageNative(agentId: string, content: string): Promise<void> {
    // Simulation code removed
  }

  private getAgentSpecificResponse(agentId: string, query: string): string {
    // Simulation code removed
    return '';
  }
  */

  private addTrace(agentId: string, action: string, details: string): void {
    const trace: Trace = {
      id: uuidv4(),
      agentId: agentId,
      action: action,
      details: details,
      timestamp: new Date()
    };
    
    this.traces.push(trace);
    this.notifyUpdate();
  }
}

export const agentService = AgentService.getInstance();
