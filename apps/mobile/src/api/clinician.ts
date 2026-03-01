import { apiPost } from './http';

type ShareResponse = {
  url: string;
  expiresAt: string;
};

export async function createShareLink() {
  return apiPost<ShareResponse>('/api/clinician/share');
}
