
import { v4 as uuidv4 } from 'uuid';
import { Message, Trace, AgentTask } from '../types/agent';
import { autogenAdapter } from './autogenAdapter';
import { rasaAdapter } from './rasaAdapter';

type UpdateCallback = () => void;

class AgentService {
  private static instance: AgentService | null = null;
  
  private messages: Message[] = [];
  private traces: Trace[] = [];
  private tasks: AgentTask[] = [];
  private processing: boolean = false;
  private updateCallbacks: UpdateCallback[] = [];
  private conversationId: string | null = null;
  
  private useAutogen: boolean = false;
  private useLangChain: boolean = false;
  private useRasa: boolean = false;
  private currentFramework: 'native' | 'autogen' | 'langchain' | 'rasa' = 'native';

  private constructor() {
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

  private handleNewMessages(messages: Message[]): void {
    const validatedMessages = messages.map(msg => ({
      ...msg,
      type: this.validateMessageType(msg.type)
    }));
    
    this.messages = [...this.messages, ...validatedMessages];
    this.notifyUpdate();
  }

  private handleNewTraces(traces: Trace[]): void {
    this.traces = [...this.traces, ...traces];
    this.notifyUpdate();
  }

  private handleNewTasks(tasks: AgentTask[]): void {
    const updatedTasks = [...this.tasks];
    
    tasks.forEach(newTask => {
      const existingTaskIndex = updatedTasks.findIndex(t => t.id === newTask.id);
      if (existingTaskIndex >= 0) {
        updatedTasks[existingTaskIndex] = newTask;
      } else {
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
      
      if (this.useAutogen) {
        await this.processWithAutogen(content);
      } else if (this.useLangChain) {
        this.addTrace('coordinator-1', 'langchain_not_implemented', 'LangChain processing is not implemented yet');
      } else if (this.useRasa) {
        await this.processWithRasa(content);
      } else {
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
      
      if (this.useAutogen) {
        await this.processDirectMessageWithAutogen(agentId, content);
      } else if (this.useLangChain) {
        this.addTrace(agentId, 'direct_message_received', `Direct message from user: ${content}`);
        this.addTrace(agentId, 'langchain_not_implemented', 'LangChain direct messaging is not implemented yet');
      } else if (this.useRasa) {
        await this.processDirectMessageWithRasa(agentId, content);
      } else {
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
      if (!this.conversationId) {
        this.conversationId = await autogenAdapter.createConversation();
      }
      
      if (!this.conversationId) {
        throw new Error('Failed to create AutoGen conversation');
      }
      
      await autogenAdapter.sendMessage(this.conversationId, content);
      
    } catch (error) {
      console.error('Error in AutoGen processing:', error);
      throw error;
    }
  }

  private async processDirectMessageWithAutogen(agentId: string, content: string): Promise<void> {
    try {
      if (!this.conversationId) {
        this.conversationId = await autogenAdapter.createConversation();
      }
      
      if (!this.conversationId) {
        throw new Error('Failed to create AutoGen conversation');
      }
      
      const directedContent = `[DIRECT MESSAGE TO ${agentId}] ${content}`;
      await autogenAdapter.sendMessage(this.conversationId, directedContent);
      
    } catch (error) {
      console.error('Error in AutoGen direct message processing:', error);
      throw error;
    }
  }

  private async processWithRasa(content: string): Promise<void> {
    try {
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
        if (response.messages && response.messages.length > 0) {
          const formattedMessages = response.messages.map(msg => ({
            id: uuidv4(),
            from: msg.sender || 'rasa-agent',
            to: msg.recipient || 'user',
            content: msg.content,
            timestamp: new Date(),
            // Since msg.type doesn't exist in the RasaAdapter's message objects,
            // we'll pass 'response' as the default message type
            type: 'response' as 'response' | 'request' | 'internal'
          }));
          
          this.handleNewMessages(formattedMessages);
        }
        
        if (response.traces && response.traces.length > 0) {
          this.handleNewTraces(response.traces);
        }
        
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
      const rasaConnected = await rasaAdapter.isBackendConnected();
      if (!rasaConnected) {
        await rasaAdapter.connect();
      }
      
      const conversationId = await rasaAdapter.createConversation();
      if (!conversationId) {
        throw new Error('Failed to create Rasa conversation');
      }
      
      const directedContent = `[DIRECT MESSAGE TO ${agentId}] ${content}`;
      const response = await rasaAdapter.sendMessage(conversationId, directedContent);
      
      if (response) {
        if (response.messages && response.messages.length > 0) {
          const formattedMessages = response.messages.map(msg => ({
            id: uuidv4(),
            from: msg.sender || agentId,
            to: msg.recipient || 'user',
            content: msg.content,
            timestamp: new Date(),
            // Since msg.type doesn't exist in the RasaAdapter's message objects,
            // we'll pass 'response' as the default message type
            type: 'response' as 'response' | 'request' | 'internal'
          }));
          
          this.handleNewMessages(formattedMessages);
        }
        
        if (response.traces && response.traces.length > 0) {
          this.handleNewTraces(response.traces);
        }
        
        if (response.tasks && response.tasks.length > 0) {
          this.handleNewTasks(response.tasks);
        }
      }
    } catch (error) {
      console.error('Error in Rasa direct message processing:', error);
      throw error;
    }
  }

  private validateMessageType(type: string): 'response' | 'request' | 'internal' {
    if (type === 'response' || type === 'request' || type === 'internal') {
      return type;
    }
    return 'response';
  }

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
