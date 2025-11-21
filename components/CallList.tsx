
import React, { useState, useMemo, useEffect } from 'react';
import { CallLog, CallStatus } from '../types';

interface CallListProps {
  callLogs: CallLog[];
  deleteCallLog: (id: string) => void;
  onEditNotes: (log: CallLog) => void;
  onUpdateFollowUpCount: (id: string, count: number) => void;
  onRequestVisitStatusUpdate: (log: CallLog) => void;
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

const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const CallLogRow: React.FC<{ log: CallLog; deleteCallLog: (id: string) => void; onEditNotes: (log: CallLog) => void; onUpdateFollowUpCount: (id: string, count: number) => void; onRequestVisitStatusUpdate: (log: CallLog) => void; }> = ({ log, deleteCallLog, onEditNotes, onUpdateFollowUpCount, onRequestVisitStatusUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingFollowUp, setIsEditingFollowUp] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(String(log.followUpCount || 0));

  const hasNotes = log.notes && log.notes.trim().length > 0;

  const handleSaveFollowUp = () => {
    const newCount = parseInt(followUpCount, 10);
    if (!isNaN(newCount)) {
        onUpdateFollowUpCount(log.id, newCount);
    }
    setIsEditingFollowUp(false);
  };

  return (
    <>
      <tr 
        onClick={() => hasNotes && setIsExpanded(!isExpanded)} 
        className={hasNotes ? 'cursor-pointer hover:bg-slate-50' : ''}
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
          <div>{log.clientName}</div>
          {log.clientPhone && <div className="text-xs text-slate-500">{log.clientPhone}</div>}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
          {log.callerName}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(log.status)}`}>
            {log.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
            {(log.status === CallStatus.Interested || log.status === CallStatus.DetailsShare) && (
            <button
                type="button"
                className={`${
                log.visitWon ? 'bg-green-500' : 'bg-slate-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2`}
                role="switch"
                aria-checked={!!log.visitWon}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestVisitStatusUpdate(log);
                }}
            >
                <span className="sr-only">Toggle Visit Won</span>
                <span
                aria-hidden="true"
                className={`${
                    log.visitWon ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </button>
            )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
        {isEditingFollowUp ? (
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              value={followUpCount}
              onChange={(e) => setFollowUpCount(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={handleSaveFollowUp}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveFollowUp();
                }
              }}
              className="w-16 text-center px-1 py-0.5 border border-sky-500 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
              autoFocus
              min="0"
            />
          </div>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsEditingFollowUp(true); }}
            className="flex items-center justify-center gap-2 text-slate-600 hover:text-sky-700 w-full"
            aria-label={`Edit follow-up count for ${log.clientName}`}
          >
            <span>{log.followUpCount || 0}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-40" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
          </button>
        )}
      </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
          {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button 
            onClick={(e) => { e.stopPropagation(); onEditNotes(log); }} 
            className="text-slate-500 hover:text-sky-700 p-1"
            aria-label={`Edit notes for ${log.clientName}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); deleteCallLog(log.id); }} 
            className="text-red-600 hover:text-red-900 p-1"
            aria-label={`Delete log for ${log.clientName}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
            </svg>
          </button>
        </td>
      </tr>
      {isExpanded && hasNotes && (
        <tr className="bg-slate-50">
          <td colSpan={8} className="px-6 py-4 text-sm text-slate-600 border-t border-slate-200">
            <h4 className="font-semibold mb-1 text-slate-800">Notes:</h4>
            <p className="whitespace-pre-wrap pl-2 border-l-2 border-slate-300">{log.notes}</p>
          </td>
        </tr>
      )}
    </>
  );
};


const CallList: React.FC<CallListProps> = ({ callLogs, deleteCallLog, onEditNotes, onUpdateFollowUpCount, onRequestVisitStatusUpdate }) => {
  const [view, setView] = useState<'today' | 'history'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [initialized, setInitialized] = useState(false);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) {
        return callLogs;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return callLogs.filter(log => 
        log.clientName.toLowerCase().includes(lowercasedQuery) ||
        (log.clientPhone && log.clientPhone.replace(/\s+/g, '').includes(lowercasedQuery.replace(/\s+/g, '')))
    );
  }, [callLogs, searchQuery]);
  
  const todaysLogs = useMemo(() => filteredLogs.filter(log => isToday(new Date(log.timestamp))), [filteredLogs]);

  const hasHistory = useMemo(() => {
      const todayString = new Date().toISOString().split('T')[0];
      return callLogs.some(log => log.timestamp.split('T')[0] !== todayString);
  }, [callLogs]);

  // AUTO-SWITCH to History if Today is empty but we have logs
  useEffect(() => {
      if (!initialized && callLogs.length > 0) {
          if (todaysLogs.length === 0) {
              setView('history');
          }
          setInitialized(true);
      }
  }, [callLogs, todaysLogs, initialized]);


  const historicalLogsByDate = useMemo(() => {
    const groups: { [key: string]: CallLog[] } = {};
    const todayString = new Date().toISOString().split('T')[0];

    filteredLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const dateString = logDate.toISOString().split('T')[0];

      if (dateString !== todayString || view === 'history') {
        // If viewing history, include everything not in "Today" view, 
        // OR if specifically in history view, we can group everything by date.
        // Standard logic: History usually means "past". But if we switch to history view because today is empty,
        // we should just show all dates.
        
        if (!groups[dateString]) {
          groups[dateString] = [];
        }
        groups[dateString].push(log);
      }
    });

    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
  }, [filteredLogs, view]);
  
  const renderTable = (logs: CallLog[]) => (
    <table className="min-w-full divide-y divide-slate-200">
      <thead className="bg-slate-50">
        <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Caller</th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Visit Won</th>
          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Follow-ups</th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
          <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-200">
        {logs.map((log) => (
          <CallLogRow key={log.id} log={log} deleteCallLog={deleteCallLog} onEditNotes={onEditNotes} onUpdateFollowUpCount={onUpdateFollowUpCount} onRequestVisitStatusUpdate={onRequestVisitStatusUpdate} />
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-slate-700">
          {view === 'today' ? "Today's Call Logs" : "All Call Logs"}
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Search name or phone..."
                    aria-label="Search call logs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition"
                />
            </div>
            <div className="flex items-center bg-slate-200 rounded-full p-1 text-sm self-end sm:self-center">
                <button
                onClick={() => setView('today')}
                className={`px-3 py-1 rounded-full transition-colors ${view === 'today' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                Today
                </button>
                <button
                onClick={() => setView('history')}
                className={`px-3 py-1 rounded-full transition-colors ${view === 'history' ? 'bg-white text-slate-800 shadow' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                History / All
                </button>
            </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        {view === 'today' && (
          todaysLogs.length > 0 ? (
            renderTable(todaysLogs)
          ) : (
            <div className="text-center py-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-slate-500">
                {searchQuery ? `No logs found matching "${searchQuery}".` : 'No calls logged for today.'}
              </p>
              {callLogs.length > 0 && (
                 <button onClick={() => setView('history')} className="mt-4 bg-sky-50 text-sky-700 px-4 py-2 rounded-md hover:bg-sky-100 transition-colors text-sm font-medium border border-sky-200">
                     View All Logs
                 </button>
              )}
            </div>
          )
        )}
        {view === 'history' && (
          historicalLogsByDate.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Caller</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Visit Won</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Follow-ups</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {historicalLogsByDate.map(([date, logs]) => (
                  <React.Fragment key={date}>
                    <tr className="bg-slate-100">
                      <td colSpan={8} className="px-6 py-2 text-sm font-bold text-slate-600">
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                      </td>
                    </tr>
                    {logs.map(log => (
                      <CallLogRow key={log.id} log={log} deleteCallLog={deleteCallLog} onEditNotes={onEditNotes} onUpdateFollowUpCount={onUpdateFollowUpCount} onRequestVisitStatusUpdate={onRequestVisitStatusUpdate}/>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10">
               <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <p className="mt-2 text-sm text-slate-500">
                {searchQuery ? `No logs found matching "${searchQuery}".` : 'No call logs found.'}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default CallList;
