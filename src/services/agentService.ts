
import { v4 as uuidv4 } from 'uuid';
import { Agent, Message, Trace, AgentTask, UserRequest } from '../types/agent';
import { agents, getAgentById, getAgentByRole } from '../data/agents';
import { toast } from '@/components/ui/sonner';
import { autogenAdapter } from './autogenAdapter';
import { rasaAdapter } from './rasaAdapter';

// Simulate delays for realistic trace generation
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Framework type for multi-agent processing
type Framework = 'native' | 'autogen' | 'langchain' | 'rasa';

class AgentService {
  private messages: Message[] = [];
  private traces: Trace[] = [];
  private tasks: AgentTask[] = [];
  private userRequests: UserRequest[] = [];
  private processingRequest: boolean = false;
  private onUpdateCallbacks: (() => void)[] = [];
  private activeFramework: Framework = 'native';
  private currentConversationId: string | null = null;

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

  // Set active framework for processing requests
  setFramework(framework: Framework): Framework {
    this.activeFramework = framework;
    return this.activeFramework;
  }

  // Get active framework
  getActiveFramework(): Framework {
    return this.activeFramework;
  }

  // Toggle AutoGen framework
  toggleAutogen(enable: boolean): boolean {
    if (enable) {
      this.activeFramework = 'autogen';
      // Connect to AutoGen backend when enabled
      autogenAdapter.connect();
    } else {
      this.activeFramework = 'native';
    }
    return this.activeFramework === 'autogen';
  }

  // Toggle LangChain framework
  toggleLangChain(enable: boolean): boolean {
    if (enable) {
      this.activeFramework = 'langchain';
      // In a real implementation, we would connect to a LangChain backend here
    } else {
      this.activeFramework = 'native';
    }
    return this.activeFramework === 'langchain';
  }

  // Toggle Rasa framework
  toggleRasa(enable: boolean): boolean {
    if (enable) {
      this.activeFramework = 'rasa';
      // Connect to Rasa backend when enabled
      rasaAdapter.connect();
    } else {
      this.activeFramework = 'native';
    }
    return this.activeFramework === 'rasa';
  }

  isUsingAutogen(): boolean {
    return this.activeFramework === 'autogen';
  }

  isUsingLangChain(): boolean {
    return this.activeFramework === 'langchain';
  }
  
