import React, { useState, useCallback } from 'react';
import { CallLog } from '../types';

interface ShareSessionModalProps {
  log: CallLog;
  code: string;
  onClose: () => void;
}

const ShareSessionModal: React.FC<ShareSessionModalProps> = ({ log, code, onClose }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy Code');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Code'), 2000);
    }, (err) => {
      console.error('Could not copy text: ', err);
      setCopyButtonText('Failed to copy');
      setTimeout(() => setCopyButtonText('Copy Code'), 2000);
    });
  }, [code]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h2 className="text-xl font-bold text-slate-700">Share Live Session</h2>
                <p className="text-sm text-slate-500">For: {log.clientName}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        
        <p className="text-sm text-slate-600 mb-4">
          Send this code to a colleague. When they enter it, they'll be able to view this call log's details on their screen.
        </p>

        <div>
            <label htmlFor="session-code" className="sr-only">Session Code</label>
            <textarea
                id="session-code"
                value={code}
                readOnly
                rows={4}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm sm:text-sm text-slate-700 font-mono"
                onFocus={(e) => e.target.select()}
            />
            <button
                onClick={handleCopy}
                className="mt-2 w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                {copyButtonText}
            </button>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareSessionModal;
