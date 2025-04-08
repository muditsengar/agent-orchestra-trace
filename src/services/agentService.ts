
import { v4 as uuidv4 } from 'uuid';
import { Agent, Message, Trace, AgentTask, UserRequest } from '../types/agent';
import { agents, getAgentById, getAgentByRole } from '../data/agents';

// Simulate delays for realistic trace generation
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AgentService {
  private messages: Message[] = [];
  private traces: Trace[] = [];
  private tasks: AgentTask[] = [];
  private userRequests: UserRequest[] = [];
  private processingRequest: boolean = false;
  private onUpdateCallbacks: (() => void)[] = [];

  constructor() {}

  registerUpdateCallback(callback: () => void) {
    this.onUpdateCallbacks.push(callback);
  }

  unregisterUpdateCallback(callback: () => void) {
    this.onUpdateCallbacks = this.onUpdateCallbacks.filter(cb => cb !== callback);
  }

  private triggerUpdate() {
    this.onUpdateCallbacks.forEach(cb => cb());
  }

  getAgents(): Agent[] {
    return agents;
  }

  getMessages(): Message[] {
    return this.messages;
  }

  getTraces(): Trace[] {
    return this.traces;
  }

  getTasks(): AgentTask[] {
    return this.tasks;
  }

  getUserRequests(): UserRequest[] {
    return this.userRequests;
  }

  isProcessing(): boolean {
    return this.processingRequest;
  }

  private addMessage(from: string, to: string, content: string, type: 'request' | 'response' | 'internal', metadata?: Record<string, any>): Message {
    const message: Message = {
      id: uuidv4(),
      from,
      to,
      content,
      timestamp: new Date(),
      type,
      metadata
    };
    this.messages.push(message);
    this.triggerUpdate();
    return message;
  }

  private addTrace(agentId: string, action: string, details: string, relatedMessageIds?: string[]): Trace {
    const trace: Trace = {
      id: uuidv4(),
      agentId,
      action,
      details,
      timestamp: new Date(),
      relatedMessageIds
    };
    this.traces.push(trace);
    this.triggerUpdate();
    return trace;
  }

  private addTask(assignedTo: string, description: string, parentTaskId?: string): AgentTask {
    const task: AgentTask = {
      id: uuidv4(),
      assignedTo,
      description,
      status: 'pending',
      createdAt: new Date(),
      parentTaskId
    };
    this.tasks.push(task);
    this.triggerUpdate();
    return task;
  }

  private updateTask(taskId: string, updates: Partial<AgentTask>) {
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
      this.triggerUpdate();
    }
  }

  async submitUserRequest(content: string): Promise<UserRequest> {
    if (this.processingRequest) {
      throw new Error('Already processing a request. Please wait for completion.');
    }

    this.processingRequest = true;

    const userRequest: UserRequest = {
      id: uuidv4(),
      content,
      timestamp: new Date(),
      status: 'processing'
    };
    
    this.userRequests.push(userRequest);
    this.triggerUpdate();

    // Initiate the multi-agent process
    this.addMessage('user', 'coordinator-1', content, 'request');
    this.addTrace('coordinator-1', 'received_request', `User requested: ${content}`);

    try {
      await this.simulateAgentCollaboration(content, userRequest.id);
      
      // Update request status
      const requestIndex = this.userRequests.findIndex(req => req.id === userRequest.id);
      if (requestIndex !== -1) {
        this.userRequests[requestIndex].status = 'completed';
        
        // Find the final response from executor to user
        const finalResponse = this.messages
          .filter(m => m.to === 'user' && m.type === 'response')
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        
        if (finalResponse) {
          this.userRequests[requestIndex].result = finalResponse.content;
        }
      }
    } catch (error) {
      const requestIndex = this.userRequests.findIndex(req => req.id === userRequest.id);
      if (requestIndex !== -1) {
        this.userRequests[requestIndex].status = 'failed';
        this.userRequests[requestIndex].result = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } finally {
      this.processingRequest = false;
      this.triggerUpdate();
    }

    return userRequest;
  }

  private async simulateAgentCollaboration(userRequest: string, requestId: string): Promise<void> {
    // Step 1: Coordinator analyzes the request and creates tasks for other agents
    await delay(1500);
    this.addTrace('coordinator-1', 'analyzing_request', 'Breaking down user request into subtasks');
    
    // Create tasks for researcher
    const researchTask = this.addTask('researcher-1', 'Gather necessary information based on user query');
    this.addMessage('coordinator-1', 'researcher-1', 
      `Please research the following query and gather relevant information: "${userRequest}"`, 
      'internal');
    
    // Researcher works on the task
    await delay(2000);
    this.addTrace('researcher-1', 'research_started', 'Beginning information gathering', [researchTask.id]);
    this.updateTask(researchTask.id, { status: 'in-progress' });
    
    await delay(3000);
    const researchResults = `Research findings for "${userRequest}":\n` + 
      "- Found relevant data point 1\n" +
      "- Found relevant insight 2\n" +
      "- Discovered related concept 3";
    this.addTrace('researcher-1', 'research_completed', 'Completed information gathering', [researchTask.id]);
    this.updateTask(researchTask.id, { 
      status: 'completed', 
      completedAt: new Date(),
      result: researchResults 
    });
    this.addMessage('researcher-1', 'coordinator-1', researchResults, 'internal');
    
    // Step 2: Planner creates a plan based on research
    const planningTask = this.addTask('planner-1', 'Create execution plan based on research findings');
    this.addMessage('coordinator-1', 'planner-1', 
      `Please create an execution plan based on this research: ${researchResults}`, 
      'internal');
    
    await delay(2500);
    this.addTrace('planner-1', 'planning_started', 'Creating execution plan', [planningTask.id]);
    this.updateTask(planningTask.id, { status: 'in-progress' });
    
    await delay(2500);
    const plan = `Plan for "${userRequest}":\n` + 
      "1. First action item\n" +
      "2. Second action item\n" +
      "3. Integration steps\n" +
      "4. Final compilation";
    this.addTrace('planner-1', 'planning_completed', 'Completed execution plan', [planningTask.id]);
    this.updateTask(planningTask.id, { 
      status: 'completed', 
      completedAt: new Date(),
      result: plan 
    });
    this.addMessage('planner-1', 'coordinator-1', plan, 'internal');
    
    // Step 3: Executor implements the plan
    const executionTask = this.addTask('executor-1', 'Execute plan and generate final response');
    this.addMessage('coordinator-1', 'executor-1', 
      `Please execute this plan and generate a final response: ${plan}`, 
      'internal');
    
    await delay(2000);
    this.addTrace('executor-1', 'execution_started', 'Implementing solution', [executionTask.id]);
    this.updateTask(executionTask.id, { status: 'in-progress' });
    
    await delay(3000);
    const executionResult = `Final solution for "${userRequest}":\n\n` + 
      "Based on our comprehensive analysis, here is your solution:\n\n" +
      "1. Key finding: [Details from research]\n" +
      "2. Recommended approach: [Strategy from plan]\n" +
      "3. Implementation steps: [Actionable steps]\n\n" +
      "This solution integrates all relevant factors and provides a complete response to your request.";
    this.addTrace('executor-1', 'execution_completed', 'Completed implementation', [executionTask.id]);
    this.updateTask(executionTask.id, { 
      status: 'completed', 
      completedAt: new Date(),
      result: executionResult 
    });
    this.addMessage('executor-1', 'coordinator-1', executionResult, 'internal');
    
    // Step 4: Coordinator reviews and delivers final response
    await delay(1500);
    this.addTrace('coordinator-1', 'reviewing_solution', 'Reviewing and finalizing solution');
    
    await delay(1000);
    this.addTrace('coordinator-1', 'solution_approved', 'Approved final solution');
    this.addMessage('coordinator-1', 'executor-1', 'Solution approved. Please deliver to user.', 'internal');
    
    // Final response to user
    await delay(1000);
    this.addMessage('executor-1', 'user', executionResult, 'response');
    this.addTrace('executor-1', 'response_delivered', 'Final response delivered to user');
  }

  // Used for testing - clears all data
  clearData() {
    this.messages = [];
    this.traces = [];
    this.tasks = [];
    this.userRequests = [];
    this.processingRequest = false;
    this.triggerUpdate();
  }
}

// Singleton instance
export const agentService = new AgentService();
