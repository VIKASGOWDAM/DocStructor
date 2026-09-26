import { MainFolder, VolumeFolder, Subfolder, Document, User } from '../types';

const STORAGE_KEYS = {
  USER: 'docstructor_user',
  MAIN_FOLDERS: 'docstructor_main_folders',
  DOCUMENTS: 'docstructor_documents'
};

// User Authentication
export const saveUser = (user: User): void => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const getUser = (): User | null => {
  const userData = localStorage.getItem(STORAGE_KEYS.USER);
  return userData ? JSON.parse(userData) : null;
};

export const clearUser = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER);
};

// Main Folders
export const saveMainFolders = (folders: MainFolder[]): void => {
  localStorage.setItem(STORAGE_KEYS.MAIN_FOLDERS, JSON.stringify(folders));
};

export const getMainFolders = (): MainFolder[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MAIN_FOLDERS);
  return data ? JSON.parse(data) : [];
};

// Sample data initialization
export const initializeSampleData = (): void => {
  const existingFolders = getMainFolders();
  if (existingFolders.length === 0) {
    const sampleData: MainFolder[] = [
      {
        id: '1',
        name: 'Project Alpha',
        prefix: 'SMkll',
        createdAt: new Date().toISOString(),
        volumes: [
          {
            id: '1-1',
            name: 'Volume 1',
            mainFolderId: '1',
            createdAt: new Date().toISOString(),
            subfolders: [
              {
                id: '1-1-1',
                name: 'DR',
                volumeId: '1-1',
                createdAt: new Date().toISOString(),
                documents: []
              },
              {
                id: '1-1-2',
                name: 'TR',
                volumeId: '1-1',
                createdAt: new Date().toISOString(),
                documents: []
              }
            ]
          }
        ]
      }
    ];
    saveMainFolders(sampleData);
  }
};