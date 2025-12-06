
import React, { useState, useEffect } from 'react';
import CrmApp from './CrmApp';
import { isConfigured, db } from './firebase';
import { useAuth } from './hooks/useAuth';
import AuthPage from './components/AuthPage';

const FirebaseConfigMessage: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
    <div className="text-center p-8 bg-white rounded-lg shadow-2xl max-w-3xl w-full border-4 border-red-500">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-red-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">CRITICAL: Firebase Not Configured</h1>
      <p className="text-slate-600 mb-6 text-lg">
        This application cannot start because it is not connected to a Firebase backend. You must complete the following steps.
      </p>
      <div className="text-left bg-slate-50 p-6 rounded-md border border-slate-200 space-y-4">
        <div>
            <h2 className="font-bold text-slate-700 text-lg">Step 1: Add Your Firebase Credentials</h2>
            <ol className="list-decimal list-inside mt-2 space-y-2 text-slate-600">
            <li>
                Open the <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-sm">firebase.ts</code> file in your project editor.
            </li>
            <li>
                Replace the placeholder values (e.g., <code className="bg-slate-200 text-red-600 font-bold px-1 py-0.5 rounded font-mono text-sm">"YOUR_API_KEY"</code>) with your actual Firebase project credentials.
            </li>
            <li>
                You can find your credentials in the Firebase Console: <span className="font-semibold">Project settings</span> {'>'} <span className="font-semibold">General</span> {'>'} <span className="font-semibold">Your apps</span>.
            </li>
            </ol>
        </div>
        <div className="border-t border-slate-300 pt-4">
            <h2 className="font-bold text-slate-700 text-lg">Step 2: Enable Authentication Providers</h2>
             <p className="text-slate-600 mt-2">
                To allow users to sign in, you <span className="font-bold uppercase text-red-600">must</span> enable the sign-in methods in Firebase.
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-2 text-slate-600">
                <li>Go to the <span className="font-semibold">Firebase Console</span>.</li>
                <li>Navigate to <span className="font-semibold">Authentication</span> {'>'} <span className="font-semibold">Sign-in method</span>.</li>
                <li>Enable <span className="font-semibold">Email/Password</span>.</li>
                <li>To use Google Sign-In, click <span className="font-semibold">Add new provider</span>, select <span className="font-semibold">Google</span>, and enable it.</li>
            </ol>
        </div>
      </div>
       <p className="mt-6 text-sm text-slate-500">
            The app will automatically reload once the credentials in <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-sm">firebase.ts</code> are valid.
        </p>
    </div>
  </div>
);

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
        <svg className="animate-spin h-10 w-10 text-sky-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-600">{message}</p>
    </div>
);


const App: React.FC = () => {
  const { user, loading, signIn, signUp, signInWithGoogle, signOut } = useAuth();
  
  if (!isConfigured) {
    return <FirebaseConfigMessage />;
  }

  if (loading) {
     return <LoadingScreen message="Initializing CRM..." />;
  }

  if (!user) {
    return <AuthPage onSignIn={signIn} onSignUp={signUp} onSignInWithGoogle={signInWithGoogle} />;
  }
  
  return <CrmApp user={user} onSignOut={signOut} />;
};

export default App;
