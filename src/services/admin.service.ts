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
  name: string;
  school: string;
  grade: string;
  contact: string;
  address: string;
}

export interface Session {
  id: number;
  student_id: number;
  student_name?: string;
  subject: string;
  date: string;
  time: string;
  price: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'overdue';
}

export type { Bundle };

export const adminService = {
  // Dashboard
  getStats: async (): Promise<DashboardStats | null> => {
    try {
      const response = await api.get<any>('/admin/dashboard/stats');
      const data = response.data?.data || response.data;
      console.log('Dashboard Stats:', data);
      return data;
    } catch (err) {
      console.error('Error fetching dashboard stats (500):', err);
      return null;
    }
  },

  // Bundles
  getBundles: async (): Promise<Bundle[]> => {
    try {
      const response = await api.get<any>('/admin/bundles');
      const data = response.data?.data || response.data;
      console.log('Admin Bundles:', data);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching bundles:', err);
      return [];
    }
  },

  uploadBundle: async (formData: FormData) => {
    const response = await api.post('/admin/bundles/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
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
    const params = status ? { status } : {};
    const response = await api.get<any>('/admin/submissions', { params });
    const data = response.data?.data || response.data;
    console.log('Admin Submissions:', data);
    return Array.isArray(data) ? data : [];
  },

  getSubmissionDetail: async (historyId: number): Promise<SubmissionDetail> => {
    const response = await api.get<any>(`/admin/submissions/${historyId}`);
    const data = response.data?.data || response.data;
    console.log('Submission Detail:', data);
    return data;
  },

  gradeSubmission: async (historyId: number, penilaian: Array<{ soal_id: number; skor_diberikan: number }>) => {
    const response = await api.put(`/admin/submissions/${historyId}/grade`, { penilaian_manual: penilaian });
    return response.data;
  },

  // Students
  getStudents: async (): Promise<Student[]> => {
    try {
      const response = await api.get<any>('/admin/students');
      const data = response.data?.data || response.data;
      console.log('Admin Students:', data);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching students:', err);
      return [];
    }
  },

  getStudentDetail: async (id: number): Promise<Student | null> => {
    try {
      const response = await api.get<any>(`/admin/students/${id}`);
      const data = response.data?.data || response.data;
      console.log('Student Detail:', data);
      return data;
    } catch (err) {
      console.error('Error fetching student detail:', err);
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
      console.log('Admin Sessions:', data);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching sessions (500):', err);
      return [];
    }
  },

  createSession: async (session: Omit<Session, 'id'>) => {
    const response = await api.post('/admin/sessions', session);
    return response.data;
  },
};
