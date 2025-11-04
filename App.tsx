
import React from 'react';
import { useAuth } from './hooks/useAuth';
import CrmApp from './CrmApp';
import AuthPage from './components/AuthPage';

const App: React.FC = () => {
  const { user, login, signup, logout } = useAuth();

  if (!user) {
    return <AuthPage 
      onLogin={login} 
      onSignup={signup} 
    />;
  }

  return <CrmApp user={user} onLogout={logout} />;
};

export default App;