import React, { useState } from 'react';

interface AuthPageProps {
  onSignIn: (email: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onSignIn }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (email.trim()) {
      onSignIn(email.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-2xl max-w-sm w-full">
        <div className="flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-sky-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Shree Homes Organizer</h1>
        </div>
        <p className="text-slate-500 mb-8">
          Your personal CRM to organize and track client calls effortlessly. Enter your email to begin.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
              placeholder="Enter your email address"
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 disabled:bg-sky-300"
            disabled={!email.trim()}
          >
             <svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
               <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.1 512 0 398.8 0 261.8 0 127.1 104.4 16.6 244 16.6c59.9 0 114.3 23.4 154.1 62.1l-66.6 65.2C314.1 118.8 282.4 102 244 102c-73.3 0-133.5 60.5-133.5 134.9s60.2 134.9 133.5 134.9c78.2 0 111.4-56.3 115.1-86.4H244v-75.9h236.4c2.3 12.7 3.6 26.4 3.6 41.3z"></path>
             </svg>
            Sign In / Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