  isUsingRasa(): boolean {
    return this.activeFramework === 'rasa';
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

    try {
      // Process based on selected framework
      if (this.activeFramework === 'autogen' && await autogenAdapter.connect()) {
        // Process request using AutoGen
        await this.processWithAutogen(content, userRequest.id);
      } else if (this.activeFramework === 'langchain') {
        // Process with simulated LangChain
        this.addMessage('user', 'coordinator-1', content, 'request');
        this.addTrace('coordinator-1', 'received_request', `User requested: ${content} (using LangChain)`);
        await this.simulateLangChainProcess(content, userRequest.id);
      } else if (this.activeFramework === 'rasa' && await rasaAdapter.connect()) {
        // Process with Rasa
        await this.processWithRasa(content, userRequest.id);
      } else {
        // Process with our simulated agent collaboration
        this.addMessage('user', 'coordinator-1', content, 'request');
        this.addTrace('coordinator-1', 'received_request', `User requested: ${content}`);
        await this.simulateAgentCollaboration(content, userRequest.id);
      }
      
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
      toast.error(error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      this.processingRequest = false;
      this.triggerUpdate();
    }

    return userRequest;
  }

  // Process request using Microsoft AutoGen
  private async processWithAutogen(userRequest: string, requestId: string): Promise<void> {
    try {
      // Create a new AutoGen conversation if needed
      if (!this.currentConversationId) {
        this.currentConversationId = await autogenAdapter.createConversation();
        if (!this.currentConversationId) {
          throw new Error("Failed to create AutoGen conversation");
        }
      }
      
      // Add initial user message
      this.addMessage('user', 'coordinator-1', userRequest, 'request');
      this.addTrace('coordinator-1', 'received_request', `User requested: ${userRequest} (using AutoGen)`);
      
      // Send to AutoGen and process response
      const result = await autogenAdapter.sendMessage(this.currentConversationId, userRequest);
      
      if (result) {
        // Add generated messages to our system
        result.messages.forEach(msg => {
          // Skip messages already in our system (like the initial user message)
          if (msg.sender !== 'user') {
            this.addMessage(
              this.convertAutoGenAgentToId(msg.sender),
              this.convertAutoGenAgentToId(msg.recipient),
              msg.content,
              msg.recipient === 'user' ? 'response' : 'internal'
            );
          }
        });
        
        // Add traces
        result.traces.forEach(trace => {
          this.traces.push(trace);
        });
        
        // Add tasks
        result.tasks.forEach(task => {
          this.tasks.push(task);
        });
        
        this.triggerUpdate();
      } else {
        throw new Error("AutoGen processing failed");
      }
    } catch (error) {
      console.error("AutoGen processing error:", error);
      throw new Error(`AutoGen error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process request using Rasa
  private async processWithRasa(userRequest: string, requestId: string): Promise<void> {
    try {
      // Create a new Rasa conversation if needed
      if (!this.currentConversationId) {
        this.currentConversationId = await rasaAdapter.createConversation();
        if (!this.currentConversationId) {
          throw new Error("Failed to create Rasa conversation");
        }
      }
      
      // Add initial user message
      this.addMessage('user', 'coordinator-1', userRequest, 'request');
      this.addTrace('coordinator-1', 'received_request', `User requested: ${userRequest} (using Rasa)`);
      
      // Send to Rasa and process response
      const result = await rasaAdapter.sendMessage(this.currentConversationId, userRequest);
      
      if (result) {
        // Add generated messages to our system
        result.messages.forEach(msg => {
          // Skip messages already in our system (like the initial user message)
          if (msg.sender !== 'user') {
            this.addMessage(
              this.convertRasaAgentToId(msg.sender),
              this.convertRasaAgentToId(msg.recipient),
              msg.content,
              msg.recipient === 'user' ? 'response' : 'internal'
            );
          }
        });
        
        // Add traces
        result.traces.forEach(trace => {
          this.traces.push(trace);
        });
        
        // Add tasks
        result.tasks.forEach(task => {
          this.tasks.push(task);
        });
        
        this.triggerUpdate();
      } else {
        throw new Error("Rasa processing failed");
      }
    } catch (error) {
      console.error("Rasa processing error:", error);
      throw new Error(`Rasa error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Convert AutoGen agent names to our internal agent IDs
  private convertAutoGenAgentToId(agentName: string): string {
    switch (agentName) {
      case 'UserProxyAgent': return 'coordinator-1';
      case 'ResearchAssistant': return 'researcher-1';
      case 'PlanningAgent': return 'planner-1';
      case 'ExecutionAgent': return 'executor-1';
      case 'user': return 'user';
      default: return agentName;
    }
  }

  // Convert Rasa agent names to our internal agent IDs
  private convertRasaAgentToId(agentName: string): string {
    switch (agentName) {
      case 'CoordinatorAgent': return 'coordinator-1';
      case 'ResearchAgent': return 'researcher-1';
      case 'PlannerAgent': return 'planner-1';
      case 'ExecutionAgent': return 'executor-1';
      case 'user': return 'user';
      default: return agentName;
    }
  }

  // Simulate LangChain agent collaboration for detailed responses
  private async simulateLangChainProcess(userRequest: string, requestId: string): Promise<void> {
    // Step 1: Coordinator analyzes request with LangChain
    await delay(1200);
    this.addTrace('coordinator-1', 'analyzing_request', 'Detailed analysis of user query using LangChain');
    
    // Create research task
    const researchTask = this.addTask('researcher-1', 'Conduct comprehensive research on user query using multiple sources');
    this.addMessage('coordinator-1', 'researcher-1', 
      `Please conduct detailed research on: "${userRequest}" using multiple knowledge bases and sources`, 
      'internal');
    
    // Researcher works
    await delay(1800);
    this.addTrace('researcher-1', 'research_started', 'Beginning comprehensive information gathering with LangChain agents', [researchTask.id]);
    this.updateTask(researchTask.id, { status: 'in-progress' });
    
    await delay(2200);
    
    // Determine if this is a job search query
    const isJobSearch = userRequest.toLowerCase().includes('job') || 
                        userRequest.toLowerCase().includes('laid off') ||
                        userRequest.toLowerCase().includes('career') ||
                        userRequest.toLowerCase().includes('developer');
    
    let researchResults = '';
    
    if (isJobSearch && userRequest.toLowerCase().includes('android')) {
      // Provide detailed Android developer job search research
      researchResults = `LangChain Research Results for "${userRequest}":\n\n` +
        "1. Current Android Developer Market Analysis:\n" +
        "   - Global demand for Android developers increased by 18% in last 6 months\n" +
        "   - Average time-to-hire for senior Android positions: 47 days\n" +
        "   - Remote positions constitute 46% of all Android openings\n" +
        "   - Key hiring regions: US (West Coast), Europe (Germany, UK), India, Southeast Asia\n\n" +
        "2. Technical Requirements Trend Analysis:\n" +
        "   - Kotlin proficiency mentioned in 94% of job postings (up from 78% last year)\n" +
        "   - Jetpack Compose experience required in 67% of senior positions\n" +
        "   - Architecture skills (MVVM, Clean Architecture) critical for all senior roles\n" +
        "   - Testing expertise increasingly important (mentioned in 89% of listings)\n\n" +
        "3. Interview Process Intelligence:\n" +
        "   - Average interview process: 3.4 rounds for senior Android developers\n" +
        "   - Technical assessments focus on: system design, architecture decisions, coding challenges\n" +
        "   - 72% of companies require portfolio review or code sample submission\n\n" +
        "4. Compensation Insights:\n" +
        "   - Median compensation (US): $145,000 base + benefits\n" +
        "   - Equity increasingly common in startup offers (78% include options)\n" +
        "   - Remote position compensation: typically 5-15% lower than on-site\n\n" +
        "5. Job Search Effectiveness Analysis:\n" +
        "   - Most effective channels: LinkedIn (37%), specialized job boards (29%), referrals (24%)\n" +
        "   - Applications with customized materials: 3.8x more likely to receive response\n" +
        "   - Optimal application timing: 30-40 quality applications over 4-6 weeks";
    } else {
      // Generic research results
      researchResults = `LangChain Research Results for "${userRequest}":\n\n` +
        "- Comprehensive analysis from multiple data sources\n" +
        "- Identified key factors with statistical significance\n" +
        "- Discovered emerging trends in the problem domain\n" +
        "- Synthesized findings from 12+ relevant case studies";
    }
    
    this.addTrace('researcher-1', 'research_completed', 'Completed comprehensive information gathering with LangChain', [researchTask.id]);
    this.updateTask(researchTask.id, { 
      status: 'completed', 
      completedAt: new Date(),
      result: researchResults 
    });
    this.addMessage('researcher-1', 'coordinator-1', researchResults, 'internal');
    
    // Step 2: Planner creates a detailed plan based on research
    const planningTask = this.addTask('planner-1', 'Create detailed step-by-step plan with day-by-day breakdown');
    this.addMessage('coordinator-1', 'planner-1', 
      `Please create a detailed execution plan based on this research: ${researchResults}`, 
      'internal');
    
    await delay(1800);
    this.addTrace('planner-1', 'planning_started', 'Creating detailed execution plan with day-by-day breakdown', [planningTask.id]);
    this.updateTask(planningTask.id, { status: 'in-progress' });
    
    await delay(2500);
    
    let plan = '';
    
    if (isJobSearch && userRequest.toLowerCase().includes('android')) {
      // Detailed Android developer job search plan
      plan = `30-Day Senior Android Developer Job Search Plan with Daily Breakdown:\n\n` +
        "WEEK 1: PREPARATION & POSITIONING\n\n" +
        
        "Day 1: Skills Assessment & Environment Setup\n" +
        "- Morning: Complete professional technical skills assessment (Android/Kotlin/Java)\n" +
        "- Afternoon: Set up job search tracking system in Notion/Trello/Excel\n" +
        "- Evening: Create dedicated email for job applications\n\n" +
        
        "Day 2: Resume Modernization\n" +
        "- Morning: Update resume with modern Android development focus (Kotlin, Jetpack)\n" +
        "- Afternoon: Create ATS-friendly version for online applications\n" +
        "- Evening: Create visually appealing version for direct contacts\n\n" +
        
        "Day 3: Portfolio Foundation\n" +
        "- Morning: Audit GitHub repositories, clean up/archive outdated projects\n" +
        "- Afternoon: Update READMEs with clear architecture explanations\n" +
        "- Evening: Plan portfolio website or update existing one\n\n" +
        
        "Day 4: Portfolio Development\n" +
        "- Full day: Begin implementation of small demo app showcasing Jetpack Compose\n" +
        "- Focus on: MVVM architecture, clean code principles, testing\n\n" +
        
        "Day 5: LinkedIn Optimization\n" +
        "- Morning: Update LinkedIn profile (new photo, headline, experience descriptions)\n" +
        "- Afternoon: Request 3+ recommendations from former colleagues\n" +
        "- Evening: Join Android development groups and communities\n\n" +
        
        "Day 6: Market Research\n" +
        "- Morning: Research 20 target companies actively hiring Android developers\n" +
        "- Afternoon: Document their tech stacks, products, culture\n" +
        "- Evening: Create priority ranking system for applications\n\n" +
        
        "Day 7: Network Activation\n" +
        "- Morning: Create outreach templates for different connection types\n" +
        "- Afternoon: Contact 5-7 former colleagues for referrals\n" +
        "- Evening: Schedule 2-3 virtual coffees for next week\n\n" +

        "WEEK 2: TECHNICAL PREPARATION & INITIAL APPLICATIONS\n\n" +
        
        "Day 8: Technical Refresher - Kotlin\n" +
        "- Morning: Review Kotlin coroutines and Flow\n" +
        "- Afternoon: Complete 3-4 Kotlin coding challenges\n" +
        "- Evening: Document key learnings in technical notes\n\n" +
        
        "Day 9: Technical Refresher - Jetpack Compose\n" +
        "- Morning: Complete Jetpack Compose codelab\n" +
        "- Afternoon: Add Compose UI to portfolio project\n" +
        "- Evening: Research latest Compose best practices\n\n" +
        
        "Day 10: Technical Refresher - Architecture\n" +
        "- Morning: Review MVVM and Clean Architecture principles\n" +
        "- Afternoon: Implement architecture improvements in portfolio project\n" +
        "- Evening: Document architectural decisions in README\n\n" +
        
        "Day 11: Job Search Setup\n" +
        "- Morning: Create job search email alerts across multiple platforms\n" +
        "- Afternoon: Register on specialized tech job boards\n" +
        "- Evening: Follow key Android recruiters on LinkedIn\n\n" +
        
        "Day 12: Cover Letter & Application Materials\n" +
        "- Morning: Create master cover letter template with customizable sections\n" +
        "- Afternoon: Prepare answers to common application questions\n" +
        "- Evening: Research salary ranges for negotiation preparation\n\n" +
        
        "Day 13: Initial Applications - Tier 1\n" +
        "- Morning: Research 5 top-priority companies in depth\n" +
        "- Afternoon: Submit 5 highly customized applications\n" +
        "- Evening: Connect with employees at target companies\n\n" +
        
        "Day 14: Network Development\n" +
        "- Morning: Attend virtual Android meetup or webinar\n" +
        "- Afternoon: Participate in relevant GitHub discussions\n" +
        "- Evening: Schedule additional networking calls\n\n" +

        "WEEK 3: APPLICATION MOMENTUM & INTERVIEW PREPARATION\n\n" +
        
        "Day 15: Applications - Tier 2\n" +
        "- Morning: Research 5 more target companies\n" +
        "- Afternoon: Submit 5 customized applications\n" +
        "- Evening: Follow up on previous applications\n\n" +
        
        "Day 16: Technical Interview Preparation\n" +
        "- Morning: Complete 5 Android-specific coding challenges\n" +
        "- Afternoon: Study system design for mobile applications\n" +
        "- Evening: Practice whiteboarding solutions\n\n" +
        
        "Day 17: Portfolio Project Completion\n" +
        "- Morning: Finalize demo app functionality\n" +
        "- Afternoon: Add comprehensive tests\n" +
        "- Evening: Create presentation highlighting technical decisions\n\n" +
        
        "Day 18: Behavioral Interview Preparation\n" +
        "- Morning: Prepare STAR stories for key experiences\n" +
        "- Afternoon: Practice responses to layoff questions\n" +
        "- Evening: Research behavioral questions for Android roles\n\n" +
        
        "Day 19: Applications - Tier 3\n" +
        "- Morning: Research additional companies\n" +
        "- Afternoon: Submit 5 more applications\n" +
        "- Evening: Personalize LinkedIn connection requests\n\n" +
        
        "Day 20: Mock Technical Interview\n" +
        "- Morning: Arrange technical mock interview with peer\n" +
        "- Afternoon: Complete interview and gather feedback\n" +
        "- Evening: Create improvement plan based on feedback\n\n" +
        
        "Day 21: Progress Assessment\n" +
        "- Morning: Analyze application response rates\n" +
        "- Afternoon: Adjust strategy based on results\n" +
        "- Evening: Plan focused activities for week 4\n\n" +

        "WEEK 4: INTERVIEW EXCELLENCE & OFFER NEGOTIATION\n\n" +
        
        "Day 22: Advanced Technical Preparation\n" +
        "- Morning: Practice complex Android system design\n" +
        "- Afternoon: Review performance optimization techniques\n" +
        "- Evening: Create notes on architectural trade-offs\n\n" +
        
        "Day 23: Applications - Final Push\n" +
        "- Morning: Research remaining target companies\n" +
        "- Afternoon: Submit final batch of 5 applications\n" +
        "- Evening: Follow up on all outstanding applications\n\n" +
        
        "Day 24: Interview Environment Setup\n" +
        "- Morning: Set up optimal video interview environment\n" +
        "- Afternoon: Practice with interview recording\n" +
        "- Evening: Prepare questions for interviewers\n\n" +
        
        "Day 25: Specialized Technical Practice\n" +
        "- Morning: Focus on company-specific technologies\n" +
        "- Afternoon: Review latest Android features\n" +
        "- Evening: Practice explaining technical decisions\n\n" +
        
        "Day 26: Salary Negotiation Preparation\n" +
        "- Morning: Research detailed compensation data\n" +
        "- Afternoon: Practice negotiation scenarios\n" +
        "- Evening: Create decision matrix for evaluating offers\n\n" +
        
        "Day 27: 30/60/90 Day Plan Creation\n" +
        "- Full day: Create detailed 30/60/90 day plan templates\n" +
        "- Customize for different potential roles\n\n" +
        
        "Day 28: Final Portfolio Review\n" +
        "- Morning: Get feedback on all application materials\n" +
        "- Afternoon: Make final improvements\n" +
        "- Evening: Update online presence with latest work\n\n" +
        
        "Day 29: Process Systemization\n" +
        "- Morning: Document effective job search techniques\n" +
        "- Afternoon: Improve tracking and follow-up system\n" +
        "- Evening: Plan continuous networking strategy\n\n" +
        
        "Day 30: Progress Evaluation & Extension Planning\n" +
        "- Morning: Comprehensive review of all job search metrics\n" +
        "- Afternoon: Celebrate progress and achievements\n" +
        "- Evening: Create extended plan for weeks 5-8 if needed";
    } else {
      // Generic plan
      plan = `Detailed Plan for "${userRequest}":\n\n` + 
        "Week 1: Initial Assessment and Foundation\n" +
        "- Day 1: [Specific activities and goals]\n" +
        "- Day 2: [Detailed implementation steps]\n" +
        "- Day 3-5: [Progressive action items with metrics]\n\n" +
        "Week 2: Core Implementation\n" +
        "- Day-by-day breakdown with specific milestones\n" +
        "- Resource allocation and dependency management\n\n" +
        "Weeks 3-4: Refinement and Evaluation\n" +
        "- Specific success metrics and adjustment strategy\n" +
        "- Contingency plans for common obstacles";
    }
    
    this.addTrace('planner-1', 'planning_completed', 'Completed detailed day-by-day execution plan', [planningTask.id]);
    this.updateTask(planningTask.id, { 
      status: 'completed', 
      completedAt: new Date(),
      result: plan 
    });
    this.addMessage('planner-1', 'coordinator-1', plan, 'internal');
    
    // Step 3: Executor creates actionable implementation
    const executionTask = this.addTask('executor-1', 'Create detailed implementation with specific examples and templates');
    this.addMessage('coordinator-1', 'executor-1', 
      `Please create detailed implementation with specific examples for this plan: ${plan}`, 
      'internal');
    
    await delay(2000);
    this.addTrace('executor-1', 'execution_started', 'Creating detailed implementation with specific examples', [executionTask.id]);
    this.updateTask(executionTask.id, { status: 'in-progress' });
    
    await delay(3000);
    
    let executionResult = '';
    
    if (isJobSearch && userRequest.toLowerCase().includes('android')) {
      // Provide detailed implementation for Android developer job search
      const techSkillsTemplate = 
        "ANDROID CORE SKILLS ASSESSMENT:\n" +
        "- Android Lifecycle Management: __/5\n" +
        "- UI Implementation (XML): __/5\n" +
        "- Jetpack Compose: __/5\n" +
        "- Kotlin Proficiency: __/5\n" +
        "- Java Proficiency: __/5\n" +
        "- Architecture (MVVM/Clean): __/5\n" +
        "- Testing Expertise: __/5\n" +
        "- Performance Optimization: __/5\n" +
        "- Dependency Injection: __/5\n" +
        "- API Integration: __/5\n" +
        "- Database (Room/SQLite): __/5\n" +
        "- Concurrency (Coroutines): __/5";

      const technicalExpertise = 
        "TECHNICAL EXPERTISE\n" +
        "• Programming: Kotlin (Advanced, 5+ years), Java (Expert, 8+ years)\n" +
        "• UI Development: Jetpack Compose, ConstraintLayout, Material Design Components\n" +
        "• Architecture: MVVM, Clean Architecture with Use Cases, MVI\n" +
        "• Asynchronous Programming: Coroutines, Flow, StateFlow/SharedFlow\n" +
        "• Dependency Injection: Hilt, Dagger2, Koin\n" +
        "• Networking: Retrofit, OkHttp, Apollo GraphQL\n" +
        "• Local Storage: Room, SQLite, DataStore, Encrypted Preferences\n" +
        "• Image Loading: Coil, Glide\n" +
        "• Testing: JUnit, Mockito, Espresso, Robolectric, MockK, Turbine\n" +
        "• CI/CD: GitHub Actions, Bitrise, Jenkins\n" +
        "• App Performance: Memory optimization, custom view performance, StrictMode\n" +
        "• App Security: Encryption, secure networking, obfuscation";

      const readmeTemplate =
        "# Android Project Name\n\n" +
        "## Overview\n" +
        "Brief description of what the app does and what problem it solves.\n\n" +
        "## Architecture\n" +
        "This application implements Clean Architecture with MVVM presentation layer:\n" +
        "- Domain Layer: Business logic and use cases\n" +
        "- Data Layer: Repository implementations and data sources\n" +
        "- Presentation Layer: ViewModels, Jetpack Compose UI, and state management\n\n" +
        "## Technical Highlights\n" +
        "- 100% Kotlin implementation\n" +
        "- Jetpack Compose UI with Material 3 design\n" +
        "- Unidirectional data flow with StateFlow/SharedFlow\n" +
        "- Dependency injection with Hilt\n" +
        "- Coroutines & Flow for asynchronous operations\n" +
        "- Navigation component for screen transitions\n" +
        "- Comprehensive test coverage\n" +
        "- Modular architecture for scalability\n\n" +
        "## Screenshots\n" +
        "[Include 2-3 screenshots or GIFs demonstrating key features]\n\n" +
        "## Core Features\n" +
        "- Feature 1 with technical description\n" +
        "- Feature 2 with technical description\n" +
        "- ...\n\n" +
        "## Libraries Used\n" +
        "- [List key libraries and why they were chosen]\n\n" +
        "## Performance Considerations\n" +
        "- [Describe specific optimizations implemented]\n\n" +
        "## Getting Started\n" +
        "[Instructions for building and running the project]";

      const linkedinTemplate = 
        "Senior Android developer with [X] years of experience crafting high-quality mobile applications using Kotlin and modern Android practices.\n\n" +
        "Technical expertise:\n" +
        "• Modern Android development with Jetpack components\n" +
        "• UI implementation with Jetpack Compose\n" +
        "• Clean Architecture & MVVM implementation\n" +
        "• Performance optimization & memory management\n" +
        "• Leading development teams and mentoring\n\n" +
        "I specialize in building [type of apps] that prioritize [user experience/performance/stability]. My approach combines architectural best practices with pragmatic solutions to deliver exceptional mobile experiences.\n\n" +
        "Currently seeking new opportunities to create impactful Android applications with forward-thinking teams.";

      const companyResearchTemplate = 
        "COMPANY: [Name]\n" +
        "Products: [Key Android products]\n" +
        "Tech Stack: [Known Android technologies based on job listings/GitHub]\n" +
        "Team Size: [If available]\n" +
        "Funding Status: [Public/Series X/Bootstrap]\n" +
        "Interview Process: [Based on Glassdoor or similar]\n" +
        "Key Engineers: [Android team leads if identifiable]\n" +
        "Values/Culture: [Based on website/social media]\n" +
        "Recent News: [Product launches, funding, etc.]\n" +
        "Why I'm Interested: [Specific aspects that appeal to you]\n" +
        "Potential Connections: [People you know at the company]\n" +
        "Application Strategy: [Direct/Referral/Custom approach]";

      const coverLetterTemplate =
        "My technical expertise aligns perfectly with [Company]'s Android development needs:\n\n" +
        "• Modern Android Development: I've implemented [specific technology from job posting] in [previous project], resulting in [measurable outcome]. My experience with Jetpack Compose has enabled me to create [specific UI benefit].\n\n" +
        "• Architecture Expertise: At [Previous Company], I led the implementation of Clean Architecture with MVVM presentation layer, resulting in a 40% reduction in bug reports and significantly improved development velocity.\n\n" +
        "• Performance Optimization: I reduced app startup time by 65% by implementing [specific technique], and optimized memory usage across complex screens with large datasets.\n\n" +
        "• Leadership: I've mentored junior developers through architecture design sessions and code reviews, helping them grow into independent contributors capable of leading feature development.";

      const starMethodExample =
        "Question: Tell me about a challenging project and how you overcame obstacles.\n\n" +
        "Situation: At [Company], we needed to redesign our e-commerce app which had grown organically and suffered from performance issues, crashes, and poor user experience. It had a 3.2 star rating and increasing user complaints.\n\n" +
        "Task: As Senior Android Developer, I was tasked with leading the architectural redesign while maintaining feature parity and minimizing disruption for our 500,000 monthly active users.\n\n" +
        "Action:\n" +
        "1. Conducted comprehensive analysis of performance bottlenecks using Android Profiler\n" +
        "2. Created migration plan with phased approach to reduce risk\n" +
        "3. Implemented Clean Architecture with clear separation of concerns\n" +
        "4. Rebuilt core components using modern Jetpack libraries\n" +
        "5. Set up comprehensive testing suite with unit, integration and UI tests\n" +
        "6. Mentored team of 4 developers through the transition\n" +
        "7. Implemented feature flags to gradually roll out changes\n\n" +
        "Result: After 4 months, we successfully relaunched with:\n" +
        "- 85% crash reduction\n" +
        "- 74% faster app startup\n" +
        "- 40% reduction in ANR reports\n" +
        "- App store rating improved from 3.2 to 4.6 stars\n" +
        "- Development velocity increased with new features shipping 30% faster";

      const dayPlanTemplate =
        "# My 30-60-90 Day Plan as Senior Android Developer at [Company]\n\n" +
        "## First 30 Days: Learning & Integration\n" +
        "- Complete comprehensive onboarding process and set up development environment\n" +
        "- Build and run all existing Android applications\n" +
        "- Review architecture documentation and understand current codebase structure\n" +
        "- Meet with all team members and key stakeholders to understand roles and workflows\n" +
        "- Identify immediate pain points in the development process or codebase\n" +
        "- Begin contributing by fixing 3-5 small bugs to understand development workflow\n" +
        "- Document findings and create initial improvement proposals\n\n" +
        "SPECIFIC MEASURABLE GOALS:\n" +
        "1. Complete setup of all development tools and gain access to necessary systems\n" +
        "2. Successfully push at least 3 bug fixes to production\n" +
        "3. Create comprehensive documentation of current architecture and workflows\n" +
        "4. Identify at least 2 quick wins for improving development process";

      executionResult = `# DETAILED SENIOR ANDROID DEVELOPER JOB SEARCH IMPLEMENTATION GUIDE

## WEEK 1: DETAILED IMPLEMENTATION EXAMPLES

### DAY 1: SKILLS ASSESSMENT & ENVIRONMENT SETUP

**Technical Skills Self-Assessment Template:**
\`\`\`
${techSkillsTemplate}
\`\`\`

**Job Search Tracker Setup:**
Create a Notion database with these columns:
- Company Name
- Position Title
- Technology Focus
- Application Date
- Application Method (Direct/LinkedIn/etc.)
- Materials Submitted (Resume Version/Cover Letter)
- Contact Person
- Follow-up Status (None/1st/2nd)
- Interview Stage (None/Phone/Technical/Final)
- Notes
- Priority (High/Medium/Low)
- Compensation Range
- Status (Preparing/Applied/Rejected/In Progress/Offer/Declined)

### DAY 2: RESUME MODERNIZATION

**Senior Android Developer Resume - Technical Skills Section Example:**
\`\`\`
${technicalExpertise}
\`\`\`

**Resume Achievement Bullets (With Metrics):**
- "Redesigned app architecture using MVVM and Clean Architecture principles, reducing crash rate by 87% and improving Play Store rating from 3.4 to 4.7 stars"
- "Led migration from Java to Kotlin, reducing codebase size by 30% while improving readability and maintainability"
- "Implemented comprehensive test suite achieving 85% code coverage, reducing regression bugs by 73%"
- "Optimized app startup time from 3.2s to 0.9s by implementing custom initialization sequence"
- "Mentored 4 junior developers through structured code reviews and architecture discussions"

### DAY 3-4: PORTFOLIO DEVELOPMENT

**GitHub Project README Template:**
\`\`\`markdown
${readmeTemplate}
\`\`\`

**Portfolio Demo App Concept:**
Create a "TechJobTracker" app with these features:
- Jetpack Compose UI with animations
- Job listing screen with filtering (Remote/Onsite, Experience Level)
- Job detail screen with company information
- Application status tracking with notifications
- Interview preparation notes section
- Skills tracking and enhancement planning
- Dark/light theme implementation
- Material 3 dynamic theming

### DAY 5: LINKEDIN OPTIMIZATION

**LinkedIn Headline Options:**
- "Senior Android Developer | Kotlin Expert | Building exceptional mobile experiences with modern architecture"
- "Android Engineering Leader | Jetpack Compose | MVVM/Clean Architecture | Performance Optimization"

**LinkedIn About Section Template:**
\`\`\`
${linkedinTemplate}
\`\`\`

### DAY 6-7: MARKET RESEARCH & NETWORKING

**Company Research Template:**
\`\`\`
${companyResearchTemplate}
\`\`\`

## WEEK 2: TECHNICAL PREPARATION EXAMPLES

### DAY 8-10: TECHNICAL REFRESHERS

**Kotlin Coroutines Practice Exercise:**
Implement a GitHub repository browser that:
1. Searches repositories using the GitHub API
2. Uses coroutines for network operations
3. Implements proper error handling
4. Shows loading states with StateFlow
5. Caches results using Room
6. Implements pagination with Paging 3

**Jetpack Compose UI Practice Components:**
1. Custom Material 3 theme implementation
2. Animated transitions between screens
3. Complex list with different item types
4. Form input with validation
5. Error handling and retry mechanisms

### DAY 11-14: JOB SEARCH SETUP & INITIAL APPLICATIONS

**Cover Letter Template - Technical Details Section:**
\`\`\`
${coverLetterTemplate}
\`\`\`

**Application Customization Checklist:**
For each application, customize:
- Resume skills section to highlight relevant technologies
- Portfolio links to showcase relevant projects
- Cover letter with company-specific details
- LinkedIn connection request to team members
- Research questions specific to the company
- Follow-up schedule based on company response times

## WEEKS 3-4: DETAILED APPLICATION & INTERVIEW PREPARATION

### TECHNICAL INTERVIEW PREPARATION

**System Design Question Example:**
Design a video streaming app for Android with these requirements:
- Support offline viewing
- Adaptive quality based on connection
- Picture-in-picture mode
- Social sharing features
- Personalized recommendations

Prepare:
1. Architecture diagram showing major components
2. Data flow diagrams for key user journeys
3. Local storage strategy for offline content
4. Background processing approach
5. Handling device rotation and configuration changes
6. Memory and battery optimization strategies

**Coding Interview Practice Plan:**
1. Implement RecyclerView with complex layouts (multi-viewtype)
2. Create custom Views with canvas drawing
3. Write unit tests for Repository pattern
4. Implement search with debounce using Flow
5. Create pagination with Paging 3 library
6. Implement offline-first architecture with Room

**Behavioral Interview Response Example (STAR Method):**
\`\`\`
${starMethodExample}
\`\`\`

### SALARY NEGOTIATION PREPARATION

**Salary Negotiation Script:**
\`\`\`
"Thank you for the offer. I'm excited about the opportunity to join [Company] and contribute to [specific project/product].

Based on my research into the market rates for senior Android developers with my experience level, and considering my specific expertise in [key skills that match their needs], I was hoping for a base salary closer to [target salary range].

My background in [specific valuable skill from job description] and track record of [relevant achievement] demonstrates the value I can bring to the team from day one. Would you have flexibility to adjust the base compensation to better reflect my experience level and the value I can bring to [Company]?"

[If they can't meet salary requirements]
"I understand there may be constraints on the compensation. Perhaps we could discuss other components of the package, such as signing bonus, equity, or performance bonuses that might help bridge the gap?"
\`\`\`

**30-60-90 Day Plan Example - Entry Section:**
\`\`\`
${dayPlanTemplate}
\`\`\`

## ACTION PLAN SUMMARY

This implementation guide provides actionable examples and templates for each phase of your 30-day job search plan. The detailed samples are designed to be easily adapted to your specific situation and preferences. Focus on completing daily activities while remaining flexible enough to prioritize interview opportunities as they arise.

Remember that the job search process requires consistent effort across multiple fronts:
1. Application materials that highlight your unique strengths
2. Technical preparation for rigorous interviews
3. Networking to uncover hidden opportunities
4. Portfolio projects that demonstrate your expertise
5. Interview practice that builds confidence

By following this structured approach with daily specific actions, you'll maximize your chances of securing an excellent senior Android developer role that matches your career goals.`;
    } else {
      // Generic implementation
      executionResult = `Detailed Implementation for "${userRequest}":\n\n` + 
        "Based on our comprehensive analysis, here is your fully detailed implementation plan with specific steps and examples:\n\n" +
        "1. First Action Area - Complete Implementation\n   - Specific step-by-step instructions\n   - Example templates and code samples\n   - Key success metrics and evaluation criteria\n\n" +
        "2. Second Action Area - Complete Implementation\n   - Detailed procedural guide\n   - Resource allocation framework\n   - Implementation timeline with dependencies\n\n" +
        "3. Comprehensive Guidelines\n   - Troubleshooting approaches\n   - Advanced implementation variations\n   - Long-term maintenance strategy\n\n" +
        "This solution addresses all aspects of your request with specific, actionable guidance and detailed examples.";
    }
    
    this.addTrace('executor-1', 'execution_completed', 'Completed detailed implementation with specific examples', [executionTask.id]);
    this.updateTask(executionTask.id, { 
      status: 'completed', 
      completedAt: new Date(),
      result: executionResult 
    });
    this.addMessage('executor-1', 'coordinator-1', executionResult, 'internal');
    
    // Step 4: Coordinator reviews and delivers final response
    await delay(1500);
    this.addTrace('coordinator-1', 'reviewing_solution', 'Reviewing comprehensive solution');
    
    await delay(1200);
    this.addTrace('coordinator-1', 'solution_approved', 'Approved comprehensive detailed solution');
    this.addMessage('coordinator-1', 'executor-1', 'Solution approved. Please deliver the comprehensive response to the user.', 'internal');
    
    // Final response to user
    await delay(1000);
    this.addMessage('executor-1', 'user', executionResult, 'response');
    this.addTrace('executor-1', 'response_delivered', 'Comprehensive detailed response delivered to user');
  }

  // Original simulate function (unchanged)
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
    this.currentConversationId = null;
    this.triggerUpdate();
  }
}

// Singleton instance
export const agentService = new AgentService();
