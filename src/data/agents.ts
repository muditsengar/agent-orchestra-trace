
import { Agent, AgentRole } from '../types/agent';

export const agents: Agent[] = [
  {
    id: 'researcher-1',
    name: 'ResearchGPT',
    role: 'researcher',
    skills: ['Information gathering', 'Data analysis', 'Fact verification'],
  },
  {
    id: 'planner-1',
    name: 'PlannerGPT',
    role: 'planner',
    skills: ['Task decomposition', 'Resource allocation', 'Timeline creation'],
  },
  {
    id: 'executor-1',
    name: 'ExecutorGPT',
    role: 'executor',
    skills: ['Task execution', 'Content generation', 'Action implementation'],
  },
  {
    id: 'coordinator-1',
    name: 'CoordinatorGPT',
    role: 'coordinator',
    skills: ['Agent orchestration', 'Task delegation', 'Result synthesis'],
  }
];

export const getAgentById = (id: string): Agent | undefined => {
  return agents.find(agent => agent.id === id);
};

export const getAgentByRole = (role: AgentRole): Agent | undefined => {
  return agents.find(agent => agent.role === role);
};
