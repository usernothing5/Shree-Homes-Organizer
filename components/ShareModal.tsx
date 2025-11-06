import React, { useState, useCallback } from 'react';

interface ShareModalProps {
  shareUrl: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ shareUrl, onClose }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy Link');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Link'), 2000);
    }, (err) => {
      console.error('Could not copy text: ', err);
      setCopyButtonText('Failed to copy');
       setTimeout(() => setCopyButtonText('Copy Link'), 2000);
    });
  }, [shareUrl]);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-700">Share Your Data</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-sm text-slate-600 mb-4">
          Open this link on another device to load your current projects and call logs. You can also scan the QR code with your phone.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-grow w-full">
                <label htmlFor="share-url" className="sr-only">Share URL</label>
                <input
                    id="share-url"
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm sm:text-sm text-slate-700"
                    onFocus={(e) => e.target.select()}
                />
                 <button
                    onClick={handleCopy}
                    className="mt-2 w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    {copyButtonText}
                </button>
            </div>
             <div className="p-2 border border-slate-200 rounded-md bg-white flex-shrink-0">
                <img src={qrCodeUrl} alt="QR Code for sharing data" width="200" height="200" />
            </div>
        </div>

        <div className="mt-6 p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-sm">
          <p><span className="font-bold">Warning:</span> This link contains a full copy of your data. Share it only with your own devices or trusted individuals.</p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
