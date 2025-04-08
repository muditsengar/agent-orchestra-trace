
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import AgentMessage from './AgentMessage';
import TraceItem from './TraceItem';
import TaskItem from './TaskItem';
import RequestForm from './RequestForm';
import { agentService } from '../services/agentService';
import { Message, Trace, AgentTask } from '../types/agent';

const AgentSystemDashboard: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update data when the agent service updates
  useEffect(() => {
    const handleUpdate = () => {
      setMessages([...agentService.getMessages()]);
      setTraces([...agentService.getTraces()]);
      setTasks([...agentService.getTasks()]);
      setIsProcessing(agentService.isProcessing());
    };

    // Initial load
    handleUpdate();

    // Register for updates
    agentService.registerUpdateCallback(handleUpdate);

    // Cleanup on unmount
    return () => {
      agentService.unregisterUpdateCallback(handleUpdate);
    };
  }, []);

  // Filter messages for the main conversation (user to coordinator, executor to user)
  const conversationMessages = messages.filter(
    msg => msg.from === 'user' || msg.to === 'user' || 
    (msg.from === 'coordinator-1' && msg.to !== 'user') ||
    (msg.to === 'coordinator-1' && msg.from !== 'user')
  );

  // Get internal messages between agents (excluding user conversations)
  const internalMessages = messages.filter(
    msg => msg.type === 'internal'
  );

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Agent Orchestration</CardTitle>
              <CardDescription>
                Submit a complex request and watch our agent system collaborate to solve it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequestForm 
                onRequestSubmitted={() => {
                  // Scroll to the bottom of messages after submission
                  setTimeout(() => {
                    const messageContainers = document.querySelectorAll('.messages-container');
                    messageContainers.forEach(container => {
                      container.scrollTop = container.scrollHeight;
                    });
                  }, 100);
                }} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                User requests and agent responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] messages-container">
                <div className="space-y-4 p-1">
                  {conversationMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No messages yet. Submit a request to begin the conversation.
                    </div>
                  ) : (
                    conversationMessages.map(message => (
                      <AgentMessage key={message.id} message={message} />
                    ))
                  )}
                  {isProcessing && (
                    <div className="text-center py-2">
                      <div className="inline-block px-4 py-2 bg-gray-100 rounded-full text-sm">
                        Agents are working...
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Agent Traces</CardTitle>
              <CardDescription>
                Real-time logs from the multi-agent system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="traces">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="traces">Traces</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                </TabsList>
                
                <TabsContent value="traces" className="mt-0">
                  <ScrollArea className="h-[500px] messages-container">
                    <div className="space-y-1 p-1">
                      {traces.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No traces yet. Submit a request to begin.
                        </div>
                      ) : (
                        traces.map(trace => (
                          <TraceItem key={trace.id} trace={trace} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="tasks" className="mt-0">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3 p-1">
                      {tasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No tasks yet. Submit a request to begin.
                        </div>
                      ) : (
                        tasks.map(task => (
                          <TaskItem key={task.id} task={task} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Internal Communications</CardTitle>
              <CardDescription>
                Messages exchanged between agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] messages-container">
                <div className="space-y-3 p-1">
                  {internalMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No internal communications yet. Submit a request to begin.
                    </div>
                  ) : (
                    internalMessages.map(message => (
                      <AgentMessage key={message.id} message={message} showTimestamp={false} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentSystemDashboard;
