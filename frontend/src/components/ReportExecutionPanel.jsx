import React from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

const agents = [
  { name: 'Research', icon: '🔬', description: 'Validating sources...' },
  { name: 'Analysis', icon: '📊', description: 'Processing data...' },
  { name: 'Visualization', icon: '🎨', description: 'Generating charts...' },
  { name: 'Insight', icon: '💡', description: 'Finding patterns...' },
  { name: 'Report', icon: '📝', description: 'Assembling report...' },
];

export default function ReportExecutionPanel({ currentAgent, isGenerating }) {
  const getAgentIndex = (agentName) => {
    return agents.findIndex((a) => a.name.toLowerCase() === agentName?.toLowerCase());
  };

  const currentIndex = getAgentIndex(currentAgent);

  return (
    <div className="w-full bg-gradient-to-r from-purple-900/20 to-purple-900/10 rounded-lg p-6 border border-purple-500/30">
      <h3 className="text-lg font-bold text-white mb-6">Agent Execution Progress</h3>

      <div className="space-y-3">
        {agents.map((agent, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={agent.name} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 relative">
                {isCompleted ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : isCurrent && isGenerating ? (
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                ) : (
                  <div className={`w-8 h-8 rounded-full border-2 ${isPending ? 'border-gray-600 bg-gray-900/50' : 'border-purple-500 bg-purple-900/30'}`} />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{agent.icon}</span>
                  <span className={`font-semibold ${isCurrent && isGenerating ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
                    {agent.name} Agent
                  </span>
                </div>
                {isCurrent && isGenerating && (
                  <p className="text-xs text-purple-300 mt-1">{agent.description}</p>
                )}
                {isCompleted && (
                  <p className="text-xs text-green-300 mt-1">✓ Completed</p>
                )}
              </div>

              {/* Progress line */}
              {idx < agents.length - 1 && (
                <div className={`absolute left-4 top-12 w-0.5 h-6 ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {!isGenerating && currentIndex === agents.length - 1 && (
        <div className="mt-6 p-3 bg-green-900/20 border border-green-500/30 rounded text-green-300 text-sm text-center">
          ✓ Report generation completed successfully!
        </div>
      )}
    </div>
  );
}
