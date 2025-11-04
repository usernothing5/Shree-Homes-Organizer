
import React, { useState, useEffect } from 'react';

interface WebHostingModalProps {
  onClose: () => void;
}

type DeployStatus = 'idle' | 'deploying' | 'deployed';

const WebHostingModal: React.FC<WebHostingModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<DeployStatus>('idle');
  const [url, setUrl] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('Copy Link');

  useEffect(() => {
    if (status === 'deployed') {
      const randomString = Math.random().toString(36).substring(2, 10);
      setUrl(`https://shree-homes-${randomString}.app.run`);
    }
  }, [status]);

  const handleDeploy = () => {
    setStatus('deploying');
    setTimeout(() => {
      setStatus('deployed');
    }, 2500); // Simulate deployment time
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Link'), 2000);
    });
  };

  const renderContent = () => {
    switch (status) {
      case 'deploying':
        return (
          <div className="text-center py-8">
            <svg className="animate-spin mx-auto h-12 w-12 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-slate-600 font-semibold">Deploying your application...</p>
            <p className="text-sm text-slate-500">This may take a moment.</p>
          </div>
        );
      case 'deployed':
        return (
          <div className="text-center py-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-bold text-slate-800 mt-2">Deployment Successful!</h3>
            <p className="text-sm text-slate-500 mt-1">Your CRM is now live and accessible at this private URL:</p>
            <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-md text-sky-700 font-mono text-sm break-all">
              {url}
            </div>
            <div className="mt-6 flex justify-center gap-3">
               <button
                onClick={handleCopy}
                className="w-32 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
              >
                {copyButtonText}
              </button>
              <button
                onClick={onClose}
                className="w-32 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              >
                Done
              </button>
            </div>
          </div>
        );
      case 'idle':
      default:
        return (
          <>
            <p className="text-sm text-slate-600 mb-6">
              Publish your CRM application to a private, secure web link. This allows you to access it from any device, anywhere, for free.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-sky-100 text-sky-600 p-2 rounded-full mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 7.97 5 10 5c2.03 0 3.488.73 4.756 1.321l.127.058a.5.5 0 01.09.706l-.235.334a.5.5 0 01-.706-.091l-.127-.058C13.488 7.23 12.03 6.5 10 6.5c-1.42 0-2.48.5-3.332 1.027l-.127.058a.5.5 0 01-.706-.09l-.235-.334a.5.5 0 01.09-.706l.127-.058z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Global Access</h3>
                  <p className="text-sm text-slate-500">Use your CRM from your phone, tablet, or any computer with an internet connection.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-emerald-100 text-emerald-600 p-2 rounded-full mt-1">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Secure & Private</h3>
                  <p className="text-sm text-slate-500">Your data remains yours. The generated link is private and not publicly discoverable.</p>
                </div>
              </li>
            </ul>
             <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeploy}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              >
                Deploy Now for Free
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-700">Publish Your CRM to the Web</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default WebHostingModal;
