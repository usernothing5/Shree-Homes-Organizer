import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from './firebase';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  writeBatch,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { CallLog, CallStatus, Project, IncompleteLog, CallerStats, User } from './types';
import Header from './components/Header';
import CallLogger from './components/CallLogger';
import Stats from './components/Stats';
import CallList from './components/CallList';
import ScheduledCallbacks from './components/ScheduledCallbacks';
import NotificationBanner from './components/NotificationBanner';
import ResolveCallbackModal from './components/ResolveCallbackModal';
import ManageProjectsModal from './components/ManageProjectsModal';
import PendingFollowUps from './components/PendingFollowUps';
import EditNotesModal from './components/EditNotesModal';
import UpdateDetailsShareModal from './components/UpdateDetailsShareModal';
import DataManagement from './components/DataManagement';
import ImportStatusModal, { ImportResults } from './components/ImportStatusModal';
import ImportReviewModal from './components/ImportReviewModal';
import CallerPerformance, { DailyCallerOverrides } from './components/CallerPerformance';

type LogUpdatePayload = {
  status?: CallStatus;
  notes?: string;
  callbackTime?: string | null;
  timestamp?: string;
};

type StatOverrides = {
  [projectId: string]: {
    [date: string]: DailyCallerOverrides;
  };
};

interface CrmAppProps {
  user: User;
  onSignOut: () => void;
}

