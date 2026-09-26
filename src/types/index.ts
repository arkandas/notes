export interface Note {
  id: number;
  title: string;
  content: string;
  folder: string;
  position: number;
  deleted_at?: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateNote {
  title?: string;
  content?: string;
  folder?: string;
}

export interface UpdateNote {
  title?: string;
  content?: string;
  folder?: string;
}

export interface NoteFolder {
  id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
  user_id: number;
  created_at: string;
}
