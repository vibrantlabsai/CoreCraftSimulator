import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Database } from 'sql.js';

interface DbContextType {
  db: Database | null;
  dbName: string | null;
  loading: boolean;
  error: string | null;
  loadFile: (file: File) => Promise<void>;
  loadUrl: (url: string, name?: string) => Promise<void>;
}

const DbContext = createContext<DbContextType>({
  db: null,
  dbName: null,
  loading: false,
  error: null,
  loadFile: async () => {},
  loadUrl: async () => {},
});

async function openDb(buffer: ArrayBuffer): Promise<Database> {
  // sql.js is a UMD module — use dynamic import to get the init function
  const sqlPromise = await import('sql.js');
  const initSqlJs = sqlPromise.default || sqlPromise;
  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });
  return new SQL.Database(new Uint8Array(buffer));
}

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [dbName, setDbName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setNewDb = useCallback((newDb: Database, name: string) => {
    setDb((prev) => {
      prev?.close();
      return newDb;
    });
    setDbName(name);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const newDb = await openDb(await file.arrayBuffer());
      setNewDb(newDb, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load database');
    } finally {
      setLoading(false);
    }
  }, [setNewDb]);

  const loadUrl = useCallback(async (url: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
      const newDb = await openDb(await resp.arrayBuffer());
      setNewDb(newDb, name || url.split('/').pop() || 'world.db');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load database');
    } finally {
      setLoading(false);
    }
  }, [setNewDb]);

  // Auto-load from ?db= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dbParam = params.get('db');
    if (dbParam) {
      loadUrl(dbParam);
    }
  }, [loadUrl]);

  return (
    <DbContext.Provider value={{ db, dbName, loading, error, loadFile, loadUrl }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
