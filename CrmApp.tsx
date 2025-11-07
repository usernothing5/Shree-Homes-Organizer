import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePersistentState } from './hooks/usePersistentState';
import { CallLog, CallStatus, Project, IncompleteLog, CallerStats } from './types';
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
import ShareModal from './components/ShareModal';
import CallerPerformance, { DailyCallerOverrides } from './components/CallerPerformance';


type LogUpdatePayload = {
  status?: CallStatus;
  notes?: string;
  callbackTime?: string;
};

// --- Data Compression Utilities ---

// Helper to convert an ArrayBuffer to a Base64 string
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Helper to convert a Base64 string to an ArrayBuffer
const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Compresses a string using the browser's GZIP compression and encodes it to Base64
async function compressAndEncode(dataString: string): Promise<string> {
  const stream = new Blob([dataString], { type: 'text/plain' }).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const compressedData = await new Response(compressedStream).arrayBuffer();
  return bufferToBase64(compressedData);
}

// Decodes a Base64 string and decompresses it using the browser's GZIP decompression
async function decodeAndDecompress(base64String: string): Promise<string> {
  const buffer = base64ToBuffer(base64String);
  const stream = new Blob([buffer], { type: 'application/octet-stream' }).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  return await new Response(decompressedStream).text();
}

type StatOverrides = {
  [projectId: string]: {
    [date: string]: DailyCallerOverrides;
  };
};

