import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { toast } from '@/components/ui/sonner';
import { agentService } from '../services/agentService';
import { autogenAdapter } from '../services/autogenAdapter';
import { rasaAdapter } from '../services/rasaAdapter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CircleCheck, CircleDot } from 'lucide-react';

interface RequestFormProps {
  onRequestSubmitted?: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ onRequestSubmitted }) => {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [framework, setFramework] = useState<'native' | 'autogen' | 'langchain' | 'rasa'>('native');
  const [autogenConnected, setAutogenConnected] = useState(false);
  const [autogenConnecting, setAutogenConnecting] = useState(false);
  const [rasaConnected, setRasaConnected] = useState(false);
  const [rasaConnecting, setRasaConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Check if backends are connected
    const checkConnections = async () => {
      setConnectionError(null);
      
      if (framework === 'autogen') {
        try {
          const isConnected = await autogenAdapter.isBackendConnected();
          setAutogenConnected(isConnected);
          if (!isConnected) {
            console.log("Trying to connect to AutoGen backend...");
            setAutogenConnecting(true);
            const connected = await autogenAdapter.connect();
            setAutogenConnected(connected);
            setAutogenConnecting(false);
            if (!connected) {
              setConnectionError("Could not connect to AutoGen backend. Make sure the backend server is running and the API key is configured.");
            }
          }
        } catch (error) {
          console.error("Failed to connect to AutoGen:", error);
          setAutogenConnecting(false);
          setConnectionError(`Failed to connect to AutoGen: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else if (framework === 'rasa') {
        const isConnected = await rasaAdapter.isBackendConnected();
        setRasaConnected(isConnected);
        if (!isConnected) {
          try {
            setRasaConnecting(true);
            const connected = await rasaAdapter.connect();
            setRasaConnected(connected);
            setRasaConnecting(false);
          } catch (error) {
            console.error("Failed to connect to Rasa:", error);
            setRasaConnecting(false);
            setConnectionError(`Failed to connect to Rasa: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    };
    
    checkConnections();
  }, [framework]);

  const handleFrameworkChange = async (value: 'native' | 'autogen' | 'langchain' | 'rasa') => {
    setFramework(value);
    setConnectionError(null);
    
    // Update the framework in the agent service
    if (value === 'autogen') {
      agentService.toggleAutogen(true);
      
      try {
        console.log("Connecting to AutoGen backend after framework change...");
        setAutogenConnecting(true);
        const connected = await autogenAdapter.connect();
        setAutogenConnected(connected);
        setAutogenConnecting(false);
        if (!connected) {
          setConnectionError("Could not connect to AutoGen backend. Make sure the backend server is running and the API key is configured.");
        }
      } catch (error) {
        console.error("Failed to connect to AutoGen:", error);
        setAutogenConnecting(false);
        toast.error("Failed to connect to AutoGen backend");
        setConnectionError(`Failed to connect to AutoGen: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (value === 'langchain') {
      agentService.toggleLangChain(true);
      // LangChain is simulated, no backend connection needed
    } else if (value === 'rasa') {
      agentService.toggleRasa(true);
      
      try {
        setRasaConnecting(true);
        const connected = await rasaAdapter.connect();
        setRasaConnected(connected);
        setRasaConnecting(false);
      } catch (error) {
        console.error("Failed to connect to Rasa:", error);
        setRasaConnecting(false);
        toast.error("Failed to connect to Rasa backend");
        setConnectionError(`Failed to connect to Rasa: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Native framework
      agentService.setFramework('native');
    }
  };

  const getPlaceholderText = () => {
    switch (framework) {
      case 'autogen':
        return "Ask for help with job search, career planning, technical problems, or any complex task (e.g., 'I need a comprehensive marketing strategy for my new app')";
      case 'langchain':
        return "Request detailed information with day-by-day breakdowns (e.g., 'Create a 30-day plan to learn web development from scratch')";
      case 'rasa':
        return "Ask for comprehensive plans with daily activities and detailed examples (e.g., 'I was laid off as a senior developer, help me plan and prepare for a new job')";
      default:
        return "Enter a complex task for our multi-agent system to solve collaboratively...";
    }
  };

  const isBackendReadyCheck = () => {
    if (framework === 'autogen' && !autogenConnected) return false;
    if (framework === 'rasa' && !rasaConnected) return false;
    return true;
  };

  const renderConnectionStatus = (type: 'autogen' | 'rasa') => {
    const isConnected = type === 'autogen' ? autogenConnected : rasaConnected;
    const isConnecting = type === 'autogen' ? autogenConnecting : rasaConnecting;
    
    if (isConnected) {
      return <CircleCheck className="h-3 w-3 text-green-500 ml-1" />
    } else if (isConnecting) {
      return <CircleDot className="h-3 w-3 text-amber-500 ml-1" />
    } else {
      return <CircleDot className="h-3 w-3 text-gray-300 ml-1" />
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
      console.log(`Submitting ${framework} request: ${prompt}`);
      await agentService.submitUserRequest(prompt);
      toast.success('Request submitted successfully');
      setPrompt('');
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-4">
      <div className="space-y-4">
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">Select Processing Framework</Label>
          <RadioGroup 
            value={framework} 
            onValueChange={(value) => handleFrameworkChange(value as 'native' | 'autogen' | 'langchain' | 'rasa')}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="native" id="native" />
              <Label htmlFor="native" className="cursor-pointer">Native</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="autogen" id="autogen" />
              <Label htmlFor="autogen" className="cursor-pointer">AutoGen</Label>
              {framework === 'autogen' && renderConnectionStatus('autogen')}
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="langchain" id="langchain" />
              <Label htmlFor="langchain" className="cursor-pointer">LangChain</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rasa" id="rasa" />
              <Label htmlFor="rasa" className="cursor-pointer">Rasa</Label>
              {framework === 'rasa' && renderConnectionStatus('rasa')}
            </div>
          </RadioGroup>
        </div>
        
        {connectionError && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}
        
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-1">
            Enter your request
          </label>
          <Textarea
            id="prompt"
            placeholder={getPlaceholderText()}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-[80px]"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {framework === 'autogen' && (
              <span>
                {autogenConnected ? 
                  "Connected to AutoGen backend" : 
                  autogenConnecting ? "Connecting to AutoGen backend..." :
                  "Not connected to AutoGen backend"}
              </span>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting || !prompt.trim() || !isBackendReadyCheck()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default RequestForm;
