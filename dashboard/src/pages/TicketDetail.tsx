import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDb } from '../db/context';
import { getTicketDetail } from '../db/queries';
import { StatusBadge } from '../components/StatusBadge';
import { ChatThread } from '../components/ChatThread';

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { db } = useDb();

  const data = useMemo(() => {
    if (!db || !id) return null;
    return getTicketDetail(db, parseInt(id));
  }, [db, id]);

  if (!data) return <div className="text-gray-400">Ticket not found.</div>;

  const t = data.ticket;

  return (
    <div className="space-y-6">
      <Link to="/tickets" className="text-blue-600 hover:underline text-sm">&larr; All Tickets</Link>

      {/* Ticket Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-bold text-gray-800">#{t.id as number} {t.subject as string}</h1>
          <StatusBadge value={t.status as string} />
          <StatusBadge value={t.priority as string} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Customer:</span>{' '}
            <Link to={`/customers/${t.customer_id}`} className="text-blue-600 hover:underline">{data.customerName}</Link>
          </div>
          <div><span className="text-gray-500">Agent:</span> {t.assigned_agent as string || 'Unassigned'}</div>
          <div><span className="text-gray-500">Created:</span> {t.created_at as string}</div>
          <div><span className="text-gray-500">Resolved:</span> {(t.resolved_at as string) || '—'}</div>
        </div>
      </div>

      {/* Conversation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Conversation ({data.messages.length} messages)
        </h2>
        <ChatThread messages={data.messages} />
      </div>
    </div>
  );
}
