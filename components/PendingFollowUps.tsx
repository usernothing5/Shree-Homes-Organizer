
import React, { useMemo } from 'react';
import { CallLog, CallStatus } from '../types';

interface PendingFollowUpsProps {
  callLogs: CallLog[];
  onUpdate: (log: CallLog) => void;
}

const PendingFollowUps: React.FC<PendingFollowUpsProps> = ({ callLogs, onUpdate }) => {
  const pendingLogs = useMemo(() => {
    return callLogs.filter(log => log.status === CallStatus.DetailsShare);
  }, [callLogs]);

  if (pendingLogs.length === 0) {
    return null; // Don't render the component if there's nothing to show
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-slate-700">Pending Follow-ups</h2>
      <ul className="space-y-3 max-h-60 overflow-y-auto">
        {pendingLogs.map(log => (
          <li key={log.id} className="p-3 bg-slate-50 rounded-md flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-800">{log.clientName}</p>
              {log.clientPhone && <p className="text-sm text-sky-600">{log.clientPhone}</p>}
              <p className="text-xs text-slate-500 mt-1">
                Logged on: {new Date(log.timestamp).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => onUpdate(log)}
              className="px-3 py-1 bg-sky-600 text-white text-sm font-semibold rounded-md hover:bg-sky-700 transition-colors"
            >
              Update
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PendingFollowUps;
