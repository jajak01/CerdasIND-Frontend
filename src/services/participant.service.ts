import api from './api';

export interface Jenjang {
  id: number;
  nama: string;
}

export interface Mapel {
  id: number;
  jenjang_id: number;
  nama: string;
}

export interface Bundle {
  id: number;
  nama_bundle: string;
  waktu_menit: number;
  deskripsi?: string;
}

export interface Soal {
  id: number;
  tipe_soal: 'pilihan_ganda' | 'isian_singkat';
  teks_soal: string;
  image_url?: string;
  pilihan_jawaban?: Array<{ opsi: string; teks: string; image_url?: string }>;
  bobot_nilai: number;
}

export interface HistoryItem {
  history_id: number;
  nama_bundle: string;
  waktu_mulai: string;
  skor_akhir: number;
  status: 'berlangsung' | 'menunggu_koreksi' | 'selesai';
}

export interface ReviewItem {
  id: number;
  tipe_soal: 'pilihan_ganda' | 'isian_singkat';
  teks_soal: string;
  image_url?: string;
  pilihan_jawaban?: Array<{ opsi: string; teks: string; image_url?: string }>;
  pembahasan: string;
  jawaban_peserta: string;
  kunci_jawaban: string;
  is_benar: boolean;
}

export const participantService = {
  getJenjang: async (): Promise<Jenjang[]> => {
    const response = await api.get<Jenjang[]>('/jenjang');
    return response.data;
  },

  getMapel: async (jenjangId: number): Promise<Mapel[]> => {
    const response = await api.get<Mapel[]>(`/jenjang/${jenjangId}/mapel`);
    return response.data;
  },

  getBundles: async (mapelId: number): Promise<Bundle[]> => {
    const response = await api.get<Bundle[]>(`/mapel/${mapelId}/bundles`);
    return response.data;
  },

  getSoal: async (bundleId: number): Promise<Soal[]> => {
    const response = await api.get<Soal[]>(`/bundles/${bundleId}/soal`);
    return response.data;
  },

  submitJawaban: async (bundleId: number, jawaban: Array<{ soal_id: number; jawaban_peserta: string }>) => {
    const response = await api.post(`/bundles/${bundleId}/submit`, { jawaban });
    return response.data;
  },

  getHistory: async (): Promise<HistoryItem[]> => {
    const response = await api.get<HistoryItem[]>('/users/history');
    return response.data;
  },

  getReview: async (bundleId: number): Promise<ReviewItem[]> => {
    const response = await api.get<ReviewItem[]>(`/bundles/${bundleId}/review`);
    return response.data;
  },
};
