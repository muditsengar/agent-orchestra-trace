
# Multi Agent Collaboration_Mudit

Real-time multi-agent collaboration system with detailed tracing capabilities. This project demonstrates how multiple specialized AI agents can collaborate to solve complex tasks while providing transparency into their decision-making and communication processes.

## System Overview

Agent Orchestra Trace uses a multi-agent architecture where specialized agents work together to solve complex user requests:

- **Researcher Agent**: Gathers information and conducts data analysis
- **Planner Agent**: Creates structured plans based on research findings
- **Executor Agent**: Implements solutions and generates content
- **Coordinator Agent**: Orchestrates the workflow between agents

The system provides real-time visualization of agent communication, task delegation, and the reasoning processes behind each agent's actions.

## Features

- Multi-agent collaboration with specialized roles
- Real-time trace visualization of agent communication
- Task status tracking and monitoring
- Clear view of internal agent messaging
- Responsive UI for desktop and mobile devices

## Technologies Used

### Core Framework
- React with TypeScript
- Vite for fast development and building

### UI Libraries
- Tailwind CSS for styling
- shadcn/ui for UI components
- React Router for navigation

### State Management
- Local state with React hooks
- Custom event-based state synchronization

## Setup & Usage

Follow these steps to deploy the application locally:

1. **Clone the repository**
   ```sh
   git clone https://github.com/muditsengar/agent-orchestra-trace
   cd agent-orchestra-trace
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Start the development server**
   ```sh
   # Run this command in the project root directory
   npm run dev
   ```

4. **Access the application**
   Open your browser and navigate to: `http://localhost:8080`

5. **Using the application**
   - Enter your request in the input field
   - Watch as agents collaborate in real-time to solve your request
   - View detailed traces of agent communication and reasoning
   - Explore the task breakdown and status updates

## System Architecture

The Agent Orchestra Trace system employs a multi-agent architecture with specialized roles and a structured communication flow to efficiently solve complex tasks.

### Agent Roles

- **Coordinator Agent**: The central orchestrator that receives user requests, breaks them down into subtasks, and delegates to specialized agents
- **Researcher Agent**: Specializes in information gathering and analysis
- **Planner Agent**: Creates execution plans based on research findings
- **Executor Agent**: Implements plans and generates final responses

### Communication Flow

1. User submits a request to the Coordinator
2. Coordinator analyzes and breaks down the request
3. Subtasks are assigned to specialized agents (Researcher, Planner)
4. Each agent performs their specialized task and reports back to the Coordinator
5. Executor generates the final comprehensive response
6. Response is delivered to the user

### Framework Selection

The system is built using:
- **React with TypeScript**: For type-safe component development
- **Vite**: For fast development and optimized builds
- **Tailwind CSS**: For utility-first styling
- **shadcn/ui**: For accessible, customizable UI components
- **Event-based architecture**: For real-time agent communication

## AI Coding & Speed

This project leverages AI coding tools and modern development practices to accelerate the development process:

- **AI-Assisted Development**: The project was developed using AI coding assistants like Cursor AI, Windsurf AI and Loveable vide coding to:
  - Scaffold components and generate boilerplate code
  - Suggest optimizations and best practices
  - Debug complex interactions between components
  - Generate TypeScript interfaces and type definitions

- **Development Automation**:
  - Vite's hot module replacement for instant feedback
  - ESLint and Prettier for automated code quality enforcement
  - TypeScript for catching type errors during development
  - Automated component generation with shadcn/ui CLI

- **Rapid Prototyping Techniques**:
  - Component-Based Architecture: Small, reusable components accelerate development
  - Simulated AI Framework: Realistic simulation of AI agent behaviors without external API integration
  - Tailwind CSS: Utility-first CSS framework eliminates the need for custom CSS
  - shadcn/ui Components: Pre-built UI components reduce development time

- **Development Velocity**:
  - Initial prototype completed in under 48 hours
  - Iterative development with continuous feedback incorporation
  - Parallel development of UI and agent logic

### Technical Depth

The system demonstrates several advanced concepts:

