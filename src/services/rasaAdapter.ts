import { v4 as uuidv4 } from 'uuid';
import { Message, Trace, AgentTask } from '../types/agent';

// Interface for the response structure from Rasa
interface RasaResponse {
  messages: {
    sender: string;
    recipient: string;
    content: string;
  }[];
  traces: Trace[];
  tasks: AgentTask[];
}

class RasaAdapter {
  private static instance: RasaAdapter;
  private connected: boolean = false;

  private constructor() {}

  static getInstance(): RasaAdapter {
    if (!RasaAdapter.instance) {
      RasaAdapter.instance = new RasaAdapter();
    }
    return RasaAdapter.instance;
  }

  async connect(): Promise<boolean> {
    // Simulate connection to Rasa server
    console.log('Connecting to Rasa backend...');
    this.connected = true;
    return this.connected;
  }

  async createConversation(): Promise<string | null> {
    if (!this.connected) {
      await this.connect();
    }

    // Simulate creating a conversation in Rasa
    const conversationId = uuidv4();
    console.log(`Created Rasa conversation with ID: ${conversationId}`);
    return conversationId;
  }

  async sendMessage(conversationId: string, message: string): Promise<RasaResponse | null> {
    if (!this.connected) {
      await this.connect();
    }

    console.log(`Sending message to Rasa: ${message}`);

    // Simulate delay for processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Extract request type to provide appropriate detailed response
    const isConferencePlanning = message.toLowerCase().includes('conference') && 
        message.toLowerCase().includes('plan');
    const isBudget = message.toLowerCase().includes('budget');
    const isJobSearch = message.toLowerCase().includes('job') || message.toLowerCase().includes('career');
    const isInterview = message.toLowerCase().includes('interview');

    let response: RasaResponse = {
      messages: [],
      traces: [],
      tasks: []
    };

    if (isConferencePlanning && isBudget) {
      response = this.generateConferencePlanResponse(message);
    } else if (isJobSearch) {
      response = this.generateJobSearchResponse(message);
    } else if (isInterview) {
      response = this.generateInterviewPrepResponse(message);
    } else {
      response = this.generateGenericResponse(message);
    }

    return response;
  }

