import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { agentService } from '../services/agentService';

interface RequestFormProps {
  onRequestSubmitted?: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ onRequestSubmitted }) => {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-1">
            Enter your request
          </label>
          <Textarea
            id="prompt"
            placeholder="Enter a complex task for our multi-agent system..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-[80px]"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !prompt.trim()}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default RequestForm;
