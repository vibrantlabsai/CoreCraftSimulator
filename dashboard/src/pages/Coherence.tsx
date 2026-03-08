import { useMemo } from 'react';
import { useDb } from '../db/context';
import { getCoherenceChecks, getRelationshipDensity } from '../db/queries';

export function Coherence() {
  const { db } = useDb();
  const checks = useMemo(() => (db ? getCoherenceChecks(db) : null), [db]);
  const density = useMemo(() => (db ? getRelationshipDensity(db) : []), [db]);

  if (!db || !checks) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Data Coherence</h1>

      {/* Pass/fail banner */}
      <div className={`rounded-lg p-6 text-center text-lg font-bold ${checks.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {checks.passed ? 'ALL CHECKS PASSED' : 'CHECKS FAILED'}
      </div>

      {/* Issues */}
      {checks.issues.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-red-600 mb-3">Issues ({checks.issues.length})</h3>
          <ul className="space-y-2">
            {checks.issues.map((issue, i) => (
              <li key={i} className="text-sm text-red-700 bg-red-50 rounded p-2">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {checks.warnings.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-yellow-600 mb-3">Warnings ({checks.warnings.length})</h3>
          <ul className="space-y-2">
            {checks.warnings.map((w, i) => (
              <li key={i} className="text-sm text-yellow-700 bg-yellow-50 rounded p-2">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Relationship density */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Relationship Density</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2">Relationship</th>
              <th className="py-2 text-right">Mean</th>
              <th className="py-2 text-right">Min</th>
              <th className="py-2 text-right">Max</th>
            </tr>
          </thead>
          <tbody>
            {density.map((d) => (
              <tr key={d.label} className="border-b border-gray-100">
                <td className="py-2">{d.label}</td>
                <td className="py-2 text-right">{d.mean}</td>
                <td className="py-2 text-right">{d.min}</td>
                <td className="py-2 text-right">{d.max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