const CrmApp: React.FC = () => {
  const [projects, setProjects, isProjectsDirty, saveProjects, syncProjects] = usePersistentState<Project[]>('projects', []);
  const [activeProjectId, setActiveProjectId, isActiveProjectIdDirty, saveActiveProjectId, syncActiveProjectId] = usePersistentState<string | null>('activeProjectId', null);
  const [callLogs, setCallLogs, areCallLogsDirty, saveCallLogs, syncCallLogs] = usePersistentState<CallLog[]>('callLogs', []);
  const [statOverrides, setStatOverrides, areOverridesDirty, saveOverrides, syncOverrides] = usePersistentState<StatOverrides>('statOverrides', {});
  
  const [activeCallback, setActiveCallback] = useState<CallLog | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isManageProjectsModalOpen, setIsManageProjectsModalOpen] = useState(false);
  
  const [logToUpdate, setLogToUpdate] = useState<{ log: CallLog; type: 'details-share' | 'edit-notes' } | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [stagedImportResults, setStagedImportResults] = useState<ImportResults | null>(null);
  const [logsForReview, setLogsForReview] = useState<IncompleteLog[] | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Load data from URL hash on initial load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#d=') || hash.startsWith('#data=')) {
        const loadData = async () => {
          try {
              let decodedData: string;
              if (hash.startsWith('#d=')) { // New compressed format
                  const encodedData = hash.substring(3);
                  decodedData = await decodeAndDecompress(encodedData);
              } else { // Old uncompressed format (for backward compatibility)
                  const encodedData = hash.substring(6);
                  decodedData = atob(encodedData);
              }
              
              const { projects: loadedProjects, callLogs: loadedCallLogs, activeProjectId: loadedActiveProjectId, statOverrides: loadedOverrides } = JSON.parse(decodedData);

              if (Array.isArray(loadedProjects) && Array.isArray(loadedCallLogs)) {
                  syncProjects(loadedProjects);
                  syncCallLogs(loadedCallLogs);
                  syncActiveProjectId(loadedActiveProjectId ?? loadedProjects[0]?.id ?? null);
                  syncOverrides(loadedOverrides ?? {});
              }
              // Clear hash after loading
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
              alert("Data loaded successfully from the link!");
          } catch (e) {
              console.error("Failed to parse data from URL hash", e);
              alert("Could not load data from the link. It may be corrupted, invalid, or created with an incompatible version.");
          }
        };
        loadData();
    }
  }, [syncProjects, syncCallLogs, syncActiveProjectId, syncOverrides]);


  // Combine dirty flags into a single app-wide status
  const isAppDirty = isProjectsDirty || isActiveProjectIdDirty || areCallLogsDirty || areOverridesDirty;

  // Function to save all changes across the app
  const saveAllChanges = useCallback(() => {
    saveProjects();
    saveActiveProjectId();
    saveCallLogs();
    saveOverrides();
  }, [saveProjects, saveActiveProjectId, saveCallLogs, saveOverrides]);

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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const todaysLogs = useMemo(() => {
    return activeProjectLogs.filter(log => isToday(new Date(log.timestamp)));
  }, [activeProjectLogs]);
  
  const todaysOverrides = useMemo(() => {
    if (!activeProjectId) return undefined;
    const todayString = new Date().toISOString().split('T')[0];
    return statOverrides[activeProjectId]?.[todayString];
  }, [statOverrides, activeProjectId]);

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
      followUpCount: 0,
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
  
  const handleUpdateOverride = useCallback((callerName: string, newStats: Partial<CallerStats>) => {
    if (!activeProjectId) return;
    const todayString = new Date().toISOString().split('T')[0];
    setStatOverrides(prev => {
        const newOverrides = JSON.parse(JSON.stringify(prev)); // Deep copy
        if (!newOverrides[activeProjectId]) newOverrides[activeProjectId] = {};
        if (!newOverrides[activeProjectId][todayString]) newOverrides[activeProjectId][todayString] = {};

        if (Object.keys(newStats).length > 0) {
              newOverrides[activeProjectId][todayString][callerName] = newStats;
        } else {
              // If the newStats object is empty, it means all overrides were removed
              delete newOverrides[activeProjectId][todayString][callerName];
              // Clean up empty objects
              if (Object.keys(newOverrides[activeProjectId][todayString]).length === 0) {
                  delete newOverrides[activeProjectId][todayString];
              }
              if (Object.keys(newOverrides[activeProjectId]).length === 0) {
                  delete newOverrides[activeProjectId];
              }
        }
        return newOverrides;
    });
  }, [activeProjectId, setStatOverrides]);


  const handleShareData = async () => {
    saveAllChanges(); // Ensure we're sharing the latest saved state
    const dataToShare = {
        projects,
        callLogs,
        activeProjectId,
        statOverrides,
    };
    try {
        const jsonString = JSON.stringify(dataToShare);
        const compressedEncodedData = await compressAndEncode(jsonString);
        const url = `${window.location.origin}${window.location.pathname}#d=${compressedEncodedData}`;
        setShareUrl(url);
        setIsShareModalOpen(true);
    } catch (e) {
        console.error("Failed to compress data for sharing:", e);
        alert("Could not create share link due to a browser compatibility issue. Please try using a modern browser like Chrome, Firefox, or Safari.");
    }
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
        const missingFields: Array<keyof Pick<CallLog, 'clientName' | 'status' | 'timestamp' | 'callerName'>> = [];
        const usedKeys = new Set<string>();
        
        const [caller, callerKey] = getColumnValue(row, ['caller', 'callername']);
        if(callerKey) usedKeys.add(callerKey);
        
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
        
        if (caller) parsedData.callerName = String(caller);
        else missingFields.push('callerName');

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
        parsedData.followUpCount = 0;

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
      followUpCount: log.followUpCount ?? 0,
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
       {isShareModalOpen && (
        <ShareModal 
          shareUrl={shareUrl}
          onClose={() => setIsShareModalOpen(false)}
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
              <CallerPerformance 
                todaysLogs={todaysLogs}
                overrides={todaysOverrides}
                onUpdateOverride={handleUpdateOverride}
              />
              <ScheduledCallbacks callLogs={activeProjectLogs} />
              <PendingFollowUps 
                callLogs={activeProjectLogs} 
                onUpdate={(log) => setLogToUpdate({ log, type: 'details-share' })} 
              />
              <DataManagement onFileImport={handleFileImport} isImporting={isImporting} onShareData={handleShareData} />
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