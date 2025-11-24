
import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | undefined;
  onSwitchProject: (id: string) => void;
  onManageProjects: () => void;
  onSignOut: () => void;
  userEmail: string | null;
  hasNewerData?: boolean;
  onSyncNewest?: () => void;
  isOnline: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
    projects, 
    activeProject, 
    onSwitchProject, 
    onManageProjects, 
    onSignOut, 
    userEmail,
    hasNewerData,
    onSyncNewest,
    isOnline
}) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

  const formatLastActive = (dateString?: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60000) return 'Active now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
  };

  return (
    <header className="bg-slate-800 shadow-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">Shree Homes</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block h-2 w-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className="text-xs text-slate-300 font-medium uppercase tracking-wide">
                    {isOnline ? 'Online' : 'Offline'}
                </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          {hasNewerData && onSyncNewest && (
            <button 
                onClick={onSyncNewest}
                className="animate-pulse bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold py-1 px-3 rounded-full flex items-center gap-1 shadow-lg transform hover:scale-105 transition-all"
                title="Click to sync with the latest data from other devices"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync New Data
            </button>
          )}

          <div className="relative" ref={projectDropdownRef}>
            <button 
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-1.5 px-3 sm:py-2 sm:px-4 rounded-md transition-colors text-sm sm:text-base max-w-[160px] sm:max-w-none border border-slate-600"
            >
              <span className="truncate">{activeProject?.name || 'Loading...'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {isProjectDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  {projects.map(project => (
                    <a
                      key={project.id}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onSwitchProject(project.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`flex justify-between items-center px-4 py-2 text-sm ${activeProject?.id === project.id ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}
                      role="menuitem"
                    >
                      <span className="truncate">{project.name}</span>
                      {project.lastUpdated && (
                          <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                              {formatLastActive(project.lastUpdated)}
                          </span>
                      )}
                    </a>
                  ))}
                  <div className="border-t border-slate-200 my-1"></div>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onManageProjects();
                      setIsProjectDropdownOpen(false);
                    }}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    role="menuitem"
                  >
                    Manage Projects...
                  </a>
                </div>
              </div>
            )}
          </div>
          <div className="h-8 w-px bg-slate-600 hidden sm:block"></div>
          <div className="relative" ref={userDropdownRef}>
              <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="h-9 w-9 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white">
                {userInitial}
              </button>
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                    <div className="px-4 py-2 border-b border-slate-200">
                      <p className="text-sm text-slate-500">Signed in as</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{userEmail}</p>
                    </div>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onSignOut();
                        setIsUserDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                      role="menuitem"
                    >
                      Sign Out
                    </a>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
