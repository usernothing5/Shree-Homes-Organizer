
export enum CallStatus {
  Interested = 'Interested',
  NotInterested = 'Not Interested',
  Ringing = 'Ringing', // Kept for historical data
  NotAnswered = 'Not Answered',
  CallBackLater = 'Call Back Later',
  DetailsShare = 'Details Share',
  Booked = 'Booked',
  SiteVisitGenerated = 'Site Visit Generated',
  SecondSiteVisit = 'Second Site Visit',
}

export interface Project {
  id: string;
  name: string;
  lastUpdated?: string; // ISO string
}

export interface CallLog {
  id:string;
  projectId: string;
  callerName: string;
  clientName: string;
  clientPhone?: string;
  status: CallStatus;
  timestamp: string; // ISO string
  callbackTime?: string; // ISO string
  notes?: string;
  followUpCount?: number;
  visitWon?: boolean;
  source?: string;
  sourceDetails?: string;
  isJunk?: boolean;
}

export interface User {
  uid: string;
  email: string | null;
}

export interface IncompleteLog {
  originalRow: Record<string, any>;
  parsedData: Partial<Omit<CallLog, 'id' | 'projectId'>>;
  missingFields: Array<keyof Pick<CallLog, 'clientName' | 'status' | 'timestamp'>>;
}

export interface CallerStats {
  totalCalls: number;
  answeredCalls: number;
  interestedClients: number;
  notInterestedClients: number;
}

export interface ActiveUser {
  uid: string;
  email: string;
  lastSeen: string; // ISO
}
