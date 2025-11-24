
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
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
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
    setPermissionError(null);
    // Changed to root 'projects' collection for shared access
    const projectsCol = collection(db, 'projects');
    const projectsQuery = query(projectsCol);

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const fetchedProjects: Project[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      
      // Sort projects by 'lastUpdated' DESCENDING.
      fetchedProjects.sort((a, b) => {
          const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      });
      
      setProjects(fetchedProjects);

      if (fetchedProjects.length > 0) {
        // If no active project selected, or current one deleted, default to top.
        if (!activeProjectId || !fetchedProjects.some(p => p.id === activeProjectId)) {
             setActiveProjectId(fetchedProjects[0].id);
        }
      } else {
        const defaultProject: Omit<Project, 'id'> = { 
            name: 'Default Project',
            lastUpdated: new Date().toISOString()
        };
        addDoc(projectsCol, defaultProject).then(docRef => {
            setActiveProjectId(docRef.id);
        }).catch(err => {
            console.error("Error creating default project:", err);
            if (err.code === 'permission-denied') {
                setPermissionError("Write permission denied. Please update your Firestore Security Rules in the Firebase Console.");
            } else {
                setPermissionError(`Could not initialize project: ${err.message}`);
            }
        });
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching projects:", error);
        if (error.code === 'permission-denied') {
             setPermissionError("Read permission denied. Please update your Firestore Security Rules.");
        }
        setIsLoading(false);
    });

    return () => unsubscribeProjects();
  }, [user, activeProjectId]);

  useEffect(() => {
    if (!user || !activeProjectId) return;
    
    // Changed to root 'callLogs' collection for shared access
    const logsCol = collection(db, 'callLogs');
    const logsQuery = query(logsCol, where("projectId", "==", activeProjectId));
    
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        const fetchedLogs: CallLog[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: (d.data().timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            callbackTime: (d.data().callbackTime as Timestamp)?.toDate().toISOString()
        } as CallLog));
        
        fetchedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setCallLogs(fetchedLogs);
    });

    // Changed to root 'statOverrides' collection for shared access
    const overridesDoc = doc(db, 'statOverrides', activeProjectId);
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

  // Check if there is a newer project available that isn't the current one.
  // This indicates sync activity on another device on a different project.
  const hasNewerData = useMemo(() => {
      if (projects.length > 0 && activeProjectId) {
          // Since projects is sorted by lastUpdated descending, projects[0] is the newest.
          // If the newest project is not the one we are looking at, alert the user.
          return projects[0].id !== activeProjectId;
      }
      return false;
  }, [projects, activeProjectId]);

  // --- Helper to touch project timestamp ---
  // We fire and forget this to not block UI.
  const touchProjectTimestamp = async () => {
      if (!user || !activeProjectId) return;
      const projectRef = doc(db, 'projects', activeProjectId);
      // We don't await this because if it fails or lags (e.g. offline), we don't want to stop the user.
      updateDoc(projectRef, { lastUpdated: new Date().toISOString() }).catch(err => {
          console.warn("Background sync of project timestamp failed (likely offline):", err);
      });
  };

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
            visitWon: false,
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
    const skippedCount = originalReviewCount - reviewedLogs.length;
    if (skippedCount > 0) {
        errors.push(`${skippedCount} row(s) were skipped by the user during review.`);
    }

    const previouslyImportedCount = importResults?.successCount || 0;
    setLogsForReview(null);
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
    const logsCollection = collection(db, 'callLogs');
    
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

    const projectRef = doc(db, 'projects', activeProjectId);
    batch.update(projectRef, { lastUpdated: new Date().toISOString() });

    try {
      await batch.commit();
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
    if (!activeProjectId || !user) {
        throw new Error("No active project or user. Cannot save log.");
    }
    const newLog: Omit<CallLog, 'id'> = {
      ...log,
      timestamp: new Date().toISOString(),
      projectId: activeProjectId,
      followUpCount: 0,
    };
    
    // Primary action: Save the log
    await addDoc(collection(db, 'callLogs'), {
        ...newLog,
        timestamp: Timestamp.fromDate(new Date(newLog.timestamp)),
        ...(newLog.callbackTime && { callbackTime: Timestamp.fromDate(new Date(newLog.callbackTime)) })
    });
    
    // Secondary action: Touch the timestamp. 
    // We do NOT await this in the critical path to avoid UI hanging if project doc is locked or net is slow.
    touchProjectTimestamp();

  }, [user, activeProjectId]);

  const deleteCallLog = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'callLogs', id));
    touchProjectTimestamp();
  }, [user, activeProjectId]);

  const handleUpdateLog = useCallback(async (logId: string, updates: LogUpdatePayload) => {
    if (!user) return;
    const logRef = doc(db, 'callLogs', logId);
    const finalUpdates: any = { ...updates };
    delete finalUpdates.timestamp;

    if ('callbackTime' in finalUpdates) {
      finalUpdates.callbackTime = finalUpdates.callbackTime ? Timestamp.fromDate(new Date(finalUpdates.callbackTime)) : null;
    }
    
    if (finalUpdates.status && finalUpdates.status !== CallStatus.CallBackLater) {
        finalUpdates.callbackTime = null;
    }

    await updateDoc(logRef, finalUpdates);
    touchProjectTimestamp();
    
    setIsResolveModalOpen(false);
    setActiveCallback(null);
    setLogToUpdate(null);
  }, [user, activeProjectId]);

  const handleUpdateFollowUpCount = useCallback(async (logId: string, count: number) => {
    if (!user) return;
    const logRef = doc(db, 'callLogs', logId);
    await updateDoc(logRef, { followUpCount: count >= 0 ? count : 0 });
    touchProjectTimestamp();
  }, [user, activeProjectId]);

  const handleUpdateVisitStatus = useCallback(async (logId: string, visitWon: boolean) => {
    if (!user) return;
    const logRef = doc(db, 'callLogs', logId);
    await updateDoc(logRef, { visitWon });
    touchProjectTimestamp();
  }, [user, activeProjectId]);

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
    const newProject: Omit<Project, 'id'> = { 
        name,
        lastUpdated: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'projects'), newProject);
    setActiveProjectId(docRef.id);
  };

  const handleDeleteProject = async (id: string) => {
    if (!user) return;
    if (projects.length <= 1) {
      alert("You cannot delete the last project.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this project and all its associated call logs? This action cannot be undone.")) {
      await deleteDoc(doc(db, 'projects', id));
      
      const logsQuery = query(collection(db, 'callLogs'), where("projectId", "==", id));
      const logsSnapshot = await getDocs(logsQuery);
      const batch = writeBatch(db);
      logsSnapshot.forEach(logDoc => {
          batch.delete(logDoc.ref);
      });
      await batch.commit();
      
      // No need to manually switch project; the snapshot listener will detect deletion 
      // and the effect hook will auto-select the next available project.
    }
  };

  const handleSwitchProject = (id: string) => {
    if (id !== activeProjectId) {
      setCallLogs([]);
      setActiveProjectId(id);
      setActiveCallback(null);
      // We also touch the project here to indicate it is now "active" and float it to top for others
      if(user) {
           const projectRef = doc(db, 'projects', id);
           updateDoc(projectRef, { lastUpdated: new Date().toISOString() }).catch(console.warn);
      }
    }
  };

  const handleSyncNewest = () => {
      if (projects.length > 0) {
          handleSwitchProject(projects[0].id);
      }
  };
  

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
       {isManageProjectsModalOpen && (
        <ManageProjectsModal
          projects={projects}
          activeProjectId={activeProjectId || ''}
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
          hasNewerData={hasNewerData}
          onSyncNewest={handleSyncNewest}
        />
        
        {permissionError && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 mx-4 sm:mx-6 lg:mx-8 mt-4 shadow-md rounded-r">
                <p className="font-bold">System Error</p>
                <p>{permissionError}</p>
            </div>
        )}

        <main className="p-4 sm:p-6 lg:p-8">
          {isLoading ? (
             <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-8 w-8 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-slate-500">Loading project data...</p>
                </div>
             </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-1 space-y-6">
                <CallLogger 
                    addCallLog={addCallLog} 
                    isReady={!!activeProjectId} 
                    projectName={activeProject?.name}
                />
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