- **Task Decomposition**: Complex requests are automatically broken down into manageable subtasks
- **Conditional Execution**: Tasks are executed in the proper sequence, with dependencies managed
- **State Management**: Comprehensive state tracking for messages, traces, tasks, and status
- **Real-time Updates**: Event-based architecture provides real-time UI updates
- **Extensibility**: New agent types can be easily added to the system

### Scalability & Extensibility

The architecture is designed for scalability:

- **New Agent Types**: Additional specialized agents can be added by extending the agent types
- **Enhanced Capabilities**: Each agent's skills can be expanded without changing the overall architecture
- **Request Complexity**: The system can handle increasingly complex multi-step requests
- **Persistent Storage**: Could be extended to include database storage for long-term trace analysis

## Development Tools

- VSCode for code editing
- Git for version control
- Chrome DevTools for debugging

## Downloading the Project

To download and run this project:

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`
4. Open your browser to `http://localhost:8080`

## How Agents Communicate

Agents in this system communicate through a centralized message-passing architecture:

1. Each agent has a unique ID and specialized role
2. Messages are structured with sender, recipient, content, and metadata
3. The coordinator agent manages the workflow and delegates tasks
4. Traces capture each step of the decision-making process
5. Tasks track the status of work assigned to each agent

All communication is logged and visualized in real-time, providing transparency into the collaborative problem-solving process.

## Code Documentation

### Code Architecture

```
src/
├── components/      # UI components for the application
│   ├── ui/          # Base UI components from shadcn/ui
│   ├── AgentMessage.tsx      # Message display component
│   ├── AgentSystemDashboard.tsx  # Main dashboard UI
│   ├── RequestForm.tsx       # User input form
│   ├── TaskItem.tsx          # Task visualization
│   └── TraceItem.tsx         # Trace visualization
├── data/
│   └── agents.ts    # Agent definitions and configurations
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and helpers
├── pages/
│   └── Index.tsx    # Main application page
├── services/
│   ├── agentService.ts     # Core agent orchestration logic
│   ├── autogenAdapter.ts   # Microsoft AutoGen framework adapter
│   └── rasaAdapter.ts      # Rasa framework adapter
└── types/
    └── agent.ts     # TypeScript interfaces for the system
```

### Core Data Models

- **Agent**: Represents an AI agent with a specific role (researcher, planner, executor, coordinator)
- **Message**: Communication between agents or user-agent interactions
- **Trace**: Detailed logs of agent actions and reasoning
- **AgentTask**: Work items assigned to agents with status tracking
- **UserRequest**: Incoming requests from users with processing status

### Application Flow

1. **Request Submission**:
   - User submits a request via the `RequestForm` component
   - Request is passed to the `agentService.submitUserRequest()` method
   - A new `UserRequest` object is created and stored

2. **Framework Selection & Processing**:
   - Based on the active framework setting (native, autogen, langchain, rasa)
   - The appropriate processing method is called:
     - `processWithAutogen()` for Microsoft AutoGen integration
     - `processWithRasa()` for Rasa integration
     - `simulateLangChainProcess()` for LangChain simulation
     - `simulateAgentCollaboration()` for native processing

3. **Agent Collaboration Process**:
   - **Coordinator** receives the request and analyzes it
   - Tasks are created and assigned to specialized agents
   - **Researcher** gathers information and returns findings
   - **Planner** creates execution plan based on research
   - **Executor** implements the plan and generates response
   - **Coordinator** reviews and delivers the final solution

4. **Real-time Updates**:
   - `AgentSystemDashboard` component registers update callbacks
   - When agents create messages, traces, or tasks, UI updates instantly
   - All communication is displayed in dedicated panels

### Technical Implementation

- **State Management**: Uses React's useState and useEffect with a custom event system
- **UI Updates**: Components subscribe to the agentService for real-time updates
- **Agent Communication**: Structured message passing with metadata
- **Trace Visualization**: Chronological display of agent reasoning steps
- **Task Tracking**: Status updates for work items with parent-child relationships
- **Framework Adapters**: Pluggable architecture for different AI frameworks

### Extending the System

- **Add New Agent Types**: Extend the `AgentRole` type and create new agent definitions
- **Implement New Frameworks**: Create new adapter services and processing methods
- **Enhance Agent Capabilities**: Modify agent behavior in the service implementation
- **Add Persistence**: Implement database storage for messages, traces, and tasks

