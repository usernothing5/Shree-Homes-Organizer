
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
import FirestoreRulesMessage from './components/FirestoreRulesMessage'; // Ensure this is imported if not already


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

const STORAGE_KEY_PROJECT = 'shree_homes_active_project';

// Robust helper to remove undefined keys which cause Firestore to crash
const sanitizeFirestoreData = (data: any) => {
    const clean: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            clean[key] = data[key];
        }
    });
    return clean;
};

const CrmApp: React.FC<CrmAppProps> = ({ user, onSignOut }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [statOverrides, setStatOverrides] = useState<StatOverrides>({});

  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const [activeCallback, setActiveCallback] = useState<CallLog | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isManageProjectsModalOpen, setIsManageProjectsModalOpen] = useState(false);
  
  const [logToUpdate, setLogToUpdate] = useState<{ log: CallLog; type: 'details-share' | 'edit-notes' } | null>(null);
  const [logToConfirmVisit, setLogToConfirmVisit] = useState<CallLog | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [logsForReview, setLogsForReview] = useState<IncompleteLog[] | null>(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Firestore Data Fetching ---

  // 1. Fetch Projects (Independent of active selection)
  useEffect(() => {
    if (!user) return;
    setIsProjectsLoading(true);
    setPermissionError(null);
    
    // Use root-level 'projects' collection for global sync
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
      setIsProjectsLoading(false);
    }, (error) => {
        console.error("Error fetching projects:", error);
        if (error.code === 'permission-denied') {
             setPermissionError("Read permission denied. Please update your Firestore Security Rules.");
        }
        setIsProjectsLoading(false);
    });

    return () => unsubscribeProjects();
  }, [user]);

  // 2. Manage Active Project Selection & Persistence
  useEffect(() => {
    const storedProjId = localStorage.getItem(STORAGE_KEY_PROJECT);

    if (projects.length > 0) {
        // If we have a stored ID and it exists in the fetched projects, use it.
        if (storedProjId && projects.some(p => p.id === storedProjId)) {
            if (activeProjectId !== storedProjId) {
                setActiveProjectId(storedProjId);
            }
        } 
        // If no stored ID or invalid, fallback to the most recently updated project (index 0).
        else if (!activeProjectId || !projects.some(p => p.id === activeProjectId)) {
             setActiveProjectId(projects[0].id);
             localStorage.setItem(STORAGE_KEY_PROJECT, projects[0].id);
        }
    } else if (!isProjectsLoading && projects.length === 0) {
        // Create default only if projects are fully loaded and empty
        const createDefault = async () => {
            try {
                // Double-check emptiness before creating
                const snap = await getDocs(collection(db, 'projects'));
                if (snap.empty) {
                    const defaultProject = { 
                        name: 'My Project',
                        lastUpdated: new Date().toISOString()
                    };
                    await addDoc(collection(db, 'projects'), defaultProject);
                }
            } catch (err: any) {
                console.error("Error creating default project:", err);
            }
        };
        createDefault();
    }
  }, [projects, isProjectsLoading, activeProjectId]);

  // 3. Fetch Call Logs (Dependent on Active Project)
  useEffect(() => {
    if (!user || !activeProjectId) {
        if (!activeProjectId) setCallLogs([]);
        return;
    }
    
    // Use root-level 'callLogs' collection
    const logsCol = collection(db, 'callLogs');
    const logsQuery = query(logsCol, where("projectId", "==", activeProjectId));
    
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        const fetchedLogs: CallLog[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: (d.data().timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            callbackTime: (d.data().callbackTime as Timestamp)?.toDate().toISOString()
        } as CallLog));
        
        // Client-side sort is fast for <5000 records
        fetchedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setCallLogs(fetchedLogs);
    }, (error) => {
        console.error("Error fetching logs:", error);
        if (error.code === 'permission-denied') {
             setPermissionError("Read permission denied. Please update your Firestore Security Rules.");
        }
    });

    const overridesDoc = doc(db, 'statOverrides', activeProjectId);
    const unsubscribeOverrides = onSnapshot(overridesDoc, (snapshot) => {
        if(snapshot.exists()) {
            setStatOverrides(prev => ({ ...prev, [activeProjectId]: snapshot.data() }));
        } else {
            setStatOverrides(prev => ({...prev, [activeProjectId]: {}}));
        }
    }, (error) => {
        console.warn("Error fetching stats overrides:", error);
    });

    return () => {
        unsubscribeLogs();
        unsubscribeOverrides();
    }
  }, [user, activeProjectId]);

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  const hasNewerData = useMemo(() => {
      if (projects.length > 0 && activeProjectId) {
          // If the first project in the list (sorted by recency) is NOT the active one,
          // it means another device updated a different project.
          return projects[0].id !== activeProjectId;
      }
      return false;
  }, [projects, activeProjectId]);

  // Check for duplicate project names which causes sync confusion
  const duplicateProjectWarning = useMemo(() => {
      if (!projects.length) return null;
      const names = projects.map(p => p.name);
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      if (duplicates.length > 0 && activeProject && duplicates.includes(activeProject.name)) {
          return `Warning: You have multiple projects named "${activeProject.name}". Devices might be connected to different projects. Please check the project list and delete duplicates.`;
      }
      return null;
  }, [projects, activeProject]);

  const touchProjectTimestamp = async () => {
      if (!user || !activeProjectId) return;
      const projectRef = doc(db, 'projects', activeProjectId);
      // Fire and forget, don't await to keep UI snappy
      updateDoc(projectRef, { lastUpdated: new Date().toISOString() }).catch(err => {
          console.warn("Background sync of project timestamp failed:", err);
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
      // Changed Logic: Check ANY log with a callback time, regardless of status.
      const overdueCallback = callLogs.find(log =>
        !log.isJunk && // Exclude junk from notifications
        log.callbackTime &&
        new Date(log.callbackTime) <= now &&
        !activeCallback
      );
      if (overdueCallback) {
        setActiveCallback(overdueCallback);
      }
    }

    callLogs.forEach(log => {
      // Changed Logic: Schedule timer for ANY log with a callback time, regardless of status.
      if (log.callbackTime && !log.isJunk) {
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
        let status = Object.values(CallStatus).find(s => s.toLowerCase() === statusString?.toLowerCase());
        
        // Auto-migrate Ringing to NotAnswered on import
        if (status === CallStatus.Ringing) {
            status = CallStatus.NotAnswered;
        }

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
            source: findKey(['source', 'lead source']),
            sourceDetails: findKey(['source details', 'source info', 'referer']),
            isJunk: false,
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
      // Sanitize before adding to batch
      batch.set(docRef, sanitizeFirestoreData(logWithProject));
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
        "Source": log.source,
        "Source Details": log.sourceDetails,
        "Status": log.status === CallStatus.Ringing ? CallStatus.NotAnswered : log.status,
        "Caller": log.callerName,
        "Notes": log.notes,
        "Date": new Date(log.timestamp).toLocaleDateString(),
        "Time": new Date(log.timestamp).toLocaleTimeString(),
        "Callback Time": log.callbackTime ? new Date(log.callbackTime).toLocaleString() : '',
        "Visit Won": log.visitWon ? "Yes" : "No",
        "Follow-ups": log.followUpCount,
        "Is Junk": log.isJunk ? "Yes" : "No"
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
      isJunk: false,
    };
    
    // Ensure timestamp is valid before converting to Firestore Timestamp
    const logDate = new Date(newLog.timestamp);
    if (isNaN(logDate.getTime())) {
        throw new Error("Cannot save: Invalid timestamp generated.");
    }

    // --- Optimistic Update ---
    // Create a temporary local entry to make the UI feel instant
    const tempId = `temp-${Date.now()}`;
    const optimisticLog: CallLog = {
        id: tempId,
        projectId: activeProjectId,
        ...log,
        timestamp: newLog.timestamp,
        followUpCount: 0,
        isJunk: false
    };

    setCallLogs(prev => {
        const updated = [optimisticLog, ...prev];
        return updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });

    // Primary action: Save the log to Firestore
    const dataToSave: any = {
        ...newLog,
        timestamp: Timestamp.fromDate(logDate),
    };

    if (newLog.callbackTime) {
        const cbDate = new Date(newLog.callbackTime);
        if (!isNaN(cbDate.getTime())) {
            dataToSave.callbackTime = Timestamp.fromDate(cbDate);
        }
    }
    
    try {
        await addDoc(collection(db, 'callLogs'), sanitizeFirestoreData(dataToSave));
        // Note: The onSnapshot listener will eventually fire with the real data (real ID).
        // It will replace our optimistic log because we replace the whole array.
        
        // Secondary action: Touch the timestamp to notify others
        touchProjectTimestamp();
    } catch (err) {
        // Rollback optimistic update if save fails
        console.error("Failed to save log:", err);
        setCallLogs(prev => prev.filter(l => l.id !== tempId));
        throw err; // Re-throw so CallLogger knows it failed
    }

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
      if (finalUpdates.callbackTime) {
          const cbDate = new Date(finalUpdates.callbackTime);
          if (!isNaN(cbDate.getTime())) {
             finalUpdates.callbackTime = Timestamp.fromDate(cbDate);
          } else {
              delete finalUpdates.callbackTime;
          }
      } else {
          finalUpdates.callbackTime = null; // Explicitly null to clear it
      }
    }
    
    // Sanitize updates as well
    await updateDoc(logRef, sanitizeFirestoreData(finalUpdates));
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
  
  const handleToggleJunk = useCallback(async (logId: string, currentStatus: boolean | undefined) => {
      if (!user) return;
      const logRef = doc(db, 'callLogs', logId);
      await updateDoc(logRef, { isJunk: !currentStatus });
      touchProjectTimestamp();
  }, [user, activeProjectId]);


  const handleAddProject = async (name: string) => {
    if (!user) return;
    const newProject: Omit<Project, 'id'> = { 
        name,
        lastUpdated: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'projects'), newProject);
    setActiveProjectId(docRef.id);
    localStorage.setItem(STORAGE_KEY_PROJECT, docRef.id);
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
    }
  };

  const handleSwitchProject = (id: string) => {
    if (id !== activeProjectId) {
      setCallLogs([]);
      setActiveProjectId(id);
      localStorage.setItem(STORAGE_KEY_PROJECT, id);
      setActiveCallback(null);
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
          isOnline={isOnline}
        />
        
        {permissionError && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 mx-4 sm:mx-6 lg:mx-8 mt-4 shadow-md rounded-r">
                <p className="font-bold">System Error</p>
                <p>{permissionError}</p>
                <div className="mt-4">
                    <FirestoreRulesMessage />
                </div>
            </div>
        )}
        
        {duplicateProjectWarning && !permissionError && (
             <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-4 mx-4 sm:mx-6 lg:mx-8 mt-4 shadow-md rounded-r flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                    <p className="font-bold">Possible Sync Issue</p>
                    <p>{duplicateProjectWarning}</p>
                </div>
            </div>
        )}

        <main className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-1 space-y-6">
                <CallLogger 
                    addCallLog={addCallLog} 
                    isReady={!!activeProjectId} 
                    projectName={activeProject?.name}
                />
                <Stats callLogs={callLogs} />
                <CallerPerformance 
                  todaysLogs={callLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString() && !log.isJunk)}
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
                  onToggleJunk={handleToggleJunk}
                />
              </div>
            </div>
        </main>
      </div>
    </div>
  );
};

export default CrmApp;
