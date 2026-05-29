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

export type { Bundle };

export const adminService = {
  getBundles: async (): Promise<Bundle[]> => {
    const response = await api.get<Bundle[]>('/admin/bundles');
    return response.data;
  },
// ... rest of the code

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

  getSubmissions: async (status?: string): Promise<Submission[]> => {
    const params = status ? { status } : {};
    const response = await api.get<Submission[]>('/admin/submissions', { params });
    return response.data;
  },

  getSubmissionDetail: async (historyId: number): Promise<SubmissionDetail> => {
    const response = await api.get<SubmissionDetail>(`/admin/submissions/${historyId}`);
    return response.data;
  },

  gradeSubmission: async (historyId: number, penilaian: Array<{ soal_id: number; skor_diberikan: number }>) => {
    const response = await api.put(`/admin/submissions/${historyId}/grade`, { penilaian_manual: penilaian });
    return response.data;
  },
};
