import React, { useState } from 'react';
import { FolderPlus, Edit, Trash2, Calendar } from 'lucide-react';
import { MainFolder, VolumeFolder, Subfolder } from '../types';
import { formatDate } from '../utils/documentUtils';

interface FolderManagerProps {
  folders: MainFolder[];
  onFolderUpdate: (folders: MainFolder[]) => void;
}

const FolderManager: React.FC<FolderManagerProps> = ({ folders, onFolderUpdate }) => {
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPrefix, setEditingPrefix] = useState('');

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Are you sure you want to delete this folder and all its contents?')) {
      const updatedFolders = folders.filter(f => f.id !== folderId);
      onFolderUpdate(updatedFolders);
    }
  };

  const handleStartEdit = (folder: MainFolder) => {
    setEditingFolder(folder.id);
    setEditingName(folder.name);
    setEditingPrefix(folder.prefix || '');
  };

  const handleSaveEdit = (folderId: string) => {
    const updatedFolders = folders.map(f => 
      f.id === folderId 
        ? { 
            ...f, 
            name: editingName.trim(),
            prefix: editingPrefix.trim() || undefined
          } 
        : f
    );
    onFolderUpdate(updatedFolders);
    setEditingFolder(null);
    setEditingName('');
    setEditingPrefix('');
  };

  const handleCancelEdit = () => {
    setEditingFolder(null);
    setEditingName('');
    setEditingPrefix('');
  };

  const getTotalDocuments = (folder: MainFolder): number => {
    return folder.volumes.reduce((total, volume) => 
      total + volume.subfolders.reduce((subTotal, subfolder) => 
        subTotal + subfolder.documents.length, 0
      ), 0
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-slate-900">Folder Management</h3>
      </div>

      <div className="grid gap-4">
        {folders.map((folder) => (
          <div key={folder.id} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingFolder === folder.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Folder Name
                      </label>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Document Prefix (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingPrefix}
                        onChange={(e) => setEditingPrefix(e.target.value)}
                        placeholder="e.g., SMkll, PROJ, etc."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        This prefix will be added to document names (e.g., SMkll-DR-001)
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveEdit(folder.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-slate-900">{folder.name}</h4>
                      {folder.prefix && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Prefix: {folder.prefix}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created {formatDate(folder.createdAt)}</span>
                      </span>
                      <span>{folder.volumes.length} volumes</span>
                      <span>{getTotalDocuments(folder)} documents</span>
                    </div>
                  </div>
                )}
              </div>

              {editingFolder !== folder.id && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStartEdit(folder)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit folder"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {folder.volumes.length > 0 && editingFolder !== folder.id && (
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-medium text-slate-700">Volumes:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {folder.volumes.map((volume) => (
                    <div key={volume.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="text-sm font-medium text-slate-900">{volume.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {volume.subfolders.length} subfolders
                      </div>
                      {volume.subfolders.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {volume.subfolders.map((subfolder) => (
                            <span
                              key={subfolder.id}
                              className="px-2 py-1 bg-white text-xs text-slate-600 rounded border border-slate-200"
                            >
                              {subfolder.name} ({subfolder.documents.length})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {folders.length === 0 && (
        <div className="text-center py-12">
          <FolderPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No folders created yet</h3>
          <p className="text-slate-500">Create your first main folder to get started</p>
        </div>
      )}
    </div>
  );
};

export default FolderManager;