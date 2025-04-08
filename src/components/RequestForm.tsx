
import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { toast } from '@/components/ui/sonner';
import { agentService } from '../services/agentService';
import { autogenAdapter } from '../services/autogenAdapter';

interface RequestFormProps {
  onRequestSubmitted?: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ onRequestSubmitted }) => {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useAutogen, setUseAutogen] = useState(false);
  const [autogenConnected, setAutogenConnected] = useState(false);

  useEffect(() => {
    // Check if AutoGen backend is connected
    const checkConnection = async () => {
      const isConnected = await autogenAdapter.isBackendConnected();
      setAutogenConnected(isConnected);
    };
    
    if (useAutogen) {
      checkConnection();
    }
  }, [useAutogen]);

  const handleToggleAutogen = async (checked: boolean) => {
    setUseAutogen(checked);
    agentService.toggleAutogen(checked);
    
    if (checked && !autogenConnected) {
      try {
        const connected = await autogenAdapter.connect();
        setAutogenConnected(connected);
      } catch (error) {
        console.error("Failed to connect to AutoGen:", error);
        toast.error("Failed to connect to AutoGen backend");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error('Please enter a request');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await agentService.submitUserRequest(prompt);
      toast.success('Request submitted successfully');
      setPrompt('');
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch 
              id="autogen-mode"
              checked={useAutogen}
              onCheckedChange={handleToggleAutogen}
            />
            <Label htmlFor="autogen-mode" className="cursor-pointer">
              Use Microsoft AutoGen
            </Label>
          </div>
          {useAutogen && (
            <div className="flex items-center">
              <span className={`h-2 w-2 rounded-full mr-2 ${autogenConnected ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <span className="text-xs text-gray-600">
                {autogenConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-1">
            Enter your request
          </label>
          <Textarea
            id="prompt"
            placeholder={useAutogen 
              ? "Ask for help with job search, career planning, technical problems, or any complex task (e.g., 'I need a comprehensive marketing strategy for my new app')" 
              : "Enter a complex task for our multi-agent system to solve collaboratively..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-[80px]"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !prompt.trim() || (useAutogen && !autogenConnected)}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default RequestForm;
