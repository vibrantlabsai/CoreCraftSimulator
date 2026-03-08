import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDb } from '../db/context';
import { getSimEvents, getEventsByTick } from '../db/queries';

const EVENT_COLORS: Record<string, string> = {
  ticket_created: '#3b82f6',
  ticket_assigned: '#8b5cf6',
  customer_responded: '#22c55e',
  agent_acted: '#eab308',
  agent_error: '#ef4444',
  ticket_resolved: '#10b981',
  manager_acted: '#f97316',
};

export function Timeline() {
  const { db } = useDb();
  const events = useMemo(() => (db ? getSimEvents(db) : []), [db]);
  const byTick = useMemo(() => (db ? getEventsByTick(db) : []), [db]);

  if (!db) return null;

  if (events.length === 0) {
    return <div className="text-gray-400 mt-8">No simulation events found.</div>;
  }

  // Pivot for stacked bar chart
  const allTypes = [...new Set(byTick.map((e) => e.type))];
  const ticks = [...new Set(byTick.map((e) => e.tick))].sort((a, b) => a - b);
  const chartData = ticks.map((tick) => {
    const row: Record<string, number | string> = { tick };
    for (const type of allTypes) {
      const entry = byTick.find((e) => e.tick === tick && e.type === type);
      row[type] = entry?.count ?? 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Simulation Timeline ({events.length} events)</h1>

      {/* Stacked chart */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Events per Tick</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="tick" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {allTypes.map((type) => (
              <Bar key={type} dataKey={type} stackId="a" fill={EVENT_COLORS[type] || '#94a3b8'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Event log */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Event Log</h3>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Tick</th>
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{e.tick}</td>
                  <td className="py-2 pr-4">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: EVENT_COLORS[e.event_type] || '#94a3b8' }}
                    >
                      {e.event_type}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{e.agent_id}</td>
                  <td className="py-2 text-xs text-gray-500 max-w-md truncate">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
