
import React, { useMemo, useState } from 'react';
import { CallLog, CallStatus } from '../types';
import SummaryHistory from './SummaryHistory';

interface StatsProps {
  callLogs: CallLog[];
}

const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

// FIX: Changed icon type from JSX.Element to React.ReactNode to avoid using the global JSX namespace.
const StatsCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className={`flex items-center p-4 bg-white rounded-lg shadow`}>
        <div className={`p-3 rounded-full ${color} text-white mr-4`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const Stats: React.FC<StatsProps> = ({ callLogs }) => {
  const [view, setView] = useState<'today' | 'history'>('today');

  const dailyStats = useMemo(() => {
    // Filter out junk leads
    const todaysLogs = callLogs.filter(log => !log.isJunk && isToday(new Date(log.timestamp)));
    
    const totalCalls = todaysLogs.length;
    
    // Ringing and NotAnswered both count as not answered
    const answeredCalls = todaysLogs.filter(log => 
        log.status !== CallStatus.NotAnswered && 
        log.status !== CallStatus.Ringing
    ).length;

    // Interested includes multiple positive outcomes
    const interestedClients = todaysLogs.filter(log => 
      log.status === CallStatus.Interested || 
      log.status === CallStatus.DetailsShare ||
      log.status === CallStatus.Booked ||
      log.status === CallStatus.SiteVisitGenerated ||
      log.status === CallStatus.SecondSiteVisit
    ).length;

    const notInterestedClients = todaysLogs.filter(log => log.status === CallStatus.NotInterested).length;
    
    return { totalCalls, answeredCalls, interestedClients, notInterestedClients };
  }, [callLogs]);

  const hasHistory = useMemo(() => {
    const todayString = new Date().toISOString().split('T')[0];
    return callLogs.some(log => !log.isJunk && log.timestamp.split('T')[0] !== todayString);
  }, [callLogs]);


  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-700">
          {view === 'today' ? "Today's Summary" : "Summary History"}
        </h2>
        {hasHistory && (
          <div className="flex items-center bg-slate-200 rounded-full p-1 text-sm">
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
              History
            </button>
          </div>
        )}
      </div>
      {view === 'today' ? (
        <div className="space-y-4">
          <StatsCard 
              title="Total Calls Made" 
              value={dailyStats.totalCalls}
              color="bg-sky-500"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
          />
          <StatsCard 
              title="Calls Answered" 
              value={dailyStats.answeredCalls}
              color="bg-amber-500"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2 2m-2-2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8" /></svg>}
          />
          <StatsCard 
              title="Interested Clients" 
              value={dailyStats.interestedClients}
              color="bg-emerald-500"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          />
          <StatsCard 
              title="Not Interested" 
              value={dailyStats.notInterestedClients}
              color="bg-red-500"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
          />
        </div>
      ) : (
        <SummaryHistory callLogs={callLogs} />
      )}
    </div>
  );
};

export default Stats;
