
import React, { useState, useEffect } from 'react';
import AgentSystemDashboard from '../components/AgentSystemDashboard';
import { toast } from '../components/ui/sonner';

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we can render the main component
    try {
      console.log("Initializing Index page");
      
      // Simulate a network check to ensure components load even if backend is unavailable
      const checkConnection = async () => {
        try {
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
      <main className="w-full">
        <AgentSystemDashboard />
      </main>
    </div>
  );
};

export default Index;
