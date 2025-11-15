import React from 'react';
import { CallLog } from '../types';

interface ConfirmVisitStatusModalProps {
  log: CallLog;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmVisitStatusModal: React.FC<ConfirmVisitStatusModalProps> = ({ log, onClose, onConfirm }) => {
  const newStatus = log.visitWon ? "'Not Won'" : "'Won'";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-700">Confirm Status Change</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-slate-600">
          <p>
            Are you sure you want to mark the visit for <span className="font-bold">{log.clientName}</span> as {newStatus}?
          </p>
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
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmVisitStatusModal;
