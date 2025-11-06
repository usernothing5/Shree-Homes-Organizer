import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePersistentState } from './hooks/usePersistentState';
import { CallLog, CallStatus, Project, IncompleteLog } from './types';
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
import DataImporter from './components/DataImporter';
import ImportStatusModal, { ImportResults } from './components/ImportStatusModal';
import ImportReviewModal from './components/ImportReviewModal';


type LogUpdatePayload = {
  status?: CallStatus;
  notes?: string;
  callbackTime?: string;
};

const CrmApp: React.FC = () => {
  const [projects, setProjects, isProjectsDirty, saveProjects, syncProjects] = usePersistentState<Project[]>('projects', []);
  const [activeProjectId, setActiveProjectId, isActiveProjectIdDirty, saveActiveProjectId, syncActiveProjectId] = usePersistentState<string | null>('activeProjectId', null);
  const [callLogs, setCallLogs, areCallLogsDirty, saveCallLogs, syncCallLogs] = usePersistentState<CallLog[]>('callLogs', []);
  
  const [activeCallback, setActiveCallback] = useState<CallLog | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isManageProjectsModalOpen, setIsManageProjectsModalOpen] = useState(false);
  
  const [logToUpdate, setLogToUpdate] = useState<{ log: CallLog; type: 'details-share' | 'edit-notes' } | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [stagedImportResults, setStagedImportResults] = useState<ImportResults | null>(null);
  const [logsForReview, setLogsForReview] = useState<IncompleteLog[] | null>(null);

  // Load data from URL hash on initial load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#data=')) {
        try {
            const encodedData = hash.substring(6);
            const decodedData = atob(encodedData);
            const { projects: loadedProjects, callLogs: loadedCallLogs, activeProjectId: loadedActiveProjectId } = JSON.parse(decodedData);

            if (Array.isArray(loadedProjects) && Array.isArray(loadedCallLogs)) {
                syncProjects(loadedProjects);
                syncCallLogs(loadedCallLogs);
                syncActiveProjectId(loadedActiveProjectId ?? loadedProjects[0]?.id ?? null);
            }
            // Clear hash after loading
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch (e) {
            console.error("Failed to parse data from URL hash", e);
            alert("Could not load data from the link. It may be corrupted or invalid.");
        }
    }
  }, [syncProjects, syncCallLogs, syncActiveProjectId]);


  // Combine dirty flags into a single app-wide status
  const isAppDirty = isProjectsDirty || isActiveProjectIdDirty || areCallLogsDirty;

  // Function to save all changes across the app
  const saveAllChanges = useCallback(() => {
    saveProjects();
    saveActiveProjectId();
    saveCallLogs();
  }, [saveProjects, saveActiveProjectId, saveCallLogs]);

  // Warn user about unsaved changes before leaving the page
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isAppDirty) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAppDirty]);

  // Initialize default project or correct an invalid active project ID
  useEffect(() => {
    if (projects.length === 0) {
      const defaultProject: Project = { id: crypto.randomUUID(), name: 'Default Project' };
      setProjects([defaultProject]);
      setActiveProjectId(defaultProject.id);
    } else if (!activeProjectId || !projects.find(p => p.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId, setProjects, setActiveProjectId]);
  
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  
  const activeProjectLogs = useMemo(() => {
    if (!activeProjectId) return [];
    return callLogs.filter(log => log.projectId === activeProjectId);
  }, [callLogs, activeProjectId]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const timers: number[] = [];

    if (!activeCallback) {
      const now = new Date();
      const overdueCallback = activeProjectLogs.find(log =>
        log.status === CallStatus.CallBackLater &&
        log.callbackTime &&
        new Date(log.callbackTime) <= now &&
        !activeCallback // Check if it's already the active one
      );
      if (overdueCallback) {
        setActiveCallback(overdueCallback);
      }
    }

    activeProjectLogs.forEach(log => {
      if (log.status === CallStatus.CallBackLater && log.callbackTime) {
        const callbackDate = new Date(log.callbackTime);
        const now = new Date();
        if (callbackDate > now) {
          const timeout = callbackDate.getTime() - now.getTime();
          const timerId = window.setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification('Call Reminder', {
                body: `Time to call ${log.clientName} in project ${activeProject?.name || ''}!`,
                icon: '/favicon.ico'
              });
            }
             setActiveCallback(currentActive => currentActive && currentActive.id === log.id ? currentActive : log);
          }, timeout);
          timers.push(timerId);
        }
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [activeProjectLogs, activeCallback, activeProject]);

  const addCallLog = useCallback((log: Omit<CallLog, 'id' | 'timestamp' | 'projectId'>) => {
    if (!activeProjectId) return;
    const newLog: CallLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      projectId: activeProjectId,
      followUpCount: 1,
    };
    setCallLogs(prevLogs => [newLog, ...prevLogs]);
  }, [setCallLogs, activeProjectId]);

  const deleteCallLog = useCallback((id: string) => {
    setCallLogs(prevLogs => prevLogs.filter(log => log.id !== id));
  }, [setCallLogs]);

  const handleAddProject = (name: string) => {
    const newProject: Project = { id: crypto.randomUUID(), name };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert("You cannot delete the last project.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this project and all its associated call logs? This action cannot be undone.")) {
      const updatedProjects = projects.filter(p => p.id !== id);
      
      setProjects(updatedProjects);
      setCallLogs(prevLogs => prevLogs.filter(log => log.projectId !== id));
      
      if (id === activeProjectId) {
        setActiveProjectId(updatedProjects[0]?.id || null);
      }
    }
  };

  const handleSwitchProject = (id: string) => {
    if (id !== activeProjectId) {
      setActiveProjectId(id);
      setActiveCallback(null);
    }
  };

  const handleOpenResolveModal = () => {
    if (activeCallback) {
      setIsResolveModalOpen(true);
    }
  };
  
  const handleCloseModals = () => {
    setIsResolveModalOpen(false);
    setActiveCallback(null);
    setLogToUpdate(null);
  }

  const handleUpdateLog = (logId: string, updates: LogUpdatePayload) => {
    setCallLogs(prevLogs =>
      prevLogs.map(log => {
        if (log.id !== logId) {
          return log;
        }

        const mergedLog = {
            ...log,
            ...updates,
            timestamp: new Date().toISOString(),
        };
        
        if (updates.status && updates.status !== CallStatus.CallBackLater) {
            const { callbackTime, ...finalLog } = mergedLog;
            return finalLog as CallLog;
        }

        return mergedLog;
      })
    );
    handleCloseModals();
  };
  
  const handleUpdateFollowUpCount = (logId: string, count: number) => {
    setCallLogs(prevLogs =>
      prevLogs.map(log =>
        log.id === logId ? { ...log, followUpCount: count >= 0 ? count : 0 } : log
      )
    );
  };

  const handleFileImport = async (file: File) => {
    if (!activeProjectId) {
      alert("Please select a project before importing.");
      return;
    }
    setIsImporting(true);

    try {
      const fileData = await file.arrayBuffer();
      const workbook = (window as any).XLSX.read(fileData, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = (window as any).XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

      if (jsonData.length === 0) {
        setImportResults({ successCount: 0, errorCount: 1, errors: ["The file is empty or could not be read."] });
        setIsImporting(false);
        return;
      }
      
      const logsForReview: IncompleteLog[] = [];
      const errors: string[] = [];

      const getColumnValue = (row: Record<string, any>, keys: string[]): [any, string | undefined] => {
        const rowKeys = Object.keys(row);
        for (const rKey of rowKeys) {
          const normalizedKey = rKey.toLowerCase().trim().replace(/\s+/g, '');
          if (keys.includes(normalizedKey)) {
            return [row[rKey], rKey];
          }
        }
        return [undefined, undefined];
      };

      const mapStatus = (statusString: any): CallStatus | null => {
        if (typeof statusString !== 'string' || !statusString) return null;
        const lowerStatus = statusString.toLowerCase().trim();
        for (const status of Object.values(CallStatus)) {
            if (status.toLowerCase().trim() === lowerStatus) {
                return status;
            }
        }
        if (lowerStatus.includes('interest') && !lowerStatus.includes('not')) return CallStatus.Interested;
        if (lowerStatus.includes('not interested')) return CallStatus.NotInterested;
        if (lowerStatus.includes('no answer') || lowerStatus.includes('not answered')) return CallStatus.NotAnswered;
        if (lowerStatus.includes('call back') || lowerStatus.includes('callback')) return CallStatus.CallBackLater;
        if (lowerStatus.includes('share') || lowerStatus.includes('details')) return CallStatus.DetailsShare;
        return null;
      };

      jsonData.forEach((row, index) => {
        if (!row || Object.values(row).every(v => v === null || v === '')) return; // Skip empty/null rows

        const parsedData: Partial<Omit<CallLog, 'id' | 'projectId'>> = {};
        const missingFields: Array<keyof Pick<CallLog, 'clientName' | 'status' | 'timestamp'>> = [];
        const usedKeys = new Set<string>();
        
        const [name, nameKey] = getColumnValue(row, ['name', 'clientname']);
        if(nameKey) usedKeys.add(nameKey);

        const [phone, phoneKey] = getColumnValue(row, ['number', 'phone', 'phonenumber', 'clientphone']);
        if(phoneKey) usedKeys.add(phoneKey);
        
        const [date, dateKey] = getColumnValue(row, ['date', 'timestamp']);
        if(dateKey) usedKeys.add(dateKey);

        const [feedback, feedbackKey] = getColumnValue(row, ['feedback', 'status', 'callresult']);
        if(feedbackKey) usedKeys.add(feedbackKey);

        const [remark, remarkKey] = getColumnValue(row, ['remark', 'remarks', 'notes']);
        if(remarkKey) usedKeys.add(remarkKey);
        
        const [callback, callbackKey] = getColumnValue(row, ['callbacktime', 'callback']);
        if(callbackKey) usedKeys.add(callbackKey);

        if (name) parsedData.clientName = String(name);
        else missingFields.push('clientName');
        
        if (phone) parsedData.clientPhone = String(phone);

        if (date && date instanceof Date && !isNaN(date.getTime())) {
          parsedData.timestamp = date.toISOString();
        } else if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                parsedData.timestamp = parsedDate.toISOString();
            } else {
                missingFields.push('timestamp');
            }
        } else {
            parsedData.timestamp = new Date().toISOString();
        }

        const status = mapStatus(feedback);
        if (status) parsedData.status = status;
        else missingFields.push('status');

        if (callback && parsedData.status === CallStatus.CallBackLater) {
             const parsedCallback = new Date(callback);
             if (!isNaN(parsedCallback.getTime())) parsedData.callbackTime = parsedCallback.toISOString();
        }

        const otherNotes = Object.keys(row)
          .filter(key => !usedKeys.has(key) && row[key])
          .map(key => `${key}: ${row[key]}`)
          .join('\n');
        
        parsedData.notes = [remark || '', otherNotes].filter(Boolean).join('\n\n');
        parsedData.followUpCount = 1;

        if (Object.keys(row).length > 0) {
            logsForReview.push({ originalRow: row, parsedData, missingFields });
        } else {
            errors.push(`Row ${index + 2}: The row appears to be empty.`);
        }
      });

      if (logsForReview.length > 0) {
        setStagedImportResults({ successCount: 0, errorCount: errors.length, errors });
        setLogsForReview(logsForReview);
      } else {
        setImportResults({ successCount: 0, errorCount: errors.length, errors: [...errors, "No data rows could be parsed from the file."] });
        setStagedImportResults(null);
      }

    } catch (error) {
      console.error("Error during file import:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setImportResults({ successCount: 0, errorCount: 1, errors: ["Failed to process the file. Please check the file format.", errorMessage] });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReviewCancel = () => {
    if (stagedImportResults) {
      setImportResults(stagedImportResults);
    }
    setLogsForReview(null);
    setStagedImportResults(null);
  };

  const handleReviewComplete = (reviewedLogs: Array<Omit<CallLog, 'id' | 'projectId'>>) => {
    if (!activeProjectId) return;
    const newLogs: CallLog[] = reviewedLogs.map(log => ({
      ...log,
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      timestamp: log.timestamp || new Date().toISOString(),
      followUpCount: log.followUpCount ?? 1,
    }));
  
    setCallLogs(prev => [...newLogs, ...prev]);
  
    const skippedCount = logsForReview ? logsForReview.length - reviewedLogs.length : 0;
  
    if (stagedImportResults) {
      setImportResults({
        successCount: stagedImportResults.successCount + newLogs.length,
        errorCount: stagedImportResults.errorCount + skippedCount,
        errors: [
          ...stagedImportResults.errors,
          ...(skippedCount > 0 ? [`${skippedCount} row(s) were skipped during review.`] : []),
        ],
      });
    }
  
    setLogsForReview(null);
    setStagedImportResults(null);
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
          onCancel={handleReviewCancel}
          onComplete={handleReviewComplete}
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
          onResolve={handleOpenResolveModal}
        />
      )}
      {isResolveModalOpen && activeCallback && (
        <ResolveCallbackModal
          callLog={activeCallback}
          onClose={handleCloseModals}
          onUpdate={handleUpdateLog}
        />
      )}
      {logToUpdate?.type === 'details-share' && (
        <UpdateDetailsShareModal
            callLog={logToUpdate.log}
            onClose={handleCloseModals}
            onUpdate={handleUpdateLog}
        />
      )}
      {logToUpdate?.type === 'edit-notes' && (
        <EditNotesModal
            callLog={logToUpdate.log}
            onClose={handleCloseModals}
            onUpdate={(logId, notes) => handleUpdateLog(logId, { notes })}
        />
      )}

      <div className={`${activeCallback && !isResolveModalOpen ? 'pt-16' : ''}`}>
        <Header 
          projects={projects}
          activeProject={activeProject}
          onSwitchProject={handleSwitchProject}
          onManageProjects={() => setIsManageProjectsModalOpen(true)}
          isDirty={isAppDirty}
          onSave={saveAllChanges}
        />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-1 space-y-6">
              <CallLogger addCallLog={addCallLog} />
              <Stats callLogs={activeProjectLogs} />
              <ScheduledCallbacks callLogs={activeProjectLogs} />
              <PendingFollowUps 
                callLogs={activeProjectLogs} 
                onUpdate={(log) => setLogToUpdate({ log, type: 'details-share' })} 
              />
              <DataImporter onFileImport={handleFileImport} isImporting={isImporting} />
            </div>
            <div className="lg:col-span-2">
              <CallList 
                callLogs={activeProjectLogs} 
                deleteCallLog={deleteCallLog}
                onEditNotes={(log) => setLogToUpdate({ log, type: 'edit-notes' })}
                onUpdateFollowUpCount={handleUpdateFollowUpCount}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CrmApp;