
import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | undefined;
  onSwitchProject: (id: string) => void;
  onManageProjects: () => void;
  userEmail: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ projects, activeProject, onSwitchProject, onManageProjects, userEmail, onLogout }) => {
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
          
          <div className="relative" ref={userDropdownRef}>
            <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white">
               <span className="sr-only">Open user menu</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
            </button>
             {isUserDropdownOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="px-4 py-2 text-sm text-slate-700 border-b">
                  Signed in as <br/>
                  <span className="font-medium truncate block">{userEmail}</span>
                </div>
                <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Sign out</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
