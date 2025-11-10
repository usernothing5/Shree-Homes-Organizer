import React, { useState, useMemo } from 'react';
import { IncompleteLog, CallLog, CallStatus } from '../types';

interface ImportReviewModalProps {
  logsToReview: IncompleteLog[];
  onComplete: (reviewedLogs: Array<Omit<CallLog, 'id' | 'projectId'>>) => void;
  onCancel: () => void;
}

const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const ImportReviewRow: React.FC<{
    log: IncompleteLog,
    data: Partial<CallLog>,
    isSkipped: boolean,
    onUpdate: (field: keyof CallLog, value: any) => void,
    onSkip: () => void,
    onUnskip: () => void,
}> = ({ log, data, isSkipped, onUpdate, onSkip, onUnskip }) => {
    
    const hasMissing = (field: keyof CallLog) => log.missingFields.includes(field as any);

    const renderInput = (field: keyof Pick<CallLog, 'clientName' | 'status' | 'timestamp'>) => {
        switch (field) {
            case 'clientName':
                return <input
                    type="text"
                    value={data.clientName || ''}
                    onChange={(e) => onUpdate('clientName', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    placeholder="Client Name"
                />;
            case 'status':
                return <select
                    value={data.status || ''}
                    onChange={(e) => onUpdate('status', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md"
                >
                    <option value="" disabled>Select status</option>
                    {Object.values(CallStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>;
            case 'timestamp':
                 return <input
                    type="date"
                    value={data.timestamp ? data.timestamp.split('T')[0] : ''}
                    onChange={(e) => {
                        const value = e.target.value;
                        // Prevent RangeError by checking for empty value before creating Date
                        onUpdate('timestamp', value ? new Date(value).toISOString() : '');
                    }}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />;
            default: return null;
        }
    };

    return (
        <div className={`p-4 rounded-lg transition-colors ${isSkipped ? 'bg-slate-200 opacity-60' : 'bg-slate-50'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold text-slate-800">Review Entry</h4>
                    <div className="text-xs text-slate-500 mt-1 p-2 bg-white rounded border border-slate-200 font-mono">
                        <p className="font-bold">Original Data:</p>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.originalRow, null, 2)}</pre>
                    </div>
                </div>
                 <button 
                    onClick={isSkipped ? onUnskip : onSkip}
                    className={`text-sm font-medium px-3 py-1 rounded-md ${isSkipped ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                 >
                    {isSkipped ? 'Unskip' : 'Skip'}
                </button>
            </div>
            {!isSkipped && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['clientName', 'status', 'timestamp'] as const).map(field => (
                        <div key={field}>
                            <label className={`block text-sm font-medium ${hasMissing(field) ? 'text-red-600' : 'text-slate-600'}`}>
                                {field === 'status' ? 'FEEDBACK' : field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                                {hasMissing(field) && ' (Required)'}
                            </label>
                            {renderInput(field)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const ImportReviewModal: React.FC<ImportReviewModalProps> = ({ logsToReview, onComplete, onCancel }) => {
    const [reviewedData, setReviewedData] = useState<Array<Partial<CallLog>>>(
        () => logsToReview.map(l => ({
            ...l.parsedData,
            // Ensure timestamp is a valid date for the input
            timestamp: l.parsedData.timestamp || getTodayDateString()
        }))
    );
    const [skippedRows, setSkippedRows] = useState<Set<number>>(new Set());
    
    const handleUpdate = (index: number, field: keyof CallLog, value: any) => {
      const updated = [...reviewedData];
      updated[index] = { ...updated[index], [field]: value };
      setReviewedData(updated);
    };
  
    const toggleSkip = (index: number) => {
      const newSkipped = new Set(skippedRows);
      if (newSkipped.has(index)) {
        newSkipped.delete(index);
      } else {
        newSkipped.add(index);
      }
      setSkippedRows(newSkipped);
    };

    const isSubmittable = useMemo(() => {
        return reviewedData.every((log, index) => {
            if (skippedRows.has(index)) return true;
            return log.clientName && log.status && log.timestamp;
        });
    }, [reviewedData, skippedRows]);
  
    const handleSubmit = () => {
      if (!isSubmittable) {
        alert("Some entries are still missing required information. Please complete or skip them.");
        return;
      }
      const finalLogs = reviewedData
        .filter((_, index) => !skippedRows.has(index))
        .map(log => log as Omit<CallLog, 'id' | 'projectId'>);
      onComplete(finalLogs);
    };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl m-4 flex flex-col h-[90vh]">
        <div className="flex-shrink-0">
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-slate-700">Review and Confirm Import</h2>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Here's the data we found in your file. Please check for accuracy, make any corrections, and confirm the import. You can also skip rows you don't want to import.</p>
        </div>
        
        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
            {logsToReview.map((log, index) => (
                <ImportReviewRow 
                    key={index}
                    log={log}
                    data={reviewedData[index]}
                    isSkipped={skippedRows.has(index)}
                    onUpdate={(field, value) => handleUpdate(index, field, value)}
                    onSkip={() => toggleSkip(index)}
                    onUnskip={() => toggleSkip(index)}
                />
            ))}
        </div>

        <div className="mt-6 flex-shrink-0 flex justify-between items-center">
            <p className="text-sm text-slate-600">
                {logsToReview.length - skippedRows.size} of {logsToReview.length} entries will be imported.
            </p>
            <div className="space-x-3">
                <button onClick={onCancel} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!isSubmittable}
                    className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300 disabled:cursor-not-allowed"
                >
                    Complete Import
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImportReviewModal;
