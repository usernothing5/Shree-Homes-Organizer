
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
  Timestamp,
  setDoc,
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
import ConfirmVisitStatusModal from './components/ConfirmVisitStatusModal';


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
  const [logToConfirmVisit, setLogToConfirmVisit] = useState<CallLog | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [logsForReview, setLogsForReview] = useState<IncompleteLog[] | null>(null);

  // --- Firestore Data Fetching ---
  useEffect(() => {
    if (!user) return;
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
    }, (error) => {
        console.error("Error fetching projects:", error);
        setIsLoading(false);
    });

    return () => unsubscribeProjects();
  }, [user]);

  useEffect(() => {
    if (!user || !activeProjectId) return;
    
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
  }, [user, activeProjectId]);

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

    // --- Data Import Functions ---
  const handleFileImport = (file: File) => {
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // @ts-ignore
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // @ts-ignore
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        processImportedData(json);
      } catch (error) {
        console.error("Error processing file:", error);
        alert("There was an error reading the file. Please ensure it's a valid Excel or CSV file.");
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
        alert("Could not read the file.");
        setIsImporting(false);
    };
    reader.readAsBinaryString(file);
  };
  
  const processImportedData = (data: Record<string, any>[]) => {
    const logsToReview: IncompleteLog[] = [];
    const logsToImport: Omit<CallLog, 'id' | 'projectId'>[] = [];
    const savedCallerName = localStorage.getItem('callerName') || 'Unknown Caller';

    data.forEach(row => {
        const findKey = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
                const found = rowKeys.find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim());
                if (found) return row[found];
            }
            return undefined;
        };

        const statusString = findKey(['feedback', 'status']);
        const status = Object.values(CallStatus).find(s => s.toLowerCase() === statusString?.toLowerCase());

        let timestamp: string | undefined;
        const dateValue = findKey(['date', 'timestamp']);
        if (dateValue) {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
                timestamp = parsedDate.toISOString();
            }
        }
        
        let callbackTime: string | undefined;
        const callbackValue = findKey(['callback time', 'callback']);
        if (callbackValue) {
             const parsedDate = new Date(callbackValue);
            if (!isNaN(parsedDate.getTime())) {
                callbackTime = parsedDate.toISOString();
            }
        }

        const parsedData: Partial<Omit<CallLog, 'id' | 'projectId'>> = {
            callerName: findKey(['caller', 'caller name']) || savedCallerName,
            clientName: findKey(['name', 'client name']),
            clientPhone: String(findKey(['number', 'phone', 'phone number']) || ''),
            status: status,
            notes: findKey(['remark', 'notes']),
            timestamp: timestamp,
            followUpCount: 0,
            visitWon: false, // Default to false
        };

        if (callbackTime) {
            parsedData.callbackTime = callbackTime;
        }
        
        const visitWonValue = findKey(['visit won']);
        if (visitWonValue !== undefined && visitWonValue !== null) {
            const visitWonString = String(visitWonValue).toLowerCase().trim();
            if (visitWonString === 'true' || visitWonString === 'yes' || visitWonString === '1') {
                parsedData.visitWon = true;
            }
        }


        const missingFields: Array<keyof Pick<CallLog, 'clientName' | 'status' | 'timestamp'>> = [];
        if (!parsedData.clientName) missingFields.push('clientName');
        if (!parsedData.status) missingFields.push('status');
        if (!parsedData.timestamp) missingFields.push('timestamp');

        if (missingFields.length > 0) {
            logsToReview.push({ originalRow: row, parsedData, missingFields });
        } else {
            logsToImport.push(parsedData as Omit<CallLog, 'id' | 'projectId'>);
        }
    });

    if (logsToReview.length > 0) {
      setLogsForReview(logsToReview);
    }
    
    if (logsToImport.length > 0) {
      batchImportLogs(logsToImport, logsToReview.length > 0 ? undefined : []);
    } else if (logsToReview.length === 0) {
        setImportResults({ successCount: 0, errorCount: data.length, errors: ["No valid data found to import."] });
        setIsImporting(false);
    }
  };

  const handleCompleteReview = (reviewedLogs: Array<Omit<CallLog, 'id' | 'projectId'>>) => {
    const originalReviewCount = logsForReview?.length || 0;
    const errors: string[] = [];
    
    // Any logs that were skipped are not in reviewedLogs.
    const skippedCount = originalReviewCount - reviewedLogs.length;
    if (skippedCount > 0) {
        errors.push(`${skippedCount} row(s) were skipped by the user during review.`);
    }

    const previouslyImportedCount = importResults?.successCount || 0;
    
    setLogsForReview(null);

    // This runs a batch import for the logs that passed the review step.
    // It's called with the errors array from the skipped logs.
    batchImportLogs(reviewedLogs, errors, previouslyImportedCount);
  };
  
  const batchImportLogs = async (logs: Array<Omit<CallLog, 'id' | 'projectId'>>, initialErrors: string[] = [], previouslyImportedCount: number = 0) => {
    if (!activeProjectId || !user) {
      alert("No active project selected. Cannot import data.");
      setIsImporting(false);
      return;
    }

    if (logs.length === 0 && !logsForReview) {
        setImportResults({ successCount: previouslyImportedCount, errorCount: initialErrors.length, errors: initialErrors });
        setIsImporting(false);
        return;
    }

    const batch = writeBatch(db);
    const logsCollection = collection(db, `users/${user.uid}/callLogs`);
    
    logs.forEach(log => {
      const docRef = doc(logsCollection);
      const logWithProject = { 
        ...log,
        projectId: activeProjectId,
        timestamp: Timestamp.fromDate(new Date(log.timestamp)),
        ...(log.callbackTime && { callbackTime: Timestamp.fromDate(new Date(log.callbackTime)) })
      };
      batch.set(docRef, logWithProject);
    });

    try {
      await batch.commit();
      // If we are not in a review flow, set the results now.
      if(!logsForReview) {
          setImportResults({ 
            successCount: previouslyImportedCount + logs.length, 
            errorCount: initialErrors.length, 
            errors: initialErrors 
          });
      }
    } catch (error) {
      console.error("Batch import failed:", error);
      if(!logsForReview) {
          setImportResults({
              successCount: previouslyImportedCount,
              errorCount: initialErrors.length + logs.length,
              errors: [...initialErrors, `Firestore error: Could not save ${logs.length} records. See console for details.`]
          });
      }
    } finally {
        // Only stop importing and show final results if the review modal is not open
        if (!logsForReview) {
            setIsImporting(false);
        }
    }
  };

  const handleExport = () => {
    if (callLogs.length === 0) {
        alert("No data available to export.");
        return;
    }
    
    const data = callLogs.map(log => ({
        "Client Name": log.clientName,
        "Phone": log.clientPhone,
        "Status": log.status,
        "Caller": log.callerName,
        "Notes": log.notes,
        "Date": new Date(log.timestamp).toLocaleDateString(),
        "Time": new Date(log.timestamp).toLocaleTimeString(),
        "Callback Time": log.callbackTime ? new Date(log.callbackTime).toLocaleString() : '',
        "Visit Won": log.visitWon ? "Yes" : "No",
        "Follow-ups": log.followUpCount
    }));

    // @ts-ignore
    const ws = XLSX.utils.json_to_sheet(data);
    // @ts-ignore
    const wb = XLSX.utils.book_new();
    // @ts-ignore
    XLSX.utils.book_append_sheet(wb, ws, activeProject?.name || "Call Logs");
    // @ts-ignore
    XLSX.writeFile(wb, `${activeProject?.name || "ShreeHomes_Data"}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };


  // --- Data Modification Functions ---
  const addCallLog = useCallback(async (log: Omit<CallLog, 'id' | 'timestamp' | 'projectId'>) => {
    if (!activeProjectId || !user) return;
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
  }, [user, activeProjectId]);

  const deleteCallLog = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/callLogs`, id));
  }, [user]);

  const handleUpdateLog = useCallback(async (logId: string, updates: LogUpdatePayload) => {
    if (!user) return;
    const logRef = doc(db, `users/${user.uid}/callLogs`, logId);
    
    const finalUpdates: any = { ...updates };

    // CRITICAL FIX: Do NOT update the original timestamp on every edit.
    delete finalUpdates.timestamp;

    // Handle callbackTime conversion and clearing
    if ('callbackTime' in finalUpdates) {
      finalUpdates.callbackTime = finalUpdates.callbackTime ? Timestamp.fromDate(new Date(finalUpdates.callbackTime)) : null;
    }
    
    if (finalUpdates.status && finalUpdates.status !== CallStatus.CallBackLater) {
        finalUpdates.callbackTime = null; // Clear callback time if status changes
    }

    await updateDoc(logRef, finalUpdates);
    
    setIsResolveModalOpen(false);
    setActiveCallback(null);
    setLogToUpdate(null);
  }, [user]);

  const handleUpdateFollowUpCount = useCallback(async (logId: string, count: number) => {
    if (!user) return;
    const logRef = doc(db, `users/${user.uid}/callLogs`, logId);
    await updateDoc(logRef, { followUpCount: count >= 0 ? count : 0 });
  }, [user]);

  const handleUpdateVisitStatus = useCallback(async (logId: string, visitWon: boolean) => {
    if (!user) return;
    const logRef = doc(db, `users/${user.uid}/callLogs`, logId);
    await updateDoc(logRef, { visitWon });
  }, [user]);

  const handleRequestVisitStatusUpdate = (log: CallLog) => {
    setLogToConfirmVisit(log);
  };

  const handleConfirmVisitStatusUpdate = () => {
    if (!logToConfirmVisit) return;
    handleUpdateVisitStatus(logToConfirmVisit.id, !logToConfirmVisit.visitWon);
    setLogToConfirmVisit(null);
  };


  const handleAddProject = async (name: string) => {
    if (!user) return;
    const newProject: Omit<Project, 'id'> = { name };
    const docRef = await addDoc(collection(db, `users/${user.uid}/projects`), newProject);
    setActiveProjectId(docRef.id);
  };

  const handleDeleteProject = async (id: string) => {
    if (!user) return;
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
       {logsForReview && (
        <ImportReviewModal
          logsToReview={logsForReview}
          onComplete={handleCompleteReview}
          onCancel={() => { setLogsForReview(null); setIsImporting(false); }}
        />
      )}
      {importResults && (
        <ImportStatusModal
          results={importResults}
          onClose={() => setImportResults(null)}
        />
      )}
      
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
      {logToConfirmVisit && (
        <ConfirmVisitStatusModal
            log={logToConfirmVisit}
            onClose={() => setLogToConfirmVisit(null)}
            onConfirm={handleConfirmVisitStatusUpdate}
        />
      )}


      <div className={`${activeCallback && !isResolveModalOpen ? 'pt-16' : ''}`}>
        <Header 
          projects={projects}
          activeProject={activeProject}
          onSwitchProject={handleSwitchProject}
          onManageProjects={() => setIsManageProjectsModalOpen(true)}
          onSignOut={onSignOut}
          userEmail={user.email}
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
                <DataManagement 
                    onFileImport={handleFileImport} 
                    isImporting={isImporting}
                    onExport={handleExport}
                />
              </div>
              <div className="lg:col-span-2">
                <CallList 
                  callLogs={callLogs} 
                  deleteCallLog={deleteCallLog}
                  onEditNotes={(log) => setLogToUpdate({ log, type: 'edit-notes' })}
                  onUpdateFollowUpCount={handleUpdateFollowUpCount}
                  onRequestVisitStatusUpdate={handleRequestVisitStatusUpdate}
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
