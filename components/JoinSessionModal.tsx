import React, { useState, useEffect } from 'react';

interface JoinSessionModalProps {
  onJoin: (code: string) => void;
  onClose: () => void;
  error: string | null;
}

const JoinSessionModal: React.FC<JoinSessionModalProps> = ({ onJoin, onClose, error }) => {
  const [code, setCode] = useState('');
  const [displayError, setDisplayError] = useState(error);

  useEffect(() => {
    setDisplayError(error);
  }, [error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onJoin(code.trim());
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if(displayError) {
        setDisplayError(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-700">Join Live Session</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Paste the session code you received to view the shared call log.
        </p>

        <div>
          <label htmlFor="join-code" className="block text-sm font-medium text-slate-600">Session Code</label>
          <textarea
            id="join-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            rows={4}
            className={`mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm ${
                displayError ? 'border-red-500 ring-red-500' : 'border-slate-300'
            }`}
            placeholder="Paste code here..."
            required
            autoFocus
          />
          {displayError && (
              <p className="mt-2 text-sm text-red-600">{displayError}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!code.trim()}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300 disabled:cursor-not-allowed"
          >
            Join
          </button>
        </div>
      </form>
    </div>
  );
};

export default JoinSessionModal;
