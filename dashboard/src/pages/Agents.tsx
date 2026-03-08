import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDb } from '../db/context';
import { getAgentStats, getAgentTraces, type AgentTrace } from '../db/queries';

export function Agents() {
  const { db } = useDb();
  const [expandedTrace, setExpandedTrace] = useState<number | null>(null);

  const stats = useMemo(() => (db ? getAgentStats(db) : null), [db]);
  const traces = useMemo(() => (db ? getAgentTraces(db) : []), [db]);

  if (!db || !stats) return null;

  if (!stats.available) {
    return <div className="text-gray-400 mt-8">No simulation traces found (sim_traces table missing).</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Agent Performance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase breakdown */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">By Phase ({stats.totalTraces} traces)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Phase</th>
                <th className="py-2 text-right">Traces</th>
                <th className="py-2 text-right">Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {stats.byPhase.map((p) => (
                <tr key={p.phase} className="border-b border-gray-100">
                  <td className="py-2">{p.phase}</td>
                  <td className="py-2 text-right">{p.count}</td>
                  <td className="py-2 text-right">{(p.avgDurationMs / 1000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tool usage */}
        {stats.toolUsage.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Tool Usage</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, stats.toolUsage.length * 35)}>
              <BarChart data={stats.toolUsage} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="tool" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Trace log */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Execution Traces ({traces.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Tick</th>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Phase</th>
                <th className="py-2 text-right pr-4">Duration</th>
                <th className="py-2 text-right pr-4">Response</th>
                <th className="py-2">Tools</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((t: AgentTrace, i: number) => {
                const tools = (() => {
                  try { return JSON.parse(t.tool_calls || '[]'); } catch { return []; }
                })();
                const isExpanded = expandedTrace === i;
                return (
                  <>
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedTrace(isExpanded ? null : i)}
                    >
                      <td className="py-2 pr-4">{t.tick}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{t.agent_id}</td>
                      <td className="py-2 pr-4">{t.phase}</td>
                      <td className="py-2 text-right pr-4">{(t.duration_ms / 1000).toFixed(1)}s</td>
                      <td className="py-2 text-right pr-4">{t.raw_response?.length || 0} chars</td>
                      <td className="py-2">{tools.length} calls</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${i}-detail`}>
                        <td colSpan={6} className="p-4 bg-gray-50">
                          <div className="space-y-3 text-xs">
                            <div>
                              <div className="font-medium text-gray-500 mb-1">Prompt:</div>
                              <pre className="whitespace-pre-wrap bg-white p-2 rounded border max-h-40 overflow-y-auto">{t.prompt_sent}</pre>
                            </div>
                            <div>
                              <div className="font-medium text-gray-500 mb-1">Response:</div>
                              <pre className="whitespace-pre-wrap bg-white p-2 rounded border max-h-40 overflow-y-auto">{t.raw_response || '(empty)'}</pre>
                            </div>
                            {tools.length > 0 && (
                              <div>
                                <div className="font-medium text-gray-500 mb-1">Tool Calls:</div>
                                <pre className="bg-white p-2 rounded border">{JSON.stringify(tools, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
