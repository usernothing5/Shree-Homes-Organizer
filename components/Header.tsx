import React, { useState, useRef, useEffect } from 'react';
import { Project, User } from '../types';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | undefined;
  onSwitchProject: (id: string) => void;
  onManageProjects: () => void;
  user: User;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ projects, activeProject, onSwitchProject, onManageProjects, user, onSignOut }) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
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

  return (
    <header className="bg-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          <h1 className="text-2xl font-bold text-white tracking-tight">Shree Homes Organizer</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={projectDropdownRef}>
            <button 
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              <span>{activeProject?.name || 'Loading Project...'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {isProjectDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
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
                      className={`block px-4 py-2 text-sm ${activeProject?.id === project.id ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}
                      role="menuitem"
                    >
                      {project.name}
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
          
          <div className="border-l border-slate-600 h-8"></div>

          <div className="relative" ref={userDropdownRef}>
            <button 
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} 
              className="flex items-center gap-2 text-white font-medium py-2 px-1 rounded-md transition-colors"
              aria-label="User menu"
            >
              <span className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-white">
                {user.email ? user.email.charAt(0).toUpperCase() : '?'}
              </span>
            </button>
            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <div className="px-4 py-3 text-sm text-slate-700 border-b border-slate-200">
                    <p className="font-semibold">Signed in as</p>
                    <p className="truncate" title={user.email || 'No Email'}>{user.email}</p>
                  </div>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onSignOut();
                      setIsUserDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    role="menuitem"
                  >
                    Sign out
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
