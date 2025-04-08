
import React from 'react';
import AgentSystemDashboard from '../components/AgentSystemDashboard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold text-center">Agent Orchestra Trace</h1>
          <p className="text-center text-gray-600">Real-time multi-agent collaboration with tracing</p>
        </div>
      </header>
      <main>
        <AgentSystemDashboard />
      </main>
    </div>
  );
};

export default Index;
