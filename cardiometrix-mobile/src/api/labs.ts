import { apiGet, apiPost } from './http';
import { mapLabEntry } from './mappers';
import { LabEntry } from './types';

type LabsResponse = {
  entries: LabEntry[];
};

export async function fetchLabs(limit = 50): Promise<LabEntry[]> {
  const res = await apiGet<LabsResponse>(`/api/measurements?types=a1c,lipid&limit=${limit}`);
  return (res.entries ?? []).map(mapLabEntry);
}

export async function createA1c(input: { percent: number; measuredAt?: string }) {
  return apiPost<{ ok: boolean; id: string }>('/api/measurements', {
    type: 'a1c',
    measuredAt: input.measuredAt,
    payload: { percent: input.percent },
  });
}

export async function createLipid(input: {
  total: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  measuredAt?: string;
}) {
  return apiPost<{ ok: boolean; id: string }>('/api/measurements', {
    type: 'lipid',
    measuredAt: input.measuredAt,
    payload: {
      total: input.total,
      ldl: input.ldl,
      hdl: input.hdl,
      triglycerides: input.triglycerides,
    },
  });
}
