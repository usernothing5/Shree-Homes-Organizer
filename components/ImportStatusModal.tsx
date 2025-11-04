import React from 'react';

export interface ImportResults {
  successCount: number;
  errorCount: number;
  errors: string[];
}

interface ImportStatusModalProps {
  results: ImportResults;
  onClose: () => void;
}

const ImportStatusModal: React.FC<ImportStatusModalProps> = ({ results, onClose }) => {
  const { successCount, errorCount, errors } = results;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-700">Import Complete</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="text-sm text-slate-600 space-y-4">
          <div className="flex justify-around p-4 bg-slate-50 rounded-md">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{successCount}</p>
              <p className="text-slate-500">Records Imported</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{errorCount}</p>
              <p className="text-slate-500">Rows Skipped</p>
            </div>
          </div>
          
          {errorCount > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Error Details:</h3>
              <div className="max-h-48 overflow-y-auto bg-slate-100 p-3 rounded-md border border-slate-200 text-xs">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

           {errorCount === 0 && successCount > 0 && (
            <div className="text-center p-4 bg-emerald-50 border-l-4 border-emerald-400">
                <p className="font-semibold text-emerald-800">All records were imported successfully!</p>
            </div>
           )}

        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportStatusModal;