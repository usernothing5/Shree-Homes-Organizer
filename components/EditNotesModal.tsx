
import React, { useState } from 'react';
import { CallLog } from '../types';

interface EditNotesModalProps {
  callLog: CallLog;
  onClose: () => void;
  onUpdate: (logId: string, notes: string) => void;
}

const EditNotesModal: React.FC<EditNotesModalProps> = ({ callLog, onClose, onUpdate }) => {
  const [notes, setNotes] = useState(callLog.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(callLog.id, notes.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-700">Edit Notes for {callLog.clientName}</h2>
            <p className="text-sm text-slate-500">Status: {callLog.status}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="editNotes" className="block text-sm font-medium text-slate-600">Call Notes</label>
              <textarea
                id="editNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                placeholder="Add call notes here."
              />
            </div>
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
              className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNotesModal;
