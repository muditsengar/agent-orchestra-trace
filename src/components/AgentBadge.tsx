
import React from 'react';
import { Agent } from '../types/agent';
import { cn } from '../lib/utils';

interface AgentBadgeProps {
  agent: Agent;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AgentBadge: React.FC<AgentBadgeProps> = ({ agent, className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const roleBg = {
    researcher: 'bg-agent-researcher text-blue-800',
    planner: 'bg-agent-planner text-purple-800',
    executor: 'bg-agent-executor text-orange-800',
    coordinator: 'bg-agent-coordinator text-green-800',
  };

  return (
    <span className={cn(
      'rounded-full font-medium inline-flex items-center',
      roleBg[agent.role],
      sizeClasses[size],
      className
    )}>
      {agent.name}
    </span>
  );
};

export default AgentBadge;
