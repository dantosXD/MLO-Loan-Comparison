/**
 * Client Management System Types
 * For tracking clients, scenarios, notes, and progress in loan officer workflow
 */

export interface ClientContact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  preferredContact: 'email' | 'phone' | 'text';
  createdAt: string;
  updatedAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  title: string;
  content: string;
  category: 'general' | 'meeting' | 'document' | 'follow_up' | 'important';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // For multi-user scenarios
}

export interface ClientScenario {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  loanData: any; // Will contain the loan comparison data
  status: 'draft' | 'active' | 'approved' | 'declined' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
}

export interface ClientReminder {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  dueDate: string;
  type: 'call' | 'email' | 'meeting' | 'document' | 'follow_up' | 'deadline';
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}

export interface ClientProgress {
  id: string;
  clientId: string;
  stage: 'initial_contact' | 'application' | 'processing' | 'underwriting' | 'approval' | 'closing' | 'completed';
  milestones: ClientMilestone[];
  currentStep?: string;
  estimatedCloseDate?: string;
  actualCloseDate?: string;
  updatedAt: string;
}

export interface ClientMilestone {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface ClientActivity {
  id: string;
  clientId: string;
  type: 'note_added' | 'scenario_created' | 'scenario_updated' | 'reminder_set' | 'milestone_completed' | 'contact_updated' | 
        'phone_call' | 'email_sent' | 'email_received' | 'meeting' | 'text_message' | 'document_sent' | 'document_received' | 'follow_up';
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  duration?: number; // For calls and meetings (in minutes)
  outcome?: 'successful' | 'no_answer' | 'voicemail' | 'rescheduled' | 'completed' | 'pending';
  followUpRequired?: boolean;
  followUpDate?: string;
}

export interface ClientSummary {
  client: ClientContact;
  totalScenarios: number;
  activeScenarios: number;
  pendingReminders: number;
  overdueReminders: number;
  currentStage: ClientProgress['stage'];
  lastActivity: string;
  nextReminder?: ClientReminder;
}

export interface ClientManagementState {
  clients: ClientContact[];
  selectedClientId?: string;
  activeView: 'dashboard' | 'client_detail' | 'scenarios' | 'reminders' | 'reports';
  filters: {
    stage?: ClientProgress['stage'];
    priority?: 'low' | 'medium' | 'high';
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  searchQuery: string;
}

export interface ClientManagementConfig {
  enableReminders: boolean;
  enableProgressTracking: boolean;
  enableActivityLog: boolean;
  defaultReminderTypes: string[];
  defaultScenarioStatuses: string[];
  autoSaveInterval: number;
  maxNotesPerClient: number;
  maxScenariosPerClient: number;
}
