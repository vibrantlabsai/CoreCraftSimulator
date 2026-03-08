import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDb } from '../db/context';
import { getCustomers } from '../db/queries';
import { StatusBadge } from '../components/StatusBadge';

export function Customers() {
  const { db } = useDb();
  const navigate = useNavigate();
  const customers = useMemo(() => (db ? getCustomers(db) : []), [db]);

  if (!db) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-center">VIP</th>
              <th className="px-4 py-3 text-right">Satisfaction</th>
              <th className="px-4 py-3 text-right">Patience</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Tickets</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/customers/${c.id}`)}
              >
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                <td className="px-4 py-3 text-center">
                  {c.vip_status ? <StatusBadge value="VIP" /> : ''}
                </td>
                <td className="px-4 py-3 text-right">{(c.satisfaction_score as number)?.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{(c.patience_level as number)?.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{c.orderCount}</td>
                <td className="px-4 py-3 text-right">{c.ticketCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
