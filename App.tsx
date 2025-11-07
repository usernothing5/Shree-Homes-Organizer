import React from 'react';
import CrmApp from './CrmApp';
import AuthPage from './components/AuthPage';
import { useAuth } from './hooks/useAuth';
import { User } from './types';

const App: React.FC = () => {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-sky-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <p className="text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <AuthPage onSignIn={signIn} />;
  }

  return <CrmApp user={user} onSignOut={signOut} />;
};

export default App;
