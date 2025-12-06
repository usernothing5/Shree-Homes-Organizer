
import React, { useState, useEffect } from 'react';
import { CallLog, CallStatus } from '../types';

interface ResolveCallbackModalProps {
  callLog: CallLog;
  onClose: () => void;
  onUpdate: (logId: string, updates: { status: CallStatus, notes: string, callbackTime?: string }) => void;
}

const getInitialIndianDateTime = () => {
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    const date = dateFormatter.format(now);
    const timeParts = timeFormatter.formatToParts(now);
    const getPartValue = (type: Intl.DateTimeFormatPartTypes) => timeParts.find((part) => part.type === type)?.value || '';
    return { date, hour: getPartValue('hour'), minute: getPartValue('minute'), period: (getPartValue('dayPeriod') as 'AM' | 'PM' | 'am' | 'pm').toUpperCase() as 'AM' | 'PM' };
};

const ResolveCallbackModal: React.FC<ResolveCallbackModalProps> = ({ callLog, onClose, onUpdate }) => {
  const [newStatus, setNewStatus] = useState<CallStatus>(CallStatus.Interested);
  const [notes, setNotes] = useState(callLog.notes || '');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackHour, setCallbackHour] = useState('');
  const [callbackMinute, setCallbackMinute] = useState('');
  const [callbackPeriod, setCallbackPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (newStatus === CallStatus.CallBackLater && !callbackDate) {
        const { date, hour, minute, period } = getInitialIndianDateTime();
        setCallbackDate(date);
        setCallbackHour(hour);
        setCallbackMinute(minute);
        setCallbackPeriod(period);
    }
  }, [newStatus, callbackDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { status: CallStatus, notes: string, callbackTime?: string } = {
        status: newStatus,
        notes: notes.trim(),
    };
    
    const hasCallbackData = callbackDate && callbackHour && callbackMinute;
    
    if (newStatus === CallStatus.CallBackLater && !hasCallbackData) {
        alert('Please select a new callback date and time.');
        return;
    }

    if (hasCallbackData) {
        let hour24 = parseInt(callbackHour, 10);
        if (callbackPeriod === 'PM' && hour24 < 12) hour24 += 12;
        if (callbackPeriod === 'AM' && hour24 === 12) hour24 = 0;
        const [year, month, day] = callbackDate.split('-').map(Number);
        const combinedDateTime = new Date(year, month - 1, day, hour24, Number(callbackMinute));
        updates.callbackTime = combinedDateTime.toISOString();
    }
    
    onUpdate(callLog.id, updates);
  };

  const availableStatuses = [
    CallStatus.Interested,
    CallStatus.DetailsShare,
    CallStatus.SiteVisitGenerated,
    CallStatus.SecondSiteVisit,
    CallStatus.Booked,
    CallStatus.CallBackLater,
    CallStatus.NotAnswered,
    CallStatus.NotInterested,
  ];

  const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-700">Resolve Callback for {callLog.clientName}</h2>
            {callLog.clientPhone && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-500">{callLog.clientPhone}</p>
                <a
                  href={`tel:${callLog.clientPhone.replace(/\s+/g, '')}`}
                  className="text-sky-600 hover:text-sky-800 p-1 rounded-full hover:bg-sky-100 transition-colors"
                  aria-label={`Call ${callLog.clientName}`}
                  title={`Call ${callLog.clientPhone}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </a>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-600">New FEEDBACK</label>
              <select
                id="status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as CallStatus)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
              >
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-600">
                    {newStatus === CallStatus.CallBackLater ? 'Callback Date & Time (Required)' : 'Next Follow-up (Optional)'}
                </label>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    id="callbackDate"
                    type="date"
                    value={callbackDate}
                    onChange={(e) => setCallbackDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    required={newStatus === CallStatus.CallBackLater}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      id="callbackHour"
                      value={callbackHour}
                      onChange={(e) => setCallbackHour(e.target.value)}
                      className="block w-full pl-3 pr-8 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                      required={newStatus === CallStatus.CallBackLater}
                    >
                      {hourOptions.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                    </select>
                    <select
                      id="callbackMinute"
                      value={callbackMinute}
                      onChange={(e) => setCallbackMinute(e.target.value)}
                      className="block w-full pl-3 pr-8 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                      required={newStatus === CallStatus.CallBackLater}
                    >
                      {minuteOptions.map(minute => <option key={minute} value={minute}>{minute}</option>)}
                    </select>
                    <select
                      id="callbackPeriod"
                      value={callbackPeriod}
                      onChange={(e) => setCallbackPeriod(e.target.value as 'AM' | 'PM')}
                      className="block w-full pl-3 pr-8 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                      required={newStatus === CallStatus.CallBackLater}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

            <div>
              <label htmlFor="callbackNotes" className="block text-sm font-medium text-slate-600">Call Notes</label>
              <textarea
                id="callbackNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                placeholder="Add or update notes from the follow-up call."
              />
            </div>
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
              type="submit"
              className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Update Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResolveCallbackModal;
