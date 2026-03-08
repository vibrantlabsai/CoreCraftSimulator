import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DbProvider, useDb } from './db/context';
import { DbLoader } from './db/loader';
import { Sidebar } from './components/Sidebar';
import { Home } from './pages/Home';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { Tickets } from './pages/Tickets';
import { TicketDetail } from './pages/TicketDetail';
import { Agents } from './pages/Agents';
import { Timeline } from './pages/Timeline';
import { Coherence } from './pages/Coherence';

function AppContent() {
  const { db } = useDb();

  if (!db) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">EnterpriseSim Dashboard</h1>
          <p className="text-gray-500 text-center mb-8">Load a world.db file to explore your simulation</p>
          <DbLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-4">
          <DbLoader />
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/coherence" element={<Coherence />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DbProvider>
        <AppContent />
      </DbProvider>
    </BrowserRouter>
  );
}
