
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  skills: string[];
  avatar?: string;
}

export type AgentRole = 'researcher' | 'planner' | 'executor' | 'coordinator';

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  type: 'request' | 'response' | 'internal';
  metadata?: Record<string, any>;
}

export interface Trace {
  id: string;
  agentId: string;
  action: string;
  details: string;
  timestamp: Date;
  relatedMessageIds?: string[];
}

export interface AgentTask {
  id: string;
  assignedTo: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  result?: string;
  parentTaskId?: string;
}

export interface UserRequest {
  id: string;
  content: string;
  timestamp: Date;
  status: 'processing' | 'completed' | 'failed';
  result?: string;
}
