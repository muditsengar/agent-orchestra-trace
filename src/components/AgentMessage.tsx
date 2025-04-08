
import React from 'react';
import { Message } from '../types/agent';
import AgentBadge from './AgentBadge';
import { getAgentById } from '../data/agents';
import { cn } from '../lib/utils';

interface AgentMessageProps {
  message: Message;
  showTimestamp?: boolean;
}

const AgentMessage: React.FC<AgentMessageProps> = ({ message, showTimestamp = true }) => {
  const fromAgent = message.from !== 'user' ? getAgentById(message.from) : null;
  const toAgent = message.to !== 'user' ? getAgentById(message.to) : null;
  
  const isUserMessage = message.from === 'user';
  const isResponseToUser = message.to === 'user';
  
  // Format timestamp
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(message.timestamp);

  return (
    <div className={cn(
      'flex mb-4 max-w-3xl',
      isUserMessage ? 'ml-auto flex-row-reverse' : (isResponseToUser ? 'mr-auto' : 'mx-auto')
    )}>
      <div className={cn(
        'rounded-lg p-4 shadow-sm',
        isUserMessage ? 'bg-primary text-primary-foreground' : 
        isResponseToUser ? 'bg-agent-executor text-orange-800' :
        'bg-agent-background text-gray-800'
      )}>
        {(!isUserMessage && !isResponseToUser) && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {fromAgent && <AgentBadge agent={fromAgent} size="sm" />}
              <span className="text-xs">→</span>
              {toAgent && <AgentBadge agent={toAgent} size="sm" />}
            </div>
            
            {showTimestamp && (
              <span className="text-xs text-gray-500">{formattedTime}</span>
            )}
          </div>
        )}
        
        <div className="whitespace-pre-wrap">{message.content}</div>
        
        {(isUserMessage || isResponseToUser) && showTimestamp && (
          <div className="mt-2 text-xs text-right opacity-70">
            {formattedTime}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentMessage;
