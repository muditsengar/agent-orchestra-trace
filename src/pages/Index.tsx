
import React from 'react';
import AgentSystemDashboard from '../components/AgentSystemDashboard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container-fluid px-4 py-3">
          <h1 className="text-xl font-bold text-center">Multi Agent Collaboration System</h1>
          <p className="text-center text-gray-600 text-sm">Powered by real Microsoft AutoGen, LangChain and Rasa frameworks</p>
        </div>
      </header>
      <main className="w-full">
        <AgentSystemDashboard />
      </main>
    </div>
  );
};

export default Index;