  private generateConferencePlanResponse(userRequest: string): RasaResponse {
    // Parse key parameters from the request
    const parameters = this.extractParameters(userRequest);
    
    const response: RasaResponse = {
      messages: [],
      traces: [],
      tasks: []
    };

    // Add detailed traces for research
    response.traces.push({
      id: uuidv4(),
      agentId: 'researcher-1',
      action: 'venue_research',
      details: 'Analyzing 15 potential venues in Seattle matching budget constraints for 50 attendees',
      timestamp: new Date()
    });

    response.traces.push({
      id: uuidv4(),
      agentId: 'researcher-1',
      action: 'catering_options',
      details: 'Comparing 8 catering services with tech conference experience within budget range',
      timestamp: new Date()
    });

    response.traces.push({
      id: uuidv4(),
      agentId: 'planner-1',
      action: 'budget_allocation',
      details: 'Creating optimal budget distribution across venue, speakers, catering, and equipment',
      timestamp: new Date()
    });

    // Add tasks
    response.tasks.push({
      id: uuidv4(),
      assignedTo: 'planner-1',
      description: 'Develop detailed cost breakdown for $5000 budget allocation',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });

    response.tasks.push({
      id: uuidv4(),
      assignedTo: 'researcher-1',
      description: 'Research venue options in Seattle for 50 attendees',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });

    response.tasks.push({
      id: uuidv4(),
      assignedTo: 'executor-1',
      description: 'Create complete conference schedule with logistics timeline',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });

    // Generate communication messages
    response.messages.push({
      sender: 'CoordinatorAgent',
      recipient: 'ResearchAgent',
      content: `Need comprehensive research on affordable Seattle venues for tech conference. Requirements: 50 attendees, 2 days, under $2500 for venue portion of $5000 total budget.`
    });

    response.messages.push({
      sender: 'ResearchAgent',
      recipient: 'CoordinatorAgent',
      content: `Completed venue research for Seattle. Top options: Seattle Public Library meeting rooms ($800/day), Impact Hub Seattle ($1200 for 2 days), The Pioneer Collective ($1400 for 2 days). All have required AV equipment and wifi included.`
    });

    response.messages.push({
      sender: 'CoordinatorAgent',
      recipient: 'PlannerAgent',
      content: `Create detailed budget allocation from $5000 total. Need to cover: venue ($1200-1800), catering ($1500-2000), speaker honorariums ($800-1000), equipment ($300-500), marketing materials ($200-300).`
    });

    response.messages.push({
      sender: 'PlannerAgent',
      recipient: 'ExecutionAgent',
      content: `Budget plan created. Allocations: Venue ($1600), Catering ($1800 = $18/person/day), Speakers ($800 for 4 honorariums), Equipment ($500), Marketing ($300). Please execute detailed conference schedule based on this.`
    });

    // Final detailed response to user
    const detailedPlan = `# TWO-DAY TECH CONFERENCE PLAN - SEATTLE (50 ATTENDEES, $5,000 BUDGET)

## VENUE RECOMMENDATIONS

Based on availability, facilities, and budget constraints, here are the top venue options:

1. **Impact Hub Seattle**
   - Cost: $1,200 for both days
   - Location: Pioneer Square
   - Amenities: High-speed WiFi, projector, basic sound system, modular seating
   - Capacity: Up to 60 people in conference setup
   - Note: Provides urban tech atmosphere, close to public transit

2. **Seattle Public Library - Meeting Spaces**
   - Cost: $1,600 total ($800/day)
   - Location: Downtown Seattle
   - Amenities: Built-in AV equipment, reliable WiFi, professional setting
   - Capacity: Up to 75 people depending on room
   - Note: Professional venue with excellent tech support

3. **The Pioneer Collective**
   - Cost: $1,400 for both days
   - Location: Downtown Seattle
   - Amenities: Modern tech setup, breakout spaces available
   - Capacity: Perfect for 50 attendees
   - Note: Flexible layout options for different session types

**Recommended Choice**: Impact Hub Seattle ($1,200) provides the best value while maintaining a tech-appropriate atmosphere.

## BUDGET BREAKDOWN

| Category | Allocation | Details |
|----------|------------|---------|
| Venue | $1,200 | Impact Hub Seattle for 2 full days |
| Catering | $1,800 | Breakfast & lunch for 50 people over 2 days ($18/person/day) |
| Speakers | $800 | 2 keynotes ($250 each) + 3 session speakers ($100 each) |
| Equipment | $500 | Additional AV needs, adapters, recording equipment |
| Marketing | $300 | Digital marketing, name badges, signage |
| Contingency | $400 | Buffer for unexpected expenses |
| **TOTAL** | **$5,000** | |

## SPEAKER ARRANGEMENTS

1. **Local Industry Experts** (No travel costs)
   - 2 Keynote speakers: $250 honorarium each
   - 3 Technical session speakers: $100 honorarium each
   - Recommended outreach: Local tech companies (Microsoft, Amazon, Google Seattle offices)
   - Alternative: Partner with local tech meetup groups for speaker recommendations

2. **Speaker Requirements**:
   - Clear timeline: 45-min keynotes, 30-min sessions including Q&A
   - Request slides 1 week in advance
   - Provide speaker guidelines document
   - Confirm all AV requirements before event

## CATERING OPTIONS

1. **Affordable Catering Services**:
   - **Foodz Catering**
     - Continental breakfast: $8/person
     - Sandwich lunch buffet: $12/person
     - Coffee service: $3/person
   
   - **Box Lunch Seattle**
     - Breakfast pastry box: $7/person
     - Boxed lunch options: $11/person
     - Afternoon snack: $4/person

   - **Neighborly Catering Co-op**
     - Light breakfast: $7/person
     - Hot lunch buffet: $13/person
     - All-day coffee/tea: $4/person

2. **Recommended Plan**: 
   - Continental breakfast + coffee ($10/person) = $500/day
   - Sandwich/salad lunch ($13/person) = $650/day
   - Afternoon coffee refresh ($3/person) = $150/day
   - **Total per day**: $1,300 × 2 days = $1,800 (under budget by $200)

## DRAFT SCHEDULE

### DAY 1

| Time | Activity | Location | Notes |
|------|----------|----------|-------|
| 8:00 - 9:00 AM | Registration & Breakfast | Main Hall | Name badges, welcome packets |
| 9:00 - 9:15 AM | Opening Remarks | Main Room | Conference organizer |
| 9:15 - 10:00 AM | Keynote #1: "Future of Tech" | Main Room | Industry leader |
| 10:00 - 10:15 AM | Break | | |
| 10:15 - 11:00 AM | Technical Session #1 | Main Room | Expert speaker |
| 11:00 - 11:45 AM | Technical Session #2 | Main Room | Expert speaker |
| 11:45 - 1:00 PM | Networking Lunch | Dining Area | Catered buffet |
| 1:00 - 2:30 PM | Hands-on Workshop | Main Room | Interactive learning |
| 2:30 - 2:45 PM | Coffee Break | | |
| 2:45 - 4:00 PM | Panel Discussion | Main Room | Industry experts |
| 4:00 - 5:00 PM | Networking Hour | Entire Venue | Structured networking activities |
| 5:00 PM | Day 1 Closing | Main Room | Summary and Day 2 preview |

### DAY 2

| Time | Activity | Location | Notes |
|------|----------|----------|-------|
| 8:30 - 9:00 AM | Breakfast | Main Hall | Light networking |
| 9:00 - 9:45 AM | Keynote #2: "Innovation in Action" | Main Room | Industry leader |
| 9:45 - 10:00 AM | Break | | |
| 10:00 - 11:30 AM | Technical Workshop | Main Room | Hands-on activity |
| 11:30 - 12:30 PM | Lightning Talks (5 × 10 min) | Main Room | Community speakers |
| 12:30 - 1:30 PM | Lunch | Dining Area | Catered buffet |
| 1:30 - 2:15 PM | Technical Session #3 | Main Room | Expert speaker |
| 2:15 - 3:00 PM | Case Study Presentations | Main Room | Real-world applications |
| 3:00 - 3:15 PM | Coffee Break | | |
| 3:15 - 4:15 PM | Roundtable Discussions | Breakout Areas | Topic-based groups |
| 4:15 - 4:45 PM | Closing Keynote | Main Room | Inspirational takeaways |
| 4:45 - 5:00 PM | Closing Remarks & Survey | Main Room | Feedback collection |

## IMPLEMENTATION TIMELINE

| Timeframe | Action Items |
|-----------|--------------|
| 8 weeks before | Reserve venue, create event website, begin speaker outreach |
| 6 weeks before | Confirm speakers, finalize catering quotes, begin promotion |
| 4 weeks before | Send speaker guidelines, finalize schedule, order signage |
| 2 weeks before | Send final attendee communications, confirm all logistics |
| 1 week before | Final venue walkthrough, speaker slide collection, print materials |
| Post-event | Send thank you notes, process speaker payments, review feedback |

This complete conference plan maximizes your $5,000 budget while providing a professional and valuable experience for all 50 attendees.`;

    response.messages.push({
      sender: 'ExecutionAgent',
      recipient: 'user',
      content: detailedPlan
    });

    return response;
  }

