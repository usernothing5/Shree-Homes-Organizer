import React from 'react';
import { CallLog, CallStatus } from '../types';

interface ViewSessionModalProps {
  log: CallLog;
  onClose: () => void;
}

const getStatusColor = (status: CallStatus): string => {
  switch (status) {
    case CallStatus.Interested:
      return 'bg-emerald-100 text-emerald-800';
    case CallStatus.DetailsShare:
      return 'bg-sky-100 text-sky-800';
    case CallStatus.NotInterested:
      return 'bg-red-100 text-red-800';
    case CallStatus.NotAnswered:
      return 'bg-slate-200 text-slate-800';
    case CallStatus.CallBackLater:
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="text-base text-slate-800 mt-1">{value}</div>
    </div>
);

const ViewSessionModal: React.FC<ViewSessionModalProps> = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4 max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-700">Viewing Session</h2>
                    <p className="text-sm text-slate-500">Read-only details for: {log.clientName}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 bg-slate-50 rounded-lg">
                <DetailItem label="Client Name" value={<span className="font-semibold">{log.clientName}</span>} />
                <DetailItem label="Client Phone" value={log.clientPhone || 'N/A'} />
                <DetailItem label="Caller Name" value={log.callerName} />
                <DetailItem label="Status" value={
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                    </span>
                } />
                <DetailItem label="Log Date & Time" value={new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} />
                {log.status === CallStatus.CallBackLater && log.callbackTime && (
                     <DetailItem label="Scheduled Callback" value={new Date(log.callbackTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} />
                )}
                 <DetailItem label="Follow-up Count" value={String(log.followUpCount || 0)} />
            </div>
            {log.notes && (
                <div>
                    <h3 className="text-base font-semibold text-slate-700 mb-2">Notes:</h3>
                    <div className="p-3 bg-slate-100 rounded-md border border-slate-200">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{log.notes}</p>
                    </div>
                </div>
            )}
        </div>

        <div className="mt-6 flex justify-end flex-shrink-0">
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

export default ViewSessionModal;
