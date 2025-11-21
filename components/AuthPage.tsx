import React, { useState } from 'react';

interface AuthPageProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
}

const AuthPage: React.FC<AuthPageProps> = ({ onSignIn, onSignUp, onSignInWithGoogle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
        setError("Email and password cannot be empty.");
        return;
    }
    setLoading(true);
    setError(null);
    try {
        if (isSignUp) {
            await onSignUp(email.trim(), password.trim());
        } else {
            await onSignIn(email.trim(), password.trim());
        }
    } catch (err: any) {
        // Map Firebase error codes to user-friendly messages
        switch (err.code) {
            case 'auth/invalid-email':
                setError('Please enter a valid email address.');
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                setError('Invalid email or password.');
                break;
            case 'auth/email-already-in-use':
                setError('An account with this email already exists.');
                break;
            case 'auth/weak-password':
                 setError('Password should be at least 6 characters long.');
                 break;
            case 'auth/unauthorized-domain':
                 setError(`Domain unauthorized. Add "${window.location.hostname}" to Firebase Console > Auth > Settings > Authorized Domains.`);
                 break;
            default:
                setError('An unexpected error occurred. Please try again.');
                console.error(err);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
        await onSignInWithGoogle();
    } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/popup-closed-by-user') {
            setError('Sign in cancelled.');
        } else if (err.code === 'auth/unauthorized-domain') {
            setError(`Configuration Error: The domain "${window.location.hostname}" is not authorized. Please add it to your Firebase Console under Authentication > Settings > Authorized Domains.`);
        } else {
            setError('Failed to sign in with Google. Please try again. ' + (err.message ? `(${err.message})` : ''));
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-sky-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Shree Homes Organizer</h1>
        </div>
        <p className="text-slate-500 mb-8">
          {isSignUp ? 'Create a new account.' : 'Sign in to your workspace.'}
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
              placeholder="Email address"
            />
          </div>
          <div>
            <label htmlFor="password-input" className="sr-only">Password</label>
            <input
              id="password-input"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md text-left border border-red-200 break-words">
               <p className="font-bold flex items-center gap-1">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 Error
               </p>
               {error}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200 disabled:bg-sky-400"
            disabled={loading}
          >
             {loading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </>
             ) : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full inline-flex justify-center items-center py-2 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
            >
               <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12.0003 20.45C16.6043 20.45 20.4603 16.95 21.4953 12.6H12.0003V9H21.8953C21.9603 9.66 22.0003 10.36 22.0003 11.12C22.0003 17.03 17.8903 21.45 12.0003 21.45C6.78029 21.45 2.55029 17.22 2.55029 12C2.55029 6.78 6.78029 2.55 12.0003 2.55C14.4003 2.55 16.5003 3.38 18.1403 4.75L15.5903 7.3C14.8703 6.65 13.6003 6.15 12.0003 6.15C8.89029 6.15 6.29029 8.7 6.29029 12C6.29029 15.3 8.89029 17.85 12.0003 17.85C15.0203 17.85 16.9003 15.88 17.3303 13.6H12.0003V20.45Z"
                    fill="#EA4335"
                  />
               </svg>
               <span className="ml-2">Google</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="font-medium text-sky-600 hover:text-sky-500">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;