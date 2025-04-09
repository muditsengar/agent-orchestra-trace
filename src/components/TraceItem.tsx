
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
    if (trace.action.includes('job')) return '💼';
    if (trace.action.includes('career')) return '🚀';
    return '🔄';
  };

  // Check if the trace is from AutoGen or LangChain
  const isAutoGenTrace = trace.details.includes('(using AutoGen)');
  const isLangChainTrace = trace.details.includes('(using LangChain)');
  
  // Check if this is a job search related trace with detailed plan
  const isJobSearchPlan = 
    trace.details.toLowerCase().includes('android developer job search') ||
    trace.details.toLowerCase().includes('action plan: senior android developer');

  // Format detailed traces better
  const formatTraceDetails = (details: string) => {
    // Remove the framework markers for display purposes
    let formattedDetails = details
      .replace(' (using AutoGen)', '')
      .replace(' (using LangChain)', '');
    
    // Format job search plans with better styling
    if (isJobSearchPlan) {
      // Parse markdown-like content
      return formatJobSearchContent(formattedDetails);
    }
    
    // Highlight important keywords in job search related traces
    if (formattedDetails.toLowerCase().includes('job') || 
        formattedDetails.toLowerCase().includes('career') || 
        formattedDetails.toLowerCase().includes('android')) {
      formattedDetails = formattedDetails
        .replace(/job search/gi, '<span class="text-blue-600 font-medium">job search</span>')
        .replace(/android/gi, '<span class="text-green-600 font-medium">Android</span>')
        .replace(/developer/gi, '<span class="text-purple-600 font-medium">developer</span>')
        .replace(/skills/gi, '<span class="text-amber-600 font-medium">skills</span>')
        .replace(/interview/gi, '<span class="text-red-600 font-medium">interview</span>')
        .replace(/kotlin/gi, '<span class="text-blue-800 font-medium">Kotlin</span>')
        .replace(/jetpack compose/gi, '<span class="text-indigo-600 font-medium">Jetpack Compose</span>');
      
      return <span dangerouslySetInnerHTML={{ __html: formattedDetails }} />;
    }
    
    return formattedDetails;
  };

  // Special formatting for job search content with markdown-like structure
  const formatJobSearchContent = (content: string) => {
    if (!content.includes('#') && !content.includes('*')) {
      return content;
    }

    // Process markdown content by adding HTML styling
    let formattedHTML = content
      // Handle headings
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-blue-700 mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-blue-800 mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-blue-900 mt-5 mb-3">$1</h1>')
      
      // Handle bullet points
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-gray-800">$1</li>')
      
      // Handle days/dates - highlight specific day numbers
      .replace(/(Day \d+):/gi, '<span class="font-bold text-purple-700">$1:</span>')
      .replace(/(Week \d+):/gi, '<span class="font-bold text-indigo-700">$1:</span>')
      
      // Handle technical terms
      .replace(/Kotlin/gi, '<span class="text-blue-800 font-medium">Kotlin</span>')
      .replace(/Jetpack Compose/gi, '<span class="text-indigo-600 font-medium">Jetpack Compose</span>')
      .replace(/MVVM/gi, '<span class="text-green-700 font-medium">MVVM</span>')
      .replace(/Android/gi, '<span class="text-green-600 font-medium">Android</span>')
      
      // Convert newlines to breaks
      .replace(/\n/g, '<br />');
    
    return <div className="mt-2 mb-1 trace-details" dangerouslySetInnerHTML={{ __html: formattedHTML }} />;
  };

  return (
    <div className={cn(
      'px-3 py-2 rounded-md mb-2 border-l-4',
      isJobSearchPlan ? 'border-l-blue-600 bg-blue-50' : getBgColorByAgentRole(),
      !isJobSearchPlan && `border-agent-${agent.role}`
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getActionIcon()}</span>
          <AgentBadge agent={agent} size="sm" />
          {isAutoGenTrace && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">AutoGen</span>
          )}
          {isLangChainTrace && (
            <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">LangChain</span>
          )}
        </div>
        <span className="text-xs text-gray-500">{formattedTime}</span>
      </div>
      
      <div className={cn("mt-1 text-sm text-gray-800", isJobSearchPlan && "job-search-content")}>
        <span className="font-semibold capitalize">{trace.action.replace(/_/g, ' ')}:</span> {formatTraceDetails(trace.details)}
      </div>
    </div>
  );
};

export default TraceItem;
