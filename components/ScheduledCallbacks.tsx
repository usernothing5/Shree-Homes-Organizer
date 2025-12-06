
import React, { useMemo } from 'react';
import { CallLog, CallStatus } from '../types';

interface ScheduledCallbacksProps {
  callLogs: CallLog[];
}

const ScheduledCallbacks: React.FC<ScheduledCallbacksProps> = ({ callLogs }) => {
  const upcomingCallbacks = useMemo(() => {
    const now = new Date();
    // Check for ANY log with a future callback time that isn't junk
    return callLogs
      .filter(log => 
        !log.isJunk &&
        log.callbackTime && 
        new Date(log.callbackTime) > now
      )
      .sort((a, b) => new Date(a.callbackTime!).getTime() - new Date(b.callbackTime!).getTime());
  }, [callLogs]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-slate-700">Upcoming Callbacks</h2>
      {upcomingCallbacks.length > 0 ? (
        <ul className="space-y-3 max-h-60 overflow-y-auto">
          {upcomingCallbacks.map(log => (
            <li key={log.id} className="p-3 bg-slate-50 rounded-md flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">{log.clientName}</p>
                {log.clientPhone && <p className="text-sm text-sky-600">{log.clientPhone}</p>}
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(log.callbackTime!).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  {log.status !== CallStatus.CallBackLater && (
                      <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          {log.status}
                      </span>
                  )}
                </p>
              </div>
              <div className="text-amber-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">No upcoming callbacks scheduled.</p>
      )}
    </div>
  );
};

export default ScheduledCallbacks;
