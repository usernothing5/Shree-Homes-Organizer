import React from 'react';

const rulesToCopy = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

const FirestoreRulesMessage: React.FC = () => {
    const handleCopy = () => {
        navigator.clipboard.writeText(rulesToCopy).then(() => {
            alert('Rules copied to clipboard!');
        }, (err) => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy rules.');
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-amber-50 p-4">
            <div className="text-center p-8 bg-white rounded-lg shadow-2xl max-w-3xl w-full border-4 border-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-amber-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">IMPORTANT: Data Syncing Disabled</h1>
            <p className="text-slate-600 mb-6 text-lg">
                The app has connected to Firebase, but it cannot save or load your data. This is likely because your Firestore Security Rules are blocking access.
            </p>
            <div className="text-left bg-slate-50 p-6 rounded-md border border-slate-200 space-y-4">
                <div>
                    <h2 className="font-bold text-slate-700 text-lg">Solution: Update Security Rules</h2>
                    <ol className="list-decimal list-inside mt-2 space-y-2 text-slate-600">
                        <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-semibold">Firebase Console</a>.</li>
                        <li>Navigate to <span className="font-semibold">Firestore Database</span> {'>'} <span className="font-semibold">Rules</span> tab.</li>
                        <li>Replace the existing rules with the code below. This allows authenticated users to access their own data securely.</li>
                    </ol>
                </div>
                <div className="bg-slate-800 text-white p-4 rounded-md font-mono text-sm overflow-x-auto relative group">
                    <button 
                        onClick={handleCopy}
                        className="absolute top-2 right-2 bg-slate-600 hover:bg-slate-500 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Copy rules to clipboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                    <pre>
                        <code>
                            {rulesToCopy}
                        </code>
                    </pre>
                </div>
            </div>
            <p className="mt-6 text-sm text-slate-500">
                    After updating the rules, please <span className="font-semibold">refresh this page</span>.
                </p>
            </div>
        </div>
    );
}

export default FirestoreRulesMessage;
