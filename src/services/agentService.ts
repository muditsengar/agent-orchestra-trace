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

  private constructor() {}

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
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
        await this.simulateLangChain(content);
      } else if (this.useRasa) {
        await this.processWithRasa(content);
      } else {
        await this.simulateNative(content);
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
        await this.simulateDirectMessageWithLangChain(agentId, content);
      } else if (this.useRasa) {
        await this.processDirectMessageWithRasa(agentId, content);
      } else {
        await this.simulateDirectMessageNative(agentId, content);
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
      const response = await autogenAdapter.sendMessage(this.conversationId, content);
      
      if (!response) {
        throw new Error('No response from AutoGen');
      }
      
      // Process AutoGen messages
      for (const msg of response.messages) {
        this.messages.push({
          id: uuidv4(),
          from: msg.sender,
          to: msg.recipient,
          content: msg.content,
          timestamp: msg.timestamp,
          type: msg.recipient === 'user' ? 'response' : 'internal'
        });
      }
      
      // Process traces
      for (const trace of response.traces) {
        this.traces.push(trace);
      }
      
      // Process tasks
      for (const task of response.tasks) {
        this.tasks.push(task);
      }
      
      this.notifyUpdate();
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
      const response = await autogenAdapter.sendMessage(this.conversationId, directedContent);
      
      if (!response) {
        throw new Error('No response from AutoGen');
      }
      
      // Process AutoGen messages - modify them to show they're responses to the direct message
      for (const msg of response.messages) {
        // If this is from the target agent or to the target agent, process it
        if (msg.sender === agentId || msg.recipient === agentId) {
          this.messages.push({
            id: uuidv4(),
            from: msg.sender,
            to: msg.recipient,
            content: msg.content,
            timestamp: msg.timestamp,
            type: msg.recipient === 'user' ? 'response' : 'internal'
          });
        }
      }
      
      // Process relevant traces
      for (const trace of response.traces) {
        if (trace.agentId === agentId) {
          this.traces.push(trace);
        }
      }
      
      // Process relevant tasks
      for (const task of response.tasks) {
        if (task.assignedTo === agentId) {
          this.tasks.push(task);
        }
      }
      
      this.notifyUpdate();
    } catch (error) {
      console.error('Error in AutoGen direct message processing:', error);
      throw error;
    }
  }

  private async processWithRasa(content: string): Promise<void> {
    try {
      // We would implement Rasa integration here
      // For now, use the simulated version
      await this.simulateRasa(content);
    } catch (error) {
      console.error('Error in Rasa processing:', error);
      throw error;
    }
  }

  private async processDirectMessageWithRasa(agentId: string, content: string): Promise<void> {
    try {
      // We would implement Rasa direct message integration here
      // For now, use the simulated version
      await this.simulateDirectMessageWithRasa(agentId, content);
    } catch (error) {
      console.error('Error in Rasa direct message processing:', error);
      throw error;
    }
  }

  private async simulateLangChain(content: string): Promise<void> {
    // Simulate LangChain processing with delays
    this.addTrace('coordinator-1', 'simulating_langchain', 'Simulating LangChain processing');
    
    // Create an agent task
    const task: AgentTask = {
      id: uuidv4(),
      assignedTo: 'coordinator-1',
      description: `Process user request: ${content}`,
      status: 'pending',
      createdAt: new Date()
    };
    
    this.tasks.push(task);
    this.notifyUpdate();
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update task status
    const taskIndex = this.tasks.findIndex(t => t.id === task.id);
    if (taskIndex >= 0) {
      this.tasks[taskIndex].status = 'in-progress';
      this.notifyUpdate();
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add agent response
    const response = `I've analyzed your request and broken it down into a day-by-day plan. Here's what I recommend:

Day 1: [Actionable step]
Day 2: [Actionable step]
Day 3: [Actionable step]
...

This plan should help you achieve your goal step by step.`;
    
    const responseMessage: Message = {
      id: uuidv4(),
      from: 'coordinator-1',
      to: 'user',
      content: response,
      timestamp: new Date(),
      type: 'response'
    };
    
    this.messages.push(responseMessage);
    
    // Update task status
    if (taskIndex >= 0) {
      this.tasks[taskIndex].status = 'completed';
      this.tasks[taskIndex].completedAt = new Date();
      this.tasks[taskIndex].result = 'Completed simulated LangChain processing';
      this.notifyUpdate();
    }
    
    // Add trace
    this.addTrace('coordinator-1', 'simulated_langchain_response', 'Sent simulated LangChain response to user');
  }

  private async simulateDirectMessageWithLangChain(agentId: string, content: string): Promise<void> {
    // Add a trace
    this.addTrace(agentId, 'direct_message_received', `Direct message from user: ${content}`);
    
    // Create an agent task
    const task: AgentTask = {
      id: uuidv4(),
      assignedTo: agentId,
      description: `Process direct request from user: ${content}`,
      status: 'pending',
      createdAt: new Date()
    };
    
    this.tasks.push(task);
    this.notifyUpdate();
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update task status
    const taskIndex = this.tasks.findIndex(t => t.id === task.id);
    if (taskIndex >= 0) {
      this.tasks[taskIndex].status = 'in-progress';
      this.notifyUpdate();
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add agent response
    const response = `I've received your direct message and analyzed it carefully. Here's my response based on my specialized capabilities:

${this.getAgentSpecificResponse(agentId, content)}

Is there anything specific you'd like me to elaborate on or any follow-up actions you'd like me to take?`;
    
    const responseMessage: Message = {
      id: uuidv4(),
      from: agentId,
      to: 'user',
      content: response,
      timestamp: new Date(),
      type: 'response'
    };
    
    this.messages.push(responseMessage);
    
    // Update task status
    if (taskIndex >= 0) {
      this.tasks[taskIndex].status = 'completed';
      this.tasks[taskIndex].completedAt = new Date();
      this.tasks[taskIndex].result = 'Completed direct response to user';
      this.notifyUpdate();
    }
    
    // Add trace
    this.addTrace(agentId, 'direct_message_response_sent', 'Sent direct response to user');
  }

  private async simulateRasa(content: string): Promise<void> {
    // Simulate Rasa processing with delays
    this.addTrace('coordinator-1', 'simulating_rasa', 'Simulating Rasa processing');
    
    // Create an agent task
    const task: AgentTask = {
      id: uuidv4(),
      assignedTo: 'coordinator-1',
      description: `Process user request with Rasa: ${content}`,
      status: 'pending',
      createdAt: new Date()
    };
    
    this.tasks.push(task);
    this.notifyUpdate();
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update task status
    const taskIndex = this.tasks.findIndex(t => t.id === task.id);
    if (taskIndex >= 0) {
      this.tasks[taskIndex].status = 'in-progress';
      this.notifyUpdate();
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add agent response
    const response = `I've analyzed your request and created a comprehensive plan with daily activities and detailed examples. Here's what I recommend:

Day 1: [Activity with example]
Day 2: [Activity with example]
Day 3: [Activity with example]
...

This plan should help you achieve your goal with clear, actionable steps.`;
    
    const responseMessage: Message = {
      id: uuidv4(),
      from: 'coordinator-1',
      to: 'user',
      content: response,
      timestamp: new Date(),
      type: 'response'
    };
    
    this.messages.push(responseMessage);
    
    // Update task status
    if (taskIndex >= 0) {
      this.tasks[taskIndex].status = 'completed';
      this.tasks[taskIndex].completedAt = new Date();
      this.tasks[taskIndex].result = 'Completed simulated Rasa processing';
      this.notifyUpdate();
    }
    
    // Add trace
    this.addTrace('coordinator-1', 'simulated_rasa_response', 'Sent simulated Rasa response to user');
  }

  private async simulateDirectMessageWithRasa(agentId: string, content: string): Promise<void> {
    await this.simulateDirectMessageWithLangChain(agentId, content);
  }

  private async simulateNative(content: string): Promise<void> {
    // Simulate native multi-agent processing with delays
    this.addTrace('coordinator-1', 'simulating_native', 'Simulating native multi-agent processing');
    
    // Create an agent task
    const task: AgentTask = {
      id: uuidv4(),
      assignedTo: 'coordinator-1',
      description: `Process user request natively: ${content}`,
      status: 'pending',
      createdAt: new Date()
    };
    
    this.tasks.push(task);
    this.notifyUpdate();
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update task status
    const taskIndex = this.tasks.findIndex(t => t.id === task.id);
    if (taskIndex >= 0) {
      this.tasks[taskIndex].status = 'in-progress';
      this.notifyUpdate();
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add agent response
    const response = `I've analyzed your request and coordinated with the agents. Here's the solution we've come up with:

[Solution details]

This should address all aspects of your request.`;
    
    const responseMessage: Message = {
      id: uuidv4(),
      from: 'coordinator-1',
      to: 'user',
      content: response,
      timestamp: new Date(),
      type: 'response'
    };
    
    this.messages.push(responseMessage);
    
    // Update task status
    if (taskIndex >= 0) {
      this.tasks[taskIndex].status = 'completed';
      this.tasks[taskIndex].completedAt = new Date();
      this.tasks[taskIndex].result = 'Completed simulated native processing';
      this.notifyUpdate();
    }
    
    // Add trace
    this.addTrace('coordinator-1', 'simulated_native_response', 'Sent simulated native response to user');
  }

  private async simulateDirectMessageNative(agentId: string, content: string): Promise<void> {
    await this.simulateDirectMessageWithLangChain(agentId, content);
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

  private getAgentSpecificResponse(agentId: string, query: string): string {
    switch (agentId) {
      case 'coordinator-1':
        return `As the Coordinator, I've analyzed your request and determined the best approach. 
I'll coordinate with the other agents to ensure we address all aspects of "${query}".`;
      
      case 'researcher-1':
        return `As the Researcher, I've gathered information related to "${query}". 
My analysis shows several relevant data points that can help address your needs.`;
      
      case 'planner-1':
        return `As the Planner, I've developed a structured approach to address "${query}". 
The plan includes key milestones and consideration of potential challenges.`;
      
      case 'executor-1':
        return `As the Executor, I'm ready to implement solutions for "${query}". 
I can provide specific actionable steps based on the research and planning that's been done.`;
      
      default:
        return `I've analyzed your request regarding "${query}" and am ready to assist further.`;
    }
  }
}

export const agentService = AgentService.getInstance();