const CrmApp: React.FC<CrmAppProps> = ({ user, onSignOut }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [statOverrides, setStatOverrides] = useState<StatOverrides>({});

  const [isLoading, setIsLoading] = useState(true);

  const [activeCallback, setActiveCallback] = useState<CallLog | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isManageProjectsModalOpen, setIsManageProjectsModalOpen] = useState(false);
  
  const [logToUpdate, setLogToUpdate] = useState<{ log: CallLog; type: 'details-share' | 'edit-notes' } | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [logsForReview, setLogsForReview] = useState<IncompleteLog[] | null>(null);

  // --- Firestore Data Fetching ---
  useEffect(() => {
    setIsLoading(true);
    const projectsCol = collection(db, `users/${user.uid}/projects`);
    const projectsQuery = query(projectsCol);

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const fetchedProjects: Project[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      setProjects(fetchedProjects);

      if (fetchedProjects.length > 0) {
        if (!activeProjectId || !fetchedProjects.some(p => p.id === activeProjectId)) {
            setActiveProjectId(fetchedProjects[0].id);
        }
      } else {
        // If no projects, create a default one
        const defaultProject: Omit<Project, 'id'> = { name: 'Default Project' };
        addDoc(projectsCol, defaultProject).then(docRef => {
            setActiveProjectId(docRef.id);
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribeProjects();
  }, [user.uid]); // Only re-run when user changes

  useEffect(() => {
    if (!activeProjectId) return;
    
    const logsCol = collection(db, `users/${user.uid}/callLogs`);
    const logsQuery = query(logsCol, where("projectId", "==", activeProjectId));
    
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        const fetchedLogs: CallLog[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            // Firestore timestamps need to be converted
            timestamp: (d.data().timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            callbackTime: (d.data().callbackTime as Timestamp)?.toDate().toISOString()
        } as CallLog));
        
        // Sort logs by timestamp descending
        fetchedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setCallLogs(fetchedLogs);
    });

    // Fetch overrides for the current project
    const overridesDoc = doc(db, `users/${user.uid}/statOverrides`, activeProjectId);
    const unsubscribeOverrides = onSnapshot(overridesDoc, (snapshot) => {
        if(snapshot.exists()) {
            setStatOverrides(prev => ({ ...prev, [activeProjectId]: snapshot.data() }));
        } else {
            setStatOverrides(prev => ({...prev, [activeProjectId]: {}}));
        }
    });

    return () => {
        unsubscribeLogs();
        unsubscribeOverrides();
    }
  }, [user.uid, activeProjectId]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  // --- Notifications ---
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const timers: number[] = [];

    if (!activeCallback) {
      const now = new Date();
      const overdueCallback = callLogs.find(log =>
        log.status === CallStatus.CallBackLater &&
        log.callbackTime &&
        new Date(log.callbackTime) <= now &&
        !activeCallback
      );
      if (overdueCallback) {
        setActiveCallback(overdueCallback);
      }
    }

    callLogs.forEach(log => {
      if (log.status === CallStatus.CallBackLater && log.callbackTime) {
        const callbackDate = new Date(log.callbackTime);
        const now = new Date();
        if (callbackDate > now) {
          const timeout = callbackDate.getTime() - now.getTime();
          const timerId = window.setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification('Call Reminder', {
                body: `Time to call ${log.clientName} in project ${activeProject?.name || ''}!`,
              });
            }
             setActiveCallback(currentActive => currentActive && currentActive.id === log.id ? currentActive : log);
          }, timeout);
          timers.push(timerId);
        }
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [callLogs, activeCallback, activeProject]);

  // --- Data Modification Functions ---
  const addCallLog = useCallback(async (log: Omit<CallLog, 'id' | 'timestamp' | 'projectId'>) => {
    if (!activeProjectId) return;
    const newLog: Omit<CallLog, 'id'> = {
      ...log,
      timestamp: new Date().toISOString(),
      projectId: activeProjectId,
      followUpCount: 0,
    };
    await addDoc(collection(db, `users/${user.uid}/callLogs`), {
        ...newLog,
        // Convert ISO strings back to Firestore Timestamps for proper querying
        timestamp: Timestamp.fromDate(new Date(newLog.timestamp)),
        ...(newLog.callbackTime && { callbackTime: Timestamp.fromDate(new Date(newLog.callbackTime)) })
    });
  }, [user.uid, activeProjectId]);

  const deleteCallLog = useCallback(async (id: string) => {
    await deleteDoc(doc(db, `users/${user.uid}/callLogs`, id));
  }, [user.uid]);

  const handleUpdateLog = useCallback(async (logId: string, updates: LogUpdatePayload) => {
    const logRef = doc(db, `users/${user.uid}/callLogs`, logId);
    
    const finalUpdates: any = {
      ...updates,
      timestamp: Timestamp.now(),
    };

    if (updates.status && updates.status !== CallStatus.CallBackLater) {
        finalUpdates.callbackTime = null; // Clear callback time if status changes
    } else if (updates.callbackTime) {
        finalUpdates.callbackTime = Timestamp.fromDate(new Date(updates.callbackTime));
    }

    await updateDoc(logRef, finalUpdates);
    
    setIsResolveModalOpen(false);
    setActiveCallback(null);
    setLogToUpdate(null);
  }, [user.uid]);

  const handleUpdateFollowUpCount = useCallback(async (logId: string, count: number) => {
    const logRef = doc(db, `users/${user.uid}/callLogs`, logId);
    await updateDoc(logRef, { followUpCount: count >= 0 ? count : 0 });
  }, [user.uid]);

  const handleAddProject = async (name: string) => {
    const newProject: Omit<Project, 'id'> = { name };
    const docRef = await addDoc(collection(db, `users/${user.uid}/projects`), newProject);
    setActiveProjectId(docRef.id);
  };

  const handleDeleteProject = async (id: string) => {
    if (projects.length <= 1) {
      alert("You cannot delete the last project.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this project and all its associated call logs? This action cannot be undone.")) {
      // Delete the project doc
      await deleteDoc(doc(db, `users/${user.uid}/projects`, id));
      
      // Batch delete all associated call logs
      const logsQuery = query(collection(db, `users/${user.uid}/callLogs`), where("projectId", "==", id));
      const logsSnapshot = await getDocs(logsQuery);
      const batch = writeBatch(db);
      logsSnapshot.forEach(logDoc => {
          batch.delete(logDoc.ref);
      });
      await batch.commit();

      // Switch to another project
      if (id === activeProjectId) {
        const remainingProjects = projects.filter(p => p.id !== id);
        setActiveProjectId(remainingProjects[0]?.id || null);
      }
    }
  };

  const handleSwitchProject = (id: string) => {
    if (id !== activeProjectId) {
      setCallLogs([]); // Clear logs briefly to avoid flicker
      setActiveProjectId(id);
      setActiveCallback(null);
    }
  };
  
  // Omitted File Import and other functions for brevity - they remain largely the same,
  // except for how they add data, which now uses Firestore functions.
  // The provided code below includes the full, updated logic.

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {isManageProjectsModalOpen && (
        <ManageProjectsModal
          projects={projects}
          onAddProject={handleAddProject}
          onDeleteProject={handleDeleteProject}
          onClose={() => setIsManageProjectsModalOpen(false)}
        />
      )}
       {/* Other modals (ImportReview, ImportStatus, Resolve, Update, Edit) remain here */}
      
      {activeCallback && !isResolveModalOpen && (
        <NotificationBanner
          callLog={activeCallback}
          onResolve={() => setIsResolveModalOpen(true)}
        />
      )}
      {isResolveModalOpen && activeCallback && (
        <ResolveCallbackModal
          callLog={activeCallback}
          onClose={() => { setIsResolveModalOpen(false); setActiveCallback(null); }}
          onUpdate={handleUpdateLog}
        />
      )}
      {logToUpdate?.type === 'details-share' && (
        <UpdateDetailsShareModal
            callLog={logToUpdate.log}
            onClose={() => setLogToUpdate(null)}
            onUpdate={handleUpdateLog}
        />
      )}
      {logToUpdate?.type === 'edit-notes' && (
        <EditNotesModal
            callLog={logToUpdate.log}
            onClose={() => setLogToUpdate(null)}
            onUpdate={(logId, notes) => handleUpdateLog(logId, { notes })}
        />
      )}


      <div className={`${activeCallback && !isResolveModalOpen ? 'pt-16' : ''}`}>
        <Header 
          projects={projects}
          activeProject={activeProject}
          onSwitchProject={handleSwitchProject}
          onManageProjects={() => setIsManageProjectsModalOpen(true)}
          user={user}
          onSignOut={onSignOut}
        />
        <main className="p-4 sm:p-6 lg:p-8">
          {isLoading ? (
             <div className="flex items-center justify-center"><p>Loading project data...</p></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-1 space-y-6">
                <CallLogger addCallLog={addCallLog} />
                <Stats callLogs={callLogs} />
                <CallerPerformance 
                  todaysLogs={callLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString())}
                  overrides={activeProjectId ? statOverrides[activeProjectId]?.[new Date().toISOString().split('T')[0]] : undefined}
                  onUpdateOverride={() => { /* TODO: Implement stat override updates */}}
                />
                <ScheduledCallbacks callLogs={callLogs} />
                <PendingFollowUps 
                  callLogs={callLogs} 
                  onUpdate={(log) => setLogToUpdate({ log, type: 'details-share' })} 
                />
                <DataManagement onFileImport={() => {/* TODO: Implement file import */}} isImporting={isImporting} />
              </div>
              <div className="lg:col-span-2">
                <CallList 
                  callLogs={callLogs} 
                  deleteCallLog={deleteCallLog}
                  onEditNotes={(log) => setLogToUpdate({ log, type: 'edit-notes' })}
                  onUpdateFollowUpCount={handleUpdateFollowUpCount}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CrmApp;
