import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDb } from '../db/context';
import { getTickets } from '../db/queries';
import { StatusBadge } from '../components/StatusBadge';

export function Tickets() {
  const { db } = useDb();
  const navigate = useNavigate();
  const allTickets = useMemo(() => (db ? getTickets(db) : []), [db]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const tickets = useMemo(() => {
    let filtered = allTickets;
    if (statusFilter) filtered = filtered.filter((t) => t.status === statusFilter);
    if (priorityFilter) filtered = filtered.filter((t) => t.priority === priorityFilter);
    return filtered;
  }, [allTickets, statusFilter, priorityFilter]);

  const statuses = [...new Set(allTickets.map((t) => t.status))].sort();
  const priorities = [...new Set(allTickets.map((t) => t.priority))].sort();

  if (!db) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Tickets ({tickets.length})</h1>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">All priorities</option>
            {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3 text-right">Msgs</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t.id}
                className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                <td className="px-4 py-3">#{t.id}</td>
                <td className="px-4 py-3">{t.customer_name}</td>
                <td className="px-4 py-3 max-w-xs truncate">{t.subject}</td>
                <td className="px-4 py-3"><StatusBadge value={t.status} /></td>
                <td className="px-4 py-3"><StatusBadge value={t.priority} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">{t.assigned_agent || '—'}</td>
                <td className="px-4 py-3 text-right">{t.msg_count}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{t.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
