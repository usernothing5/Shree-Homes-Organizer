
import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Project } from '../types';

interface ManageProjectsModalProps {
  projects: Project[];
  activeProjectId: string;
  onAddProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onJoinProject: (id: string) => void;
  onClose: () => void;
}

const ManageProjectsModal: React.FC<ManageProjectsModalProps> = ({ projects, activeProjectId, onAddProject, onDeleteProject, onJoinProject, onClose }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [joinProjectId, setJoinProjectId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim());
      setNewProjectName('');
      setError(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
      e.preventDefault();
      // Remove "ID:" prefix if user pasted it by mistake, and trim whitespace
      const cleanedId = joinProjectId.replace(/ID:\s*/i, '').trim();
      
      if (!cleanedId) return;

      // 1. Optimistic Check: Is it already in our local list?
      const projectExists = projects.find(p => p.id === cleanedId);
      if (projectExists) {
          onJoinProject(cleanedId);
          setJoinProjectId('');
          setError(null);
          onClose();
          return;
      }

      // 2. Server Check: Verify existence in Firestore directly
      setIsChecking(true);
      setError(null);
      
      try {
          const docRef = doc(db, 'projects', cleanedId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
               onJoinProject(cleanedId);
               setJoinProjectId('');
               onClose();
          } else {
               setError('Project ID not found in the database. Please check the code and try again.');
          }
      } catch (err) {
          console.error("Error checking project ID:", err);
          setError('Network error verifying ID.');
      } finally {
          setIsChecking(false);
      }
  };

  const handleCopyId = (id: string) => {
      navigator.clipboard.writeText(id).then(() => {
          setCopySuccessId(id);
          setTimeout(() => setCopySuccessId(null), 2000);
      });
  };

  const formatLastActive = (dateString?: string) => {
      if (!dateString) return 'Never/Old';
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
      return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-16" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-700">Manage Projects</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-grow pr-2 space-y-6">
            
            {/* Create New Section */}
            <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Create New Project</h3>
                <form onSubmit={handleAdd} className="flex gap-2">
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Project Name"
                        className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300"
                        disabled={!newProjectName.trim()}
                    >
                        Create
                    </button>
                </form>
            </div>
            
            <hr className="border-slate-200" />

            {/* Join Section */}
            <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Join Existing Project</h3>
                <form onSubmit={handleJoin} className="flex gap-2 relative">
                    <input
                        type="text"
                        value={joinProjectId}
                        onChange={(e) => setJoinProjectId(e.target.value)}
                        placeholder="Paste Project ID"
                        className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        disabled={isChecking}
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300 flex items-center"
                        disabled={!joinProjectId.trim() || isChecking}
                    >
                        {isChecking ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Join'}
                    </button>
                </form>
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            <hr className="border-slate-200" />

            {/* List Section */}
            <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Your Projects</h3>
                <div className="space-y-2">
                {projects.map(project => (
                    <div key={project.id} className={`flex justify-between items-center p-3 rounded-md border ${project.id === activeProjectId ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex flex-col overflow-hidden w-full mr-2">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold ${project.id === activeProjectId ? 'text-sky-800' : 'text-slate-800'}`}>
                                {project.name}
                            </span>
                            {project.id === activeProjectId && <span className="text-[10px] font-bold bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded uppercase">Active</span>}
                        </div>
                        <div className="flex items-center gap-2">
                             <button
                                onClick={() => handleCopyId(project.id)}
                                className="group flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono border border-slate-300 transition-colors"
                                title="Click to copy ID"
                            >
                                <span className="truncate max-w-[120px]">{project.id}</span>
                                {copySuccessId === project.id ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                )}
                            </button>
                            <span className="text-[10px] text-slate-400">
                                {formatLastActive(project.lastUpdated)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => onDeleteProject(project.id)}
                        disabled={projects.length <= 1 || project.id === activeProjectId}
                        className="text-slate-400 hover:text-red-600 disabled:text-slate-200 disabled:cursor-not-allowed p-2 transition-colors flex-shrink-0"
                        aria-label={`Delete ${project.name}`}
                        title={project.id === activeProjectId ? "Cannot delete active project" : "Delete project"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                    </button>
                    </div>
                ))}
                </div>
                 {projects.length <= 1 && <p className="text-xs text-slate-400 mt-2 text-center italic">At least one project is required.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ManageProjectsModal;
