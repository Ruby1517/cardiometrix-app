import { apiGet, apiPost } from './http';

export type CareNote = {
  id: string;
  body: string;
  createdAt: string;
};

export type CareTask = {
  id: string;
  title: string;
  detail?: string;
  status: 'open' | 'done';
  dueDate?: string;
  createdAt: string;
};

export type CareMessage = {
  id: string;
  body: string;
  authorRole: string;
  createdAt: string;
};

type NotesResponse = { notes: CareNote[] };
type TasksResponse = { tasks: CareTask[] };
type MessagesResponse = { messages: CareMessage[] };

export async function fetchCareNotes(patientId: string) {
  const res = await apiGet<NotesResponse>(`/api/clinician/notes?patientId=${patientId}`);
  return res.notes ?? [];
}

export async function fetchCareTasks(patientId: string) {
  const res = await apiGet<TasksResponse>(`/api/clinician/tasks?patientId=${patientId}`);
  return res.tasks ?? [];
}

export async function fetchCareMessages(patientId: string) {
  const res = await apiGet<MessagesResponse>(`/api/clinician/messages?patientId=${patientId}`);
  return res.messages ?? [];
}

export async function sendCareMessage(patientId: string, body: string) {
  const res = await apiPost<{ message: CareMessage }>(`/api/clinician/messages`, { patientId, body });
  return res.message;
}
