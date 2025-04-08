import React from 'react';
import { Trace } from '../types/agent';
import { getAgentById } from '../data/agents';
import AgentBadge from './AgentBadge';
import { cn } from '../lib/utils';

interface TraceItemProps {
  trace: Trace;
}

const TraceItem: React.FC<TraceItemProps> = ({ trace }) => {
  const agent = getAgentById(trace.agentId);
  
  if (!agent) return null;
  
  // Format the timestamp with milliseconds by concatenating standard time format with milliseconds
  const date = trace.timestamp;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  const formattedTime = `${hours}:${minutes}:${seconds}.${milliseconds}`;

  const getBgColorByAgentRole = () => {
    switch (agent.role) {
      case 'researcher': return 'bg-agent-researcher/50';
      case 'planner': return 'bg-agent-planner/50';
      case 'executor': return 'bg-agent-executor/50';
      case 'coordinator': return 'bg-agent-coordinator/50';
      default: return 'bg-gray-100';
    }
  };

  const getActionIcon = () => {
    if (trace.action.includes('receive')) return '📥';
    if (trace.action.includes('start')) return '🚀';
    if (trace.action.includes('complet')) return '✅';
    if (trace.action.includes('review')) return '👀';
    if (trace.action.includes('approv')) return '👍';
    if (trace.action.includes('deliver')) return '📤';
    if (trace.action.includes('analyz')) return '🔍';
    if (trace.action.includes('research')) return '📚';
    if (trace.action.includes('plan')) return '📋';
    if (trace.action.includes('execut')) return '⚙️';
    return '🔄';
  };

  return (
    <div className={cn(
      'px-3 py-2 rounded-md mb-2 border-l-4',
      getBgColorByAgentRole(),
      `border-agent-${agent.role}`
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getActionIcon()}</span>
          <AgentBadge agent={agent} size="sm" />
        </div>
        <span className="text-xs text-gray-500">{formattedTime}</span>
      </div>
      
      <div className="mt-1 text-sm text-gray-800">
        <span className="font-semibold capitalize">{trace.action.replace(/_/g, ' ')}:</span> {trace.details}
      </div>
    </div>
  );
};

export default TraceItem;
