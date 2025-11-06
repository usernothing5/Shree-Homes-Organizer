import React from 'react';
import { CallLog } from '../types';

interface NotificationBannerProps {
  callLog: CallLog;
  onResolve: () => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ callLog, onResolve }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white h-16 shadow-lg animate-pulse-slow flex items-center">
      <div className="container mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="font-semibold">
            Reminder: Time to call <span className="font-bold underline">{callLog.clientName}</span>
            {callLog.clientPhone && ` at ${callLog.clientPhone}`}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {callLog.clientPhone && (
            <a
              href={`tel:${callLog.clientPhone.replace(/\s+/g, '')}`}
              className="flex items-center gap-2 bg-emerald-500 text-white font-bold py-2 px-4 rounded-md hover:bg-emerald-600 transition-colors"
              aria-label={`Call ${callLog.clientName}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span>Call</span>
            </a>
          )}
          <button
            onClick={onResolve}
            className="bg-white text-red-600 font-bold py-2 px-4 rounded-md hover:bg-red-100 transition-colors"
          >
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