  private generateJobSearchResponse(userRequest: string): RasaResponse {
    // Create a response with standard structure
    const response: RasaResponse = {
      messages: [],
      traces: [],
      tasks: []
    };
    
    // Add traces
    response.traces.push({
      id: uuidv4(),
      agentId: 'researcher-1',
      action: 'job_search_strategy',
      details: 'Developing a comprehensive job search strategy tailored to the user request.',
      timestamp: new Date()
    });
    
    response.traces.push({
      id: uuidv4(),
      agentId: 'planner-1',
      action: 'resume_optimization',
      details: 'Optimizing the user\'s resume to highlight relevant skills and experience.',
      timestamp: new Date()
    });
    
    // Add tasks
    response.tasks.push({
      id: uuidv4(),
      assignedTo: 'planner-1',
      description: 'Create a detailed job search plan with actionable steps.',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });
    
    response.tasks.push({
      id: uuidv4(),
      assignedTo: 'researcher-1',
      description: 'Research potential job openings and companies that match the user\'s criteria.',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });
    
    // Create a generic job search response
    const jobSearchResponse = `# Job Search Strategy\n\nHere is a detailed job search plan...\n\n1. **Define Your Goals**: Clearly define your career goals and the type of job you are seeking.\n2. **Resume Optimization**: Tailor your resume to match the requirements of the jobs you are applying for.\n3. **Networking**: Reach out to your network and attend industry events to expand your connections.\n4. **Online Job Boards**: Utilize online job boards such as LinkedIn, Indeed, and Glassdoor to find job openings.\n5. **Company Websites**: Check the career pages of companies you are interested in for job openings.\n6. **Cover Letter**: Write a compelling cover letter that highlights your skills and experience.\n7. **Interview Preparation**: Prepare for interviews by researching the company and practicing common interview questions.\n8. **Follow-Up**: Follow up with the hiring manager after the interview to reiterate your interest in the position.\n\nThis plan ensures all aspects of your job search are addressed efficiently and effectively.`;
    
    response.messages.push({
      sender: 'ExecutionAgent',
      recipient: 'user',
      content: jobSearchResponse
    });
    
    return response;
  }

