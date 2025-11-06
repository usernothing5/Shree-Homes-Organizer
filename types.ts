export enum CallStatus {
  Interested = 'Interested',
  NotInterested = 'Not Interested',
  NotAnswered = 'Not Answered',
  CallBackLater = 'Call Back Later',
  DetailsShare = 'Details Share',
}

export interface Project {
  id: string;
  name: string;
}

export interface CallLog {
  id:string;
  projectId: string;
  clientName: string;
  clientPhone?: string;
  status: CallStatus;
  timestamp: string; // ISO string
  callbackTime?: string; // ISO string
  notes?: string;
  followUpCount?: number;
}

export interface User {
  email: string;
}

export interface IncompleteLog {
  originalRow: Record<string, any>;
  parsedData: Partial<Omit<CallLog, 'id' | 'projectId'>>;
  missingFields: Array<keyof Pick<CallLog, 'clientName' | 'status' | 'timestamp'>>;
}