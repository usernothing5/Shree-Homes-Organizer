import React, { useState } from 'react';
import { Project } from '../types';

interface ManageProjectsModalProps {
  projects: Project[];
  onAddProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onClose: () => void;
}

const ManageProjectsModal: React.FC<ManageProjectsModalProps> = ({ projects, onAddProject, onDeleteProject, onClose }) => {
  const [newProjectName, setNewProjectName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim());
      setNewProjectName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-700">Manage Projects</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New project name"
            className="flex-grow mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300"
            disabled={!newProjectName.trim()}
          >
            Add
          </button>
        </form>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Existing Projects</h3>
          {projects.map(project => (
            <div key={project.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-md">
              <span className="text-slate-800">{project.name}</span>
              <button
                onClick={() => onDeleteProject(project.id)}
                disabled={projects.length <= 1}
                className="text-red-500 hover:text-red-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                aria-label={`Delete ${project.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
          {projects.length <= 1 && <p className="text-xs text-slate-500 mt-1">You must have at least one project.</p>}
        </div>
      </div>
    </div>
  );
};

export default ManageProjectsModal;
