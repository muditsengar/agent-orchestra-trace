
import React from 'react';
import AgentSystemDashboard from '../components/AgentSystemDashboard';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container-fluid px-4 py-3">
          <h1 className="text-xl font-bold text-center">Agent Orchestra Trace</h1>
          <p className="text-center text-gray-600 text-sm">Real-time multi-agent collaboration with tracing</p>
        </div>
      </header>
      <main className="w-full">
        <AgentSystemDashboard />
      </main>
    </div>
  );
};

export default Index;
