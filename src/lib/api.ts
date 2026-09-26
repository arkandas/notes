import {
  Note,
  NoteFolder,
  CreateNote,
  UpdateNote,
} from '@/types';

export const noteApi = {
  getAll: async (): Promise<Note[]> => {
    const response = await fetch('/api/notes');
    if (!response.ok) throw new Error('Failed to fetch notes');
    return response.json();
  },

  create: async (note: CreateNote): Promise<Note> => {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!response.ok) throw new Error('Failed to create note');
    return response.json();
  },

  update: async (id: number, note: UpdateNote): Promise<Note> => {
    const response = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!response.ok) throw new Error('Failed to update note');
    return response.json();
  },

  delete: async (id: number, permanent = false): Promise<void> => {
    const response = await fetch(`/api/notes/${id}${permanent ? '?permanent=1' : ''}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete note');
  },

  reorder: async (updates: { id: number; position: number }[]): Promise<void> => {
    const response = await fetch('/api/notes/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    if (!response.ok) throw new Error('Failed to reorder notes');
  },
};

export const noteTrashApi = {
  list: async (): Promise<Note[]> => {
    const response = await fetch('/api/notes/trash');
    if (!response.ok) throw new Error('Failed to fetch trash');
    return response.json();
  },

  restore: async (id: number): Promise<Note> => {
    const response = await fetch(`/api/notes/${id}/restore`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to restore note');
    return response.json();
  },

  empty: async (): Promise<{ deleted: number }> => {
    const response = await fetch('/api/notes/trash', { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to empty trash');
    return response.json();
  },
};

export const noteFolderApi = {
  getAll: async (): Promise<NoteFolder[]> => {
    const response = await fetch('/api/note-folders');
    if (!response.ok) throw new Error('Failed to fetch folders');
    return response.json();
  },

  create: async (name: string): Promise<NoteFolder> => {
    const response = await fetch('/api/note-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error('Failed to create folder');
    return response.json();
  },

  update: async (id: number, changes: { name?: string; color?: string | null; icon?: string | null }): Promise<NoteFolder> => {
    const response = await fetch(`/api/note-folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to update folder');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/note-folders/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete folder');
  },
};
