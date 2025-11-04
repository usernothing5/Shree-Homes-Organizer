import React, { useMemo } from 'react';
import { CallLog, CallStatus } from '../types';

interface SummaryHistoryProps {
  callLogs: CallLog[];
}

const SummaryHistory: React.FC<SummaryHistoryProps> = ({ callLogs }) => {
  const historicalStats = useMemo(() => {
    const statsByDate: { [key: string]: { totalCalls: number; answeredCalls: number; interestedClients: number } } = {};
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    callLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const dateString = logDate.toISOString().split('T')[0];

      if (dateString === todayString) {
        return; // Skip today's logs for the history view
      }

      if (!statsByDate[dateString]) {
        statsByDate[dateString] = { totalCalls: 0, answeredCalls: 0, interestedClients: 0 };
      }

      statsByDate[dateString].totalCalls++;
      if (log.status !== CallStatus.NotAnswered) {
        statsByDate[dateString].answeredCalls++;
      }
      if (log.status === CallStatus.Interested || log.status === CallStatus.DetailsShare) {
        statsByDate[dateString].interestedClients++;
      }
    });

    return Object.entries(statsByDate)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [callLogs]);

  if (historicalStats.length === 0) {
    return (
      <div className="text-center py-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        <p className="mt-2 text-sm text-slate-500">No past call summary data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
      {historicalStats.map(stat => (
        <div key={stat.date} className="p-4 bg-slate-50 rounded-lg">
          <p className="font-bold text-slate-700 mb-2">
            {new Date(stat.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="font-semibold text-slate-800">{stat.totalCalls}</p>
              <p className="text-slate-500">Total</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{stat.answeredCalls}</p>
              <p className="text-slate-500">Answered</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{stat.interestedClients}</p>
              <p className="text-slate-500">Interested</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryHistory;