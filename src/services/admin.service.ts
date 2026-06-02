import api from './api';
import type { Bundle } from './participant.service';

export interface Submission {
  history_id: number;
  username: string;
  nama_bundle: string;
  status: 'menunggu_koreksi' | 'selesai';
  tanggal_submit: string;
}

export interface SubmissionDetail {
  history_id: number;
  username: string;
  detail_jawaban: Array<{
    soal_id: number;
    teks_soal: string;
    jawaban_peserta: string;
    skor_didapat: number;
    is_dinilai: boolean;
  }>;
}

export interface DashboardStats {
  total_students: number;
  today_sessions: number;
  this_week_sessions: number;
  pending_payments: number;
  this_month_revenue: number;
  total_omzet: number;
}

export interface Student {
  id: number;
  public_id?: string;
  name: string;
  school: string;
  grade: string;
  contact: string;
  address: string;
  is_active: boolean;
}

export interface Session {
  id: number;
  public_id?: string;
  student_id: number;
  student_name?: string;
  subject: string;
  date: string;
  time: string;
  price: number;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date?: string;
  google_event_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentSession {
  id: number;
  document_id: number;
  session_id?: number | null;
  session_date: string;
  session_time: string;
  subject: string;
  note?: string;
  price: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  created_at?: string;
}

export interface StudentDocument {
  id: number;
  public_id?: string;
  document_kind: 'invoice' | 'report';
  document_number: string;
  student_id: number;
  student_name?: string;
  linked_invoice_id?: number | null;
  linked_invoice_number?: string | null;
  period_start: string;
  period_end: string;
  total_amount: number;
  summary?: string;
  message?: string;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  session_count: number;
  sessions?: DocumentSession[];
}

export interface CreateDocumentRequest {
  student_id: number;
  session_ids: number[];
  linked_invoice_id?: number;
  summary?: string;
  message?: string;
}

export type { Bundle };

export const adminService = {
  // Dashboard
  getStats: async (): Promise<DashboardStats | null> => {
    try {
      const response = await api.get<any>('/admin/dashboard/stats');
      const data = response.data?.data || response.data;
      console.log('Dashboard Stats Response:', response.data);
      return data;
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err.response?.data || err.message);
      return null;
    }
  },

  // Bundles
  getBundles: async (): Promise<Bundle[]> => {
    try {
      const response = await api.get<any>('/admin/bundles');
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching bundles:', err.response?.data || err.message);
      return [];
    }
  },

  uploadBundle: async (formData: FormData) => {
    try {
      const response = await api.post('/admin/bundles/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (err: any) {
      console.error('Error uploading bundle:', err.response?.data || err.message);
      throw err;
    }
  },

  exportBundle: async (bundleId: number) => {
    const response = await api.get(`/admin/bundles/${bundleId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },

  updateBundleWithExcel: async (bundleId: number, formData: FormData) => {
    const response = await api.put(`/admin/bundles/${bundleId}/update`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Submissions & Grading
  getSubmissions: async (status?: string): Promise<Submission[]> => {
    try {
      const params = status ? { status } : {};
      const response = await api.get<any>('/admin/submissions', { params });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching submissions:', err.response?.data || err.message);
      return [];
    }
  },

  getSubmissionDetail: async (historyId: number): Promise<SubmissionDetail> => {
    const response = await api.get<any>(`/admin/submissions/${historyId}`);
    const data = response.data?.data || response.data;
    return data;
  },

  gradeSubmission: async (historyId: number, penilaian: Array<{ soal_id: number; skor_diberikan: number }>) => {
    const response = await api.put(`/admin/submissions/${historyId}/grade`, { penilaian_manual: penilaian });
    return response.data;
  },

  // Students
  getStudents: async (filters?: { active?: boolean }): Promise<Student[]> => {
    try {
      const response = await api.get<any>('/admin/students', { params: filters });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching students:', err.response?.data || err.message);
      return [];
    }
  },

  getStudentDetail: async (id: number): Promise<Student | null> => {
    try {
      const response = await api.get<any>(`/admin/students/${id}`);
      const data = response.data?.data || response.data;
      return data;
    } catch (err: any) {
      console.error('Error fetching student detail:', err.response?.data || err.message);
      return null;
    }
  },

  createStudent: async (student: Omit<Student, 'id'>) => {
    const response = await api.post('/admin/students', student);
    return response.data?.data || response.data;
  },

  updateStudent: async (id: number, student: Partial<Student>) => {
    const response = await api.put(`/admin/students/${id}`, student);
    return response.data?.data || response.data;
  },

  deleteStudent: async (id: number) => {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data?.data || response.data;
  },

  // Sessions
  getSessions: async (filters?: any): Promise<Session[]> => {
    try {
      const response = await api.get<any>('/admin/sessions', { params: filters });
      const data = response.data?.data || response.data;
      console.log('Admin Sessions Response:', response.data);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching sessions:', err.response?.data || err.message);
      return [];
    }
  },

  createSession: async (session: Omit<Session, 'id'>) => {
    try {
      const response = await api.post('/admin/sessions', session);
      return response.data;
    } catch (err: any) {
      console.error('Error creating session:', err.response?.data || err.message);
      throw err;
    }
  },

  updateSession: async (id: number, session: Partial<Session>) => {
    try {
      const response = await api.put(`/admin/sessions/${id}`, session);
      return response.data;
    } catch (err: any) {
      console.error('Error updating session:', err.response?.data || err.message);
      throw err;
    }
  },

  deleteSession: async (id: number) => {
    try {
      const response = await api.delete(`/admin/sessions/${id}`);
      return response.data;
    } catch (err: any) {
      console.error('Error deleting session:', err.response?.data || err.message);
      throw err;
    }
  },

  // Documents
  getInvoices: async (filters?: { studentId?: number; linkedInvoiceId?: number }): Promise<StudentDocument[]> => {
    try {
      const response = await api.get<any>('/admin/invoices', { params: filters });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching invoices:', err.response?.data || err.message);
      return [];
    }
  },

  getInvoiceDetail: async (id: number): Promise<StudentDocument | null> => {
    try {
      const response = await api.get<any>(`/admin/invoices/${id}`);
      const data = response.data?.data || response.data;
      return data;
    } catch (err: any) {
      console.error('Error fetching invoice detail:', err.response?.data || err.message);
      return null;
    }
  },

  createInvoice: async (payload: CreateDocumentRequest): Promise<StudentDocument> => {
    const response = await api.post('/admin/invoices', payload);
    return response.data?.data || response.data;
  },

  getReports: async (filters?: { studentId?: number; linkedInvoiceId?: number }): Promise<StudentDocument[]> => {
    try {
      const response = await api.get<any>('/admin/reports', { params: filters });
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching reports:', err.response?.data || err.message);
      return [];
    }
  },

  getReportDetail: async (id: number): Promise<StudentDocument | null> => {
    try {
      const response = await api.get<any>(`/admin/reports/${id}`);
      const data = response.data?.data || response.data;
      return data;
    } catch (err: any) {
      console.error('Error fetching report detail:', err.response?.data || err.message);
      return null;
    }
  },

  createReport: async (payload: CreateDocumentRequest): Promise<StudentDocument> => {
    const response = await api.post('/admin/reports', payload);
    return response.data?.data || response.data;
  },
};
