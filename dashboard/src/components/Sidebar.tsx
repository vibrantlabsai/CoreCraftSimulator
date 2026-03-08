import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Overview' },
  { to: '/customers', label: 'Customers' },
  { to: '/tickets', label: 'Tickets' },
  { to: '/agents', label: 'Agents' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/coherence', label: 'Coherence' },
];

export function Sidebar() {
  return (
    <nav className="w-48 shrink-0 bg-gray-900 text-gray-300 min-h-screen p-4">
      <div className="text-lg font-bold text-white mb-6">EnterpriseSim</div>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-white font-medium'
                    : 'hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
