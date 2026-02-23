import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Prediction Auto-Pilot</h1>
        <p className="text-dark-muted">Hello World — skeleton is running.</p>
        <div className="flex gap-3 justify-center text-sm">
          <span className="px-3 py-1 rounded bg-accent-green/20 text-accent-green">Frontend ✓</span>
          <span className="px-3 py-1 rounded bg-accent-blue/20 text-accent-blue">Backend ✓</span>
          <span className="px-3 py-1 rounded bg-accent-yellow/20 text-accent-yellow">SQLite ✓</span>
        </div>
      </div>
    </div>
  );
}
