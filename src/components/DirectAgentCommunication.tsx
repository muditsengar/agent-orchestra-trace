
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { agentService } from '@/services/agentService';

const DirectAgentCommunication: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('coordinator-1');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    setIsSending(true);
    try {
      await agentService.sendDirectMessage(selectedAgent, message);
      toast.success('Message sent to agent');
      setMessage('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Direct Agent Communication</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="agent-select" className="block text-sm font-medium mb-1">
              Select Agent
            </Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coordinator-1">Coordinator</SelectItem>
                <SelectItem value="researcher-1">Researcher</SelectItem>
                <SelectItem value="planner-1">Planner</SelectItem>
                <SelectItem value="executor-1">Executor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="message" className="block text-sm font-medium mb-1">
              Your Message
            </Label>
            <Textarea
              id="message"
              placeholder="Enter your message to the agent..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-[80px]"
            />
          </div>
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSending || !message.trim()}
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DirectAgentCommunication;
