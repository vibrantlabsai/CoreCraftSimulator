import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useDb } from '../db/context';
import { getEntityCounts, getTicketStats, getResolutionMetrics, getConversationStats, getAgentStats, getCoherenceChecks } from '../db/queries';
import { SEED_COUNTS } from '../db/seed';
import { KpiCard } from '../components/KpiCard';

const PIE_COLORS = ['#3b82f6', '#eab308', '#22c55e', '#6b7280', '#ef4444', '#8b5cf6'];

export function Home() {
  const { db } = useDb();
  const data = useMemo(() => {
    if (!db) return null;
    return {
      entities: getEntityCounts(db),
      tickets: getTicketStats(db),
      resolution: getResolutionMetrics(db),
      conversations: getConversationStats(db),
      agents: getAgentStats(db),
      coherence: getCoherenceChecks(db),
    };
  }, [db]);

  if (!data) return null;

  const { entities, tickets, resolution, conversations, agents, coherence } = data;

  // Entity chart data
  const entityChartData = Object.entries(entities.entityCounts)
    .filter(([, v]) => v > 0)
    .map(([table, total]) => ({
      name: table.replace(/_/g, ' '),
      seed: Math.min(total, SEED_COUNTS[table] ?? 0),
      new: Math.max(0, total - (SEED_COUNTS[table] ?? 0)),
    }));

  // Ticket status pie
  const statusData = Object.entries(tickets.byStatus).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(tickets.byPriority).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">World Overview</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Entities" value={entities.totalEntities} sub={`+${entities.totalNew} new`} color="blue" />
        <KpiCard label="Tickets" value={tickets.total} sub={`${tickets.newTickets} new`} color="blue" />
        <KpiCard label="Resolution Rate" value={`${resolution.resolutionRate}%`} color={resolution.resolutionRate > 50 ? 'green' : 'yellow'} />
        <KpiCard label="Avg Msgs/Ticket" value={conversations.avgMessagesPerTicket} color="gray" />
        <KpiCard label="Multi-turn" value={conversations.multiTurn} sub={`of ${tickets.total} tickets`} color="blue" />
        <KpiCard
          label="Coherence"
          value={coherence.passed ? 'PASSED' : 'FAILED'}
          sub={`${coherence.issues.length} issues, ${coherence.warnings.length} warnings`}
          color={coherence.passed ? 'green' : 'red'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity counts */}
        <div className="bg-white rounded-lg shadow p-4 col-span-1 lg:col-span-1">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Entity Counts</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={entityChartData} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="seed" stackId="a" fill="#94a3b8" name="Seed" />
              <Bar dataKey="new" stackId="a" fill="#3b82f6" name="New" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket status */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Ticket Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Ticket Priority</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                {priorityData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets per tick */}
        {tickets.perTick.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Tickets Created per Tick</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tickets.perTick}>
                <XAxis dataKey="tick" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tool usage */}
        {agents.toolUsage.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Agent Tool Usage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agents.toolUsage} layout="vertical" margin={{ left: 100 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="tool" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Agent phases */}
      {agents.byPhase.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Agent Behavior by Phase ({agents.totalTraces} traces)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Phase</th>
                <th className="py-2 text-right">Traces</th>
                <th className="py-2 text-right">Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {agents.byPhase.map((p) => (
                <tr key={p.phase} className="border-b border-gray-100">
                  <td className="py-2">{p.phase}</td>
                  <td className="py-2 text-right">{p.count}</td>
                  <td className="py-2 text-right">{(p.avgDurationMs / 1000).toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
