
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { CallLog, CallStatus, Project, User } from './types';
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


type LogUpdatePayload = {
  status?: CallStatus;
  notes?: string;
  callbackTime?: string;
};

interface CrmAppProps {
  user: User;
  onLogout: () => void;
}

const CrmApp: React.FC<CrmAppProps> = ({ user, onLogout }) => {
  const [projects, setProjects] = useLocalStorage<Project[]>(`projects_${user.email}`, []);
  const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>(`activeProjectId_${user.email}`, null);
  const [callLogs, setCallLogs] = useLocalStorage<CallLog[]>(`callLogs_${user.email}`, []);
  
  const [activeCallback, setActiveCallback] = useState<CallLog | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isManageProjectsModalOpen, setIsManageProjectsModalOpen] = useState(false);

  const [logToUpdate, setLogToUpdate] = useState<{ log: CallLog; type: 'details-share' | 'edit-notes' } | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);


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
          const timerId = setTimeout(() => {
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
            return finalLog;
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

  const handleFileImport = (file: File) => {
    if (!activeProjectId) {
        alert("Please select a project before importing.");
        return;
    }
    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
        const data = e.target?.result;
        if (!data) {
            setIsImporting(false);
            return;
        }

        try {
            const workbook = (window as any).XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[] = (window as any).XLSX.utils.sheet_to_json(worksheet);

            const newLogs: CallLog[] = [];
            const errors: string[] = [];

            jsonData.forEach((row, index) => {
                const { 'Client Name': clientName, Status: status, Timestamp: timestamp } = row;

                if (!clientName || !status || !timestamp) {
                    errors.push(`Row ${index + 2}: Missing required fields (Client Name, Status, Timestamp).`);
                    return;
                }
                
                if (!Object.values(CallStatus).includes(status as CallStatus)) {
                    errors.push(`Row ${index + 2}: Invalid status "${status}".`);
                    return;
                }

                // Handle Excel date numbers or date strings
                let parsedTimestamp: Date;
                if (typeof timestamp === 'number') {
                    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                    parsedTimestamp = new Date(excelEpoch.getTime() + timestamp * 24 * 60 * 60 * 1000);
                } else {
                    parsedTimestamp = new Date(timestamp);
                }

                if (isNaN(parsedTimestamp.getTime())) {
                    errors.push(`Row ${index + 2}: Invalid Timestamp format "${timestamp}".`);
                    return;
                }
                
                const newLog: CallLog = {
                    id: crypto.randomUUID(),
                    projectId: activeProjectId,
                    clientName: String(clientName),
                    clientPhone: row['Client Phone'] ? String(row['Client Phone']) : undefined,
                    status: status as CallStatus,
                    timestamp: parsedTimestamp.toISOString(),
                    notes: row['Notes'] ? String(row['Notes']) : undefined,
                    followUpCount: row['Number of Follow-ups'] != null ? Number(row['Number of Follow-ups']) : 1,
                };

                if (newLog.status === CallStatus.CallBackLater) {
                    const { 'Callback Time': callbackTime } = row;
                    if (!callbackTime) {
                        errors.push(`Row ${index + 2}: Missing "Callback Time" for "Call Back Later" status.`);
                        return;
                    }
                     let parsedCallbackTime: Date;
                    if (typeof callbackTime === 'number') {
                        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                        parsedCallbackTime = new Date(excelEpoch.getTime() + callbackTime * 24 * 60 * 60 * 1000);
                    } else {
                        parsedCallbackTime = new Date(callbackTime);
                    }
                    if (isNaN(parsedCallbackTime.getTime())) {
                       errors.push(`Row ${index + 2}: Invalid Callback Time format "${callbackTime}".`);
                       return;
                    }
                    newLog.callbackTime = parsedCallbackTime.toISOString();
                }

                newLogs.push(newLog);
            });

            setCallLogs(prev => [...newLogs, ...prev]);
            setImportResults({ successCount: newLogs.length, errorCount: errors.length, errors });

        } catch (error) {
            console.error("Error parsing file:", error);
            setImportResults({ successCount: 0, errorCount: 0, errors: ["Failed to parse the file. Please ensure it is a valid Excel or CSV file."] });
        } finally {
            setIsImporting(false);
        }
    };

    reader.onerror = () => {
        alert("Failed to read file.");
        setIsImporting(false);
    };

    reader.readAsBinaryString(file);
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
          userEmail={user.email}
          onLogout={onLogout}
          projects={projects}
          activeProject={activeProject}
          onSwitchProject={handleSwitchProject}
          onManageProjects={() => setIsManageProjectsModalOpen(true)}
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
