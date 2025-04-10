
import React, { useState, useEffect } from 'react';
import AgentSystemDashboard from '../components/AgentSystemDashboard';
import { toast } from '../components/ui/sonner';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { autogenAdapter } from '../services/autogenAdapter';

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<{
    running: boolean;
    autogen_installed?: boolean;
    openai_api_key_configured?: boolean;
  }>({ running: false });

  useEffect(() => {
    // Check if we can render the main component
    try {
      console.log("Initializing Index page");
      
      // Check backend status and ensure components load even if backend is unavailable
      const checkConnection = async () => {
        try {
          // Try to connect to the backend
          const response = await fetch('http://localhost:8000/status', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }).catch((err) => {
            console.warn("Backend check failed:", err);
            return null;
          });

          if (response && response.ok) {
            const status = await response.json();
            console.log("Backend status:", status);
            setBackendStatus({
              running: true,
              autogen_installed: status.autogen_installed,
              openai_api_key_configured: status.openai_api_key_configured
            });
            
            // Try to connect to AutoGen if backend is running
            if (status.autogen_installed && status.openai_api_key_configured) {
              try {
                await autogenAdapter.connect();
              } catch (err) {
                console.warn("AutoGen connection failed but will continue loading UI:", err);
              }
            }
          } else {
            console.warn("Backend is not running or not accessible");
            setBackendStatus({ running: false });
          }
          
          // Continue loading the UI even if backend is not available
          setIsLoading(false);
        } catch (err) {
          console.error("Failed during initialization:", err);
          setError("Failed to initialize application. See console for details.");
          setIsLoading(false);
          toast.error("Application initialization failed. Check console for details.");
        }
      };
      
      checkConnection();
    } catch (e) {
      console.error("Critical rendering error:", e);
      setError("Critical rendering error. See console for details.");
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading Application...</h2>
          <p className="text-gray-500">Please wait while we initialize the components</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Application Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check that the backend server is running and refresh the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container-fluid px-4 py-3">
          <h1 className="text-xl font-bold text-center">Multi-Agent Collaboration System</h1>
          <p className="text-center text-gray-600 text-sm">Powered by Microsoft AutoGen, LangChain and Rasa frameworks</p>
        </div>
      </header>
      
      {!backendStatus.running && (
        <div className="container mx-auto px-4 py-4">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Backend Not Connected</AlertTitle>
            <AlertDescription>
              The backend server is not running or not accessible. The application will work with simulated responses only.
            </AlertDescription>
          </Alert>
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h2 className="text-lg font-semibold mb-2">Troubleshooting Steps:</h2>
            <ol className="list-decimal list-inside space-y-1 text-sm pl-4">
              <li>Make sure the Python backend is running on http://localhost:8000</li>
              <li>Check that you have installed all required Python packages: <code>pip install -r backend/requirements.txt</code></li>
              <li>Ensure your OpenAI API key is set in the backend/.env file</li>
              <li>Start the backend with: <code>cd backend && uvicorn main:app --reload</code></li>
            </ol>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      )}
      
      {backendStatus.running && !backendStatus.openai_api_key_configured && (
        <div className="container mx-auto px-4 py-4">
          <Alert variant="warning" className="mb-4">
            <AlertTitle>OpenAI API Key Not Configured</AlertTitle>
            <AlertDescription>
              The backend is running, but the OpenAI API key is not configured. AutoGen will not work properly.
            </AlertDescription>
          </Alert>
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h2 className="text-lg font-semibold mb-2">Setup Steps:</h2>
            <ol className="list-decimal list-inside space-y-1 text-sm pl-4">
              <li>Create a .env file in the backend directory</li>
              <li>Add your OpenAI API key: <code>OPENAI_API_KEY=your-api-key-here</code></li>
              <li>Restart the backend server</li>
            </ol>
          </div>
        </div>
      )}
      
      <main className="w-full">
        <AgentSystemDashboard />
      </main>
    </div>
  );
};

export default Index;
