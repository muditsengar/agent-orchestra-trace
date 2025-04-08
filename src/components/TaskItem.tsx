
import React from 'react';
import { AgentTask } from '../types/agent';
import { getAgentById } from '../data/agents';
import { cn } from '../lib/utils';
import AgentBadge from './AgentBadge';

interface TaskItemProps {
  task: AgentTask;
}

const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const agent = getAgentById(task.assignedTo);
  
  if (!agent) return null;
  
  const getStatusColor = () => {
    switch (task.status) {
      case 'pending': return 'bg-gray-200 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800 animate-pulse-light';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-3 mb-3 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-2">
        <AgentBadge agent={agent} size="sm" />
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full uppercase font-medium',
          getStatusColor()
        )}>
          {task.status}
        </span>
      </div>
      
      <p className="text-sm mb-2">{task.description}</p>
      
      {task.result && task.status === 'completed' && (
        <div className="mt-2 text-xs bg-gray-50 p-2 rounded border text-gray-700 max-h-24 overflow-y-auto">
          <span className="font-medium">Result:</span> {task.result}
        </div>
      )}
      
      {task.completedAt && (
        <div className="mt-2 text-xs text-gray-500">
          Completed at: {task.completedAt.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