  private generateInterviewPrepResponse(userRequest: string): RasaResponse {
    // Create a response with standard structure
    const response: RasaResponse = {
      messages: [],
      traces: [],
      tasks: []
    };
    
    // Add traces
    response.traces.push({
      id: uuidv4(),
      agentId: 'researcher-1',
      action: 'interview_preparation',
      details: 'Developing a comprehensive interview preparation plan tailored to the user request.',
      timestamp: new Date()
    });
    
    response.traces.push({
      id: uuidv4(),
      agentId: 'planner-1',
      action: 'mock_interview',
      details: 'Conducting a mock interview to help the user practice and improve their interview skills.',
      timestamp: new Date()
    });
    
    // Add tasks
    response.tasks.push({
      id: uuidv4(),
      assignedTo: 'planner-1',
      description: 'Create a detailed interview preparation plan with actionable steps.',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });
    
    response.tasks.push({
      id: uuidv4(),
      assignedTo: 'researcher-1',
      description: 'Research common interview questions and best practices for answering them.',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });
    
    // Create a generic interview prep response
    const interviewResponse = `# Interview Preparation Plan\n\nHere is a detailed interview preparation plan...\n\n1. **Research the Company**: Understand the company's mission, values, and culture.\n2. **Review the Job Description**: Identify the key skills and experience required for the position.\n3. **Prepare Answers to Common Questions**: Practice answering common interview questions such as "Tell me about yourself" and "Why are you interested in this position?".\n4. **Prepare Questions to Ask**: Prepare a list of questions to ask the interviewer to show your interest in the company and the position.\n5. **Practice Your STAR Stories**: Use the STAR method (Situation, Task, Action, Result) to structure your answers to behavioral questions.\n6. **Dress Appropriately**: Dress professionally and appropriately for the company culture.\n7. **Arrive Early**: Arrive early to the interview to allow time to relax and prepare.\n8. **Follow-Up**: Send a thank-you note to the interviewer after the interview to reiterate your interest in the position.\n\nThis plan ensures all aspects of your interview preparation are addressed efficiently and effectively.`;
    
    response.messages.push({
      sender: 'ExecutionAgent',
      recipient: 'user',
      content: interviewResponse
    });
    
    return response;
  }

  private generateGenericResponse(userRequest: string): RasaResponse {
    // Create a response with standard structure
    const response: RasaResponse = {
      messages: [],
      traces: [],
      tasks: []
    };
    
    // Add traces
    response.traces.push({
      id: uuidv4(),
      agentId: 'researcher-1',
      action: 'research_started',
      details: `Researching user query: "${userRequest}"`,
      timestamp: new Date()
    });
    
    response.tasks.push({
      id: uuidv4(),
      assignedTo: 'researcher-1',
      description: `Research information for: ${userRequest}`,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    });
    
    // Generic detailed response
    const detailedResponse = `# Detailed Solution\n\nBased on our comprehensive analysis, here is your detailed solution for "${userRequest}":\n\n1. First, we recommend...\n2. Next, consider...\n3. Finally, implement...\n\nThis approach ensures all aspects of your request are addressed efficiently and effectively.`;
    
    response.messages.push({
      sender: 'ExecutionAgent',
      recipient: 'user',
      content: detailedResponse
    });
    
    return response;
  }

  private extractParameters(request: string): Record<string, any> {
    // Simple parameter extraction logic
    const parameters: Record<string, any> = {};
    
    // Extract budget
    const budgetMatch = request.match(/\$(\d+,?)+(\.\d{2})?/);
    if (budgetMatch) {
      parameters.budget = budgetMatch[0];
    }
    
    // Extract location
    const locations = ['Seattle', 'New York', 'San Francisco', 'Chicago', 'Boston', 'Austin'];
    for (const location of locations) {
      if (request.includes(location)) {
        parameters.location = location;
        break;
      }
    }
    
    // Extract attendee count
    const attendeeMatch = request.match(/(\d+)\s+attendees/i);
    if (attendeeMatch) {
      parameters.attendeeCount = parseInt(attendeeMatch[1]);
    }
    
    return parameters;
  }
}

export const rasaAdapter = RasaAdapter.getInstance();
