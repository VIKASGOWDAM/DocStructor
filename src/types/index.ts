export interface User {
  username: string;
  role: 'admin' | 'user';
}

export interface MainFolder {
  id: string;
  name: string;
  prefix?: string; // Optional prefix for document naming
  createdAt: string;
  volumes: VolumeFolder[];
}

export interface VolumeFolder {
  id: string;
  name: string;
  mainFolderId: string;
  createdAt: string;
  subfolders: Subfolder[];
}

export interface Subfolder {
  id: string;
  name: string;
  volumeId: string;
  createdAt: string;
  documents: Document[];
}

export interface Document {
  id: string;
  name: string;
  subfolderId: string;
  status: 'Draft' | 'Final';
  type: 'M' | 'C' | '';
  title: string;
  month: string;
  year: string;
  issue: number;
  revision: string;
  createdAt: string;
  updatedAt: string;
  size?: number;
  fileType: 'docx' | 'pdf' | 'txt';
}

export interface DocumentMetadata {
  documentId: string;
  status: 'Draft' | 'Final';
  type: 'M' | 'C' | '';
  title: string;
  month: string;
  year: string;
  tags?: string[];
  notes?: string;
}