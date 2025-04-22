// Interfaces para el sistema de asesorías

export interface Advisor {
  id: string;
  user_id: string;
  name: string;
  bio?: string;
  specialty?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  google_account_email?: string;
  calendar_sync_token?: string;
  available: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdvisorAssignment {
  id: string;
  advisor_id: string;
  company_id: string;
  program_id: string;
  created_at: string;
  advisor?: Advisor;
  company?: {
    id: string;
    name: string;
  };
  program?: {
    id: string;
    name: string;
  };
}

export interface AdvisorySession {
  id: string;
  title: string;
  description?: string;
  duration: number;
  session_type: string;
  preparation_instructions?: string;
  advisor_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvisoryAllocation {
  id: string;
  program_module_id: string;
  company_id: string;
  total_minutes: number;
  used_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AdvisoryBooking {
  id: string;
  company_id: string;
  advisor_id: string;
  session_id: string;
  start_time: string;
  end_time: string;
  google_event_id?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
  advisor?: Advisor;
  session?: AdvisorySession;
  company?: {
    id: string;
    name: string;
  };
}

export interface AdvisoryReport {
  id: string;
  booking_id: string;
  company_id: string;
  advisor_id: string;
  notes?: string;
  commitments?: string;
  created_at: string;
  updated_at: string;
  submitted: boolean;
  booking?: AdvisoryBooking;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AvailabilityDay {
  date: Date;
  slots: TimeSlot[];
}
