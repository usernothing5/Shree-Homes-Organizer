
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
            <li key={log.id} className="p-3 bg-slate-50 rounded-md flex justify-between items-center group hover:bg-slate-100 transition-colors">
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
              <div className="flex items-center gap-2">
                 {log.clientPhone && (
                    <a 
                        href={`tel:${log.clientPhone.replace(/\s+/g, '')}`}
                        className="p-2 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors"
                        title="Call Client"
                        aria-label={`Call ${log.clientName}`}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                         </svg>
                    </a>
                 )}
                  <div className="text-amber-500 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
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
