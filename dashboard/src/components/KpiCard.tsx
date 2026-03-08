interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
}

const colorClasses = {
  blue: 'border-blue-400 bg-blue-50',
  green: 'border-green-400 bg-green-50',
  red: 'border-red-400 bg-red-50',
  yellow: 'border-yellow-400 bg-yellow-50',
  gray: 'border-gray-300 bg-gray-50',
};

export function KpiCard({ label, value, sub, color = 'gray' }: KpiCardProps) {
  return (
    <div className={`rounded-lg border-l-4 p-4 ${colorClasses[color]}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
