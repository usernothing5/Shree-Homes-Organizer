
import React, { useMemo, useState, useEffect } from 'react';
import { CallLog, CallStatus, CallerStats } from '../types';
import PieChart from './PieChart';

// The data structure for overrides for a single day
export interface DailyCallerOverrides {
  [callerName: string]: Partial<CallerStats>;
}

interface CallerPerformanceProps {
  todaysLogs: CallLog[];
  overrides: DailyCallerOverrides | undefined;
  onUpdateOverride: (callerName: string, newStats: Partial<CallerStats>) => void;
}

const CallerStatsCard: React.FC<{
  callerName: string;
  calculatedStats: CallerStats;
  initialOverride: Partial<CallerStats> | undefined;
  onUpdate: (newStats: Partial<CallerStats>) => void;
}> = ({ callerName, calculatedStats, initialOverride, onUpdate }) => {
  
  const [stats, setStats] = useState<CallerStats>(() => ({
    totalCalls: initialOverride?.totalCalls ?? calculatedStats.totalCalls,
    answeredCalls: initialOverride?.answeredCalls ?? calculatedStats.answeredCalls,
    interestedClients: initialOverride?.interestedClients ?? calculatedStats.interestedClients,
    notInterestedClients: initialOverride?.notInterestedClients ?? calculatedStats.notInterestedClients,
  }));

  useEffect(() => {
    setStats({
        totalCalls: initialOverride?.totalCalls ?? calculatedStats.totalCalls,
        answeredCalls: initialOverride?.answeredCalls ?? calculatedStats.answeredCalls,
        interestedClients: initialOverride?.interestedClients ?? calculatedStats.interestedClients,
        notInterestedClients: initialOverride?.notInterestedClients ?? calculatedStats.notInterestedClients,
    });
  }, [calculatedStats, initialOverride]);

  const handleStatChange = (statName: keyof CallerStats, value: string) => {
    const numericValue = parseInt(value, 10);
    // Allow empty string for temporary clearing of input, but don't set state to NaN
    if (value === '') {
        setStats(prev => ({ ...prev, [statName]: 0 }));
        return;
    }
    if (!isNaN(numericValue) && numericValue >= 0) {
      const newStats = { ...stats, [statName]: numericValue };
      setStats(newStats);
    }
  };

  const handleBlur = (statName: keyof CallerStats) => {
    const currentVal = stats[statName];
    const calculatedVal = calculatedStats[statName];
    
    const newOverrides = { ...initialOverride };

    if (currentVal !== calculatedVal) {
      newOverrides[statName] = currentVal;
    } else {
      delete newOverrides[statName];
    }
    
    onUpdate(newOverrides);
  };
  
  const notAnswered = Math.max(0, stats.totalCalls - stats.answeredCalls);
  const otherAnswered = Math.max(0, stats.answeredCalls - stats.interestedClients - stats.notInterestedClients);

  const pieData = [
    { value: stats.interestedClients, color: '#10b981', label: 'Interested' }, // emerald-500
    { value: stats.notInterestedClients, color: '#ef4444', label: 'Not Interested' }, // red-500
    { value: otherAnswered, color: '#f59e0b', label: 'Other Answered' }, // amber-500
    { value: notAnswered, color: '#64748b', label: 'Not Answered' } // slate-500
  ];
  
  const StatInput: React.FC<{ label: string; statKey: keyof CallerStats; colorClass?: string }> = ({ label, statKey, colorClass = 'text-slate-800' }) => (
    <div>
        <label htmlFor={`${callerName}-${statKey}`} className="text-slate-500 text-sm">{label}</label>
        <input
            id={`${callerName}-${statKey}`}
            type="number"
            min="0"
            value={String(stats[statKey])}
            onChange={(e) => handleStatChange(statKey, e.target.value)}
            onBlur={() => handleBlur(statKey)}
            className={`font-semibold text-lg w-full mt-1 p-1 border rounded-md text-center bg-white shadow-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all ${colorClass} ${
              (initialOverride?.[statKey] !== undefined) ? 'border-sky-400 ring-1 ring-sky-400' : 'border-slate-300'
            }`}
            aria-label={`${label} for ${callerName}`}
        />
    </div>
  );
  
  const Legend: React.FC<{ data: { label: string, color: string, value: number }[] }> = ({ data }) => (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-2">
        {data.map(item => (
            item.value > 0 ? (
                <div key={item.label} className="flex items-center gap-1.5" title={`${item.label}: ${item.value}`}>
                    <div style={{ backgroundColor: item.color }} className="w-2.5 h-2.5 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-600 truncate">{item.label}</span>
                </div>
            ) : null
        ))}
    </div>
  );

  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <h4 className="font-bold text-slate-700 mb-3 truncate" title={callerName}>{callerName}</h4>
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <PieChart data={pieData} size={110} />
          <Legend data={pieData} />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-grow">
          <StatInput label="Total Calls" statKey="totalCalls" />
          <StatInput label="Answered" statKey="answeredCalls" />
          <StatInput label="Interested" statKey="interestedClients" colorClass="text-emerald-600" />
          <StatInput label="Not Interested" statKey="notInterestedClients" colorClass="text-red-600" />
        </div>
      </div>
    </div>
  );
};


const CallerPerformance: React.FC<CallerPerformanceProps> = ({ todaysLogs, overrides, onUpdateOverride }) => {
  const statsByCaller = useMemo(() => {
    const callers: { [key: string]: CallerStats } = {};

    todaysLogs.forEach(log => {
      const name = log.callerName.trim();
      if (!name) return;

      if (!callers[name]) {
        callers[name] = {
          totalCalls: 0,
          answeredCalls: 0,
          interestedClients: 0,
          notInterestedClients: 0,
        };
      }
      const callerStats = callers[name];
      callerStats.totalCalls++;
      
      // Ringing and NotAnswered count as NOT answered
      if (log.status !== CallStatus.NotAnswered && log.status !== CallStatus.Ringing) {
        callerStats.answeredCalls++;
      }
      
      // Interested includes Booked, SiteVisit, etc.
      if (log.status === CallStatus.Interested || 
          log.status === CallStatus.DetailsShare || 
          log.status === CallStatus.Booked || 
          log.status === CallStatus.SiteVisitGenerated || 
          log.status === CallStatus.SecondSiteVisit) {
        callerStats.interestedClients++;
      }

      if (log.status === CallStatus.NotInterested) {
        callerStats.notInterestedClients++;
      }
    });

    return Object.entries(callers)
      .map(([callerName, stats]) => ({ callerName, stats }))
      .sort((a, b) => a.callerName.localeCompare(b.callerName));
  }, [todaysLogs]);

  if (statsByCaller.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-slate-700">Caller Performance (Today)</h2>
      <p className="text-xs text-slate-500 -mt-3 mb-4">Stats are editable. Manually edited fields have a blue border.</p>
      <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
        {statsByCaller.map(({ callerName, stats }) => (
          <CallerStatsCard 
              key={callerName} 
              callerName={callerName} 
              calculatedStats={stats}
              initialOverride={overrides?.[callerName]}
              onUpdate={(newCallerOverrides) => onUpdateOverride(callerName, newCallerOverrides)}
          />
        ))}
      </div>
    </div>
  );
};

export default CallerPerformance;
