import { useCallback } from 'react';
import { useDb } from './context';

export function DbLoader() {
  const { dbName, loading, error, loadFile } = useDb();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  if (dbName) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">DB:</span>
        <span className="font-medium text-gray-800">{dbName}</span>
        <label className="cursor-pointer text-blue-600 hover:underline text-xs">
          Change
          <input type="file" accept=".db,.sqlite" className="hidden" onChange={handleChange} />
        </label>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center max-w-lg mx-auto mt-24"
    >
      {loading ? (
        <div className="text-gray-500">Loading database...</div>
      ) : (
        <>
          <div className="text-gray-400 text-lg mb-2">Drop a world.db file here</div>
          <div className="text-gray-300 text-sm mb-4">or</div>
          <label className="cursor-pointer inline-block rounded bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700">
            Browse files
            <input type="file" accept=".db,.sqlite" className="hidden" onChange={handleChange} />
          </label>
          {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
        </>
      )}
    </div>
  );
}
