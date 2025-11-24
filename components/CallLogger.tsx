
import React, { useState, useEffect, useRef } from 'react';
import { CallLog, CallStatus } from '../types';

interface CallLoggerProps {
  addCallLog: (log: Omit<CallLog, 'id' | 'timestamp' | 'projectId'>) => Promise<void>;
  isReady: boolean;
  projectName?: string;
}

const getInitialIndianDateTime = () => {
  const now = new Date();
  
  // Formatter for YYYY-MM-DD format
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Formatter for 12-hour time with AM/PM
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', // '01', '02', ... '12'
    minute: '2-digit',
    hour12: true,
  });

  const date = dateFormatter.format(now);
  const timeParts = timeFormatter.formatToParts(now);

  const getPartValue = (type: Intl.DateTimeFormatPartTypes) =>
    timeParts.find((part) => part.type === type)?.value || '';

  return {
    date,
    hour: getPartValue('hour'),
    minute: getPartValue('minute'),
    period: (getPartValue('dayPeriod') as 'AM' | 'PM' | 'am' | 'pm').toUpperCase() as 'AM' | 'PM',
  };
};


const CallLogger: React.FC<CallLoggerProps> = ({ addCallLog, isReady, projectName }) => {
  const [callerName, setCallerName] = useState(() => localStorage.getItem('callerName') || '');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [status, setStatus] = useState<CallStatus>(CallStatus.Interested);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackHour, setCallbackHour] = useState('');
  const [callbackMinute, setCallbackMinute] = useState('');
  const [callbackPeriod, setCallbackPeriod] = useState<'AM' | 'PM'>('AM');
  const [notes, setNotes] = useState('');
  const [visitWon, setVisitWon] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Ref to track if component is mounted to prevent state updates on unmount
  const isMounted = useRef(true);
  useEffect(() => {
      return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('callerName', callerName);
  }, [callerName]);

  useEffect(() => {
    if (status === CallStatus.CallBackLater) {
      if (!callbackDate) { // Only set if not already set
        const { date, hour, minute, period } = getInitialIndianDateTime();
        setCallbackDate(date);
        setCallbackHour(hour);
        setCallbackMinute(minute);
        setCallbackPeriod(period);
      }
    }
  }, [status, callbackDate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isReady) {
        // Silently return if not ready, UI is already disabled
        return;
    }
    if (!callerName.trim()) {
      alert('Please enter the caller name.');
      return;
    }
    if (!clientName.trim()) {
      alert('Please enter a client name.');
      return;
    }

    setIsSaving(true);

    const log: Omit<CallLog, 'id' | 'timestamp' | 'projectId'> = {
      callerName: callerName.trim(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      status,
      notes: notes.trim(),
      visitWon: false,
    };
    
    if (status === CallStatus.Interested || status === CallStatus.DetailsShare) {
        log.visitWon = visitWon;
    }

    if (callbackDate && callbackHour && callbackMinute) {
      if (status === CallStatus.CallBackLater || status === CallStatus.DetailsShare) {
        let hour24 = parseInt(callbackHour, 10);
        if (callbackPeriod === 'PM' && hour24 < 12) {
          hour24 += 12;
        }
        if (callbackPeriod === 'AM' && hour24 === 12) { // Midnight case
          hour24 = 0;
        }

        const [year, month, day] = callbackDate.split('-').map(Number);
        const combinedDateTime = new Date(year, month - 1, day, hour24, Number(callbackMinute));
        log.callbackTime = combinedDateTime.toISOString();
      }
    }

    try {
        await addCallLog(log);
        
        if (isMounted.current) {
            // Success
            setClientName('');
            setClientPhone('');
            setStatus(CallStatus.Interested);
            setCallbackDate('');
            setCallbackHour('');
            setCallbackMinute('');
            setCallbackPeriod('AM');
            setNotes('');
            setVisitWon(false);
        }
    } catch (error: any) {
        console.error("Error saving log:", error);
        alert(`Note: We encountered an issue saving the log. Please check your internet connection and try again.`);
    } finally {
        if (isMounted.current) {
            setIsSaving(false);
        }
    }
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-sky-500">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-700">Log New Call</h2>
        {projectName && (
            <span className="text-xs bg-sky-100 text-sky-800 px-2 py-1 rounded-full font-medium truncate max-w-[150px]">
                {projectName}
            </span>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="callerName" className="block text-sm font-medium text-slate-600">Caller Name</label>
          <input
            id="callerName"
            type="text"
            value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            placeholder="Your Name"
            required
          />
        </div>
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-slate-600">Client Name</label>
          <input
            id="clientName"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            placeholder="John Doe"
            required
          />
        </div>
        <div>
          <label htmlFor="clientPhone" className="block text-sm font-medium text-slate-600">Client Phone</label>
          <input
            id="clientPhone"
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            placeholder="e.g., 9876543210"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-600">FEEDBACK</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CallStatus)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
          >
            {Object.values(CallStatus).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {(status === CallStatus.Interested || status === CallStatus.DetailsShare) && (
            <div className="flex items-center justify-between pt-2">
                <span className="flex-grow flex flex-col">
                    <label htmlFor="visitWon" className="text-sm font-medium text-slate-600">Visit Won</label>
                    <span className="text-xs text-slate-500">Mark if the client visit was successful.</span>
                </span>
                <button
                    type="button"
                    id="visitWon"
                    className={`${
                    visitWon ? 'bg-green-500' : 'bg-slate-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2`}
                    role="switch"
                    aria-checked={visitWon}
                    onClick={() => setVisitWon(!visitWon)}
                >
                    <span className="sr-only">Visit Won</span>
                    <span
                    aria-hidden="true"
                    className={`${
                        visitWon ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                </button>
            </div>
        )}
        {(status === CallStatus.CallBackLater || status === CallStatus.DetailsShare) && (
          <div>
            <label className="block text-sm font-medium text-slate-600">
              {status === CallStatus.CallBackLater ? 'Callback Date & Time' : 'Schedule Follow-up (Optional)'}
            </label>
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
               <input
                id="callbackDate"
                type="date"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                required={status === CallStatus.CallBackLater}
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  id="callbackHour"
                  value={callbackHour}
                  onChange={(e) => setCallbackHour(e.target.value)}
                  className="block w-full pl-3 pr-8 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                  required={status === CallStatus.CallBackLater}
                >
                  <option value="" disabled>HH</option>
                  {hourOptions.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                </select>
                <select
                  id="callbackMinute"
                  value={callbackMinute}
                  onChange={(e) => setCallbackMinute(e.target.value)}
                  className="block w-full pl-3 pr-8 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                  required={status === CallStatus.CallBackLater}
                >
                  <option value="" disabled>MM</option>
                  {minuteOptions.map(minute => <option key={minute} value={minute}>{minute}</option>)}
                </select>
                <select
                  id="callbackPeriod"
                  value={callbackPeriod}
                  onChange={(e) => setCallbackPeriod(e.target.value as 'AM' | 'PM')}
                  className="block w-full pl-3 pr-8 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                  required={status === CallStatus.CallBackLater}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
        )}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-600">Call Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            placeholder="e.g., Client is looking for a 3-bedroom house."
          />
        </div>
        <button
          type="submit"
          disabled={isSaving || !isReady}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : (!isReady ? 'Initializing...' : 'Save Call Log')}
        </button>
      </form>
    </div>
  );
};

export default CallLogger;
