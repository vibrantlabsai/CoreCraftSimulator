import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDb } from '../db/context';
import { getCustomerDetail } from '../db/queries';
import { StatusBadge } from '../components/StatusBadge';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { db } = useDb();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (!db || !id) return null;
    return getCustomerDetail(db, id);
  }, [db, id]);

  if (!data) return <div className="text-gray-400">Customer not found.</div>;

  const c = data.customer;

  return (
    <div className="space-y-6">
      <Link to="/customers" className="text-blue-600 hover:underline text-sm">&larr; All Customers</Link>

      {/* Customer Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{c.name as string}</h1>
          {c.vip_status ? <StatusBadge value="VIP" /> : null}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">ID:</span> <span className="font-mono">{c.id as string}</span></div>
          <div><span className="text-gray-500">Email:</span> {c.email as string}</div>
          <div><span className="text-gray-500">Phone:</span> {c.phone as string}</div>
          <div><span className="text-gray-500">Address:</span> {c.address as string}</div>
          <div><span className="text-gray-500">Satisfaction:</span> {(c.satisfaction_score as number)?.toFixed(2)}</div>
          <div><span className="text-gray-500">Patience:</span> {(c.patience_level as number)?.toFixed(2)}</div>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Orders ({data.orders.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2">ID</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2">Products</th>
              <th className="py-2">Tracking</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id as string} className="border-b border-gray-100">
                <td className="py-2 font-mono text-xs">{o.id as string}</td>
                <td className="py-2"><StatusBadge value={o.status as string} /></td>
                <td className="py-2 text-right">${(o.total as number)?.toFixed(2)}</td>
                <td className="py-2 text-gray-500 text-xs">{o.products as string}</td>
                <td className="py-2 text-xs">{o.tracking_number as string || '—'}</td>
                <td className="py-2 text-xs text-gray-400">{o.created_at as string}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tickets */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Tickets ({data.tickets.length})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2">#</th>
              <th className="py-2">Subject</th>
              <th className="py-2">Status</th>
              <th className="py-2">Priority</th>
              <th className="py-2 text-right">Messages</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.tickets.map((t) => (
              <tr
                key={t.id as number}
                className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                <td className="py-2">#{t.id as number}</td>
                <td className="py-2">{t.subject as string}</td>
                <td className="py-2"><StatusBadge value={t.status as string} /></td>
                <td className="py-2"><StatusBadge value={t.priority as string} /></td>
                <td className="py-2 text-right">{t.msg_count as number}</td>
                <td className="py-2 text-xs text-gray-400">{t.created_at as string}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
