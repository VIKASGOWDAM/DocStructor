import React, { useState, useEffect } from 'react';
import { Plus, FolderPlus, ChevronRight, FileText, Calendar } from 'lucide-react';
import { MainFolder, VolumeFolder, Subfolder } from '../types';
import { getMainFolders, saveMainFolders } from '../utils/storage';
import { formatDate } from '../utils/documentUtils';
import DocumentManager from './DocumentManager';

const Dashboard: React.FC = () => {
  const [folders, setFolders] = useState<MainFolder[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<MainFolder | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<VolumeFolder | null>(null);
  const [selectedSubfolder, setSelectedSubfolder] = useState<Subfolder | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState<'main' | 'volume' | 'subfolder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newFolderPrefix, setNewFolderPrefix] = useState('');

  useEffect(() => {
    setFolders(getMainFolders());
  }, []);

  const updateFolders = (newFolders: MainFolder[]) => {
    setFolders(newFolders);
    saveMainFolders(newFolders);
  };

  const handleCreateMain = () => {
    if (!newItemName.trim()) return;
    
    const newFolder: MainFolder = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      prefix: newFolderPrefix.trim() || undefined,
      createdAt: new Date().toISOString(),
      volumes: []
    };
    
    updateFolders([...folders, newFolder]);
    setShowCreateDialog(null);
    setNewItemName('');
    setNewFolderPrefix('');
  };

  const handleCreateVolume = () => {
    if (!newItemName.trim() || !selectedFolder) return;
    
    const newVolume: VolumeFolder = {
      id: `${selectedFolder.id}-${Date.now()}`,
      name: newItemName.trim(),
      mainFolderId: selectedFolder.id,
      createdAt: new Date().toISOString(),
      subfolders: []
    };
    
    const updatedFolders = folders.map(f => 
      f.id === selectedFolder.id 
        ? { ...f, volumes: [...f.volumes, newVolume] }
        : f
    );
    
    updateFolders(updatedFolders);
    setShowCreateDialog(null);
    setNewItemName('');
  };

  const handleCreateSubfolder = () => {
    if (!newItemName.trim() || !selectedVolume || !selectedFolder) return;
    
    // Check for duplicate subfolder names within the same volume
    const existingNames = selectedVolume.subfolders.map(sf => sf.name.toLowerCase());
    if (existingNames.includes(newItemName.trim().toLowerCase())) {
      alert('A subfolder with this name already exists in this volume.');
      return;
    }
    
    const newSubfolder: Subfolder = {
      id: `${selectedVolume.id}-${Date.now()}`,
      name: newItemName.trim(),
      volumeId: selectedVolume.id,
      createdAt: new Date().toISOString(),
      documents: []
    };
    
    const updatedFolders = folders.map(f => 
      f.id === selectedFolder.id 
        ? {
            ...f,
            volumes: f.volumes.map(v => 
              v.id === selectedVolume.id
                ? { ...v, subfolders: [...v.subfolders, newSubfolder] }
                : v
            )
          }
        : f
    );
    
    updateFolders(updatedFolders);
    setShowCreateDialog(null);
    setNewItemName('');
  };

  const navigateToFolder = (folder: MainFolder) => {
    setSelectedFolder(folder);
    setSelectedVolume(null);
    setSelectedSubfolder(null);
    setCurrentPath([folder.name]);
  };

  const navigateToVolume = (volume: VolumeFolder) => {
    setSelectedVolume(volume);
    setSelectedSubfolder(null);
    setCurrentPath([selectedFolder!.name, volume.name]);
  };

  const navigateToSubfolder = (subfolder: Subfolder) => {
    setSelectedSubfolder(subfolder);
    setCurrentPath([selectedFolder!.name, selectedVolume!.name, subfolder.name]);
  };

  const navigateUp = () => {
    if (selectedSubfolder) {
      setSelectedSubfolder(null);
      setCurrentPath([selectedFolder!.name, selectedVolume!.name]);
    } else if (selectedVolume) {
      setSelectedVolume(null);
      setCurrentPath([selectedFolder!.name]);
    } else if (selectedFolder) {
      setSelectedFolder(null);
      setCurrentPath([]);
    }
  };

  const renderBreadcrumb = () => (
    <div className="flex items-center space-x-2 text-sm text-slate-600 mb-6">
      <button 
        onClick={() => {
          setSelectedFolder(null);
          setSelectedVolume(null);
          setSelectedSubfolder(null);
          setCurrentPath([]);
        }}
        className="hover:text-blue-600 font-medium"
      >
        Home
      </button>
      {currentPath.map((path, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4" />
          <button 
            onClick={() => {
              if (index === 0) {
                setSelectedVolume(null);
                setSelectedSubfolder(null);
                setCurrentPath([path]);
              } else if (index === 1) {
                setSelectedSubfolder(null);
                setCurrentPath([currentPath[0], path]);
              }
            }}
            className="hover:text-blue-600"
          >
            {path}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  // Main folder view
  if (!selectedFolder) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Main Folders</h2>
            <p className="text-slate-600 mt-1">Organize your documents into main project folders</p>
          </div>
          <button
            onClick={() => setShowCreateDialog('main')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FolderPlus className="w-5 h-5" />
            <span>New Main Folder</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => navigateToFolder(folder)}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <FolderPlus className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {folder.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-slate-500">{folder.volumes.length} volumes</p>
                    {folder.prefix && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Prefix: {folder.prefix}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Created {formatDate(folder.createdAt)}</span>
                <ChevronRight className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {showCreateDialog === 'main' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New Main Folder</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Folder Name *
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter folder name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    value={newFolderPrefix}
                    onChange={(e) => setNewFolderPrefix(e.target.value)}
                    placeholder="e.g., SMkll, PROJ, etc."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This prefix will be automatically added to document names (e.g., SMkll-DR-001)
                  </p>
                </div>

                {newFolderPrefix && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Preview:</strong> Documents will be named like: 
                      <span className="font-mono ml-1">{newFolderPrefix}-DR-001</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleCreateMain}
                  disabled={!newItemName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateDialog(null);
                    setNewItemName('');
                    setNewFolderPrefix('');
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Volume folder view
  if (selectedFolder && !selectedVolume) {
    return (
      <div>
        {renderBreadcrumb()}
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Volume Folders</h2>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-slate-600">Manage volumes within {selectedFolder.name}</p>
              {selectedFolder.prefix && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Document Prefix: {selectedFolder.prefix}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={navigateUp}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setShowCreateDialog('volume')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Volume</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedFolder.volumes.map((volume) => (
            <div
              key={volume.id}
              onClick={() => navigateToVolume(volume)}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <FolderPlus className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {volume.name}
                  </h3>
                  <p className="text-sm text-slate-500">{volume.subfolders.length} subfolders</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Created {formatDate(volume.createdAt)}</span>
                <ChevronRight className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {showCreateDialog === 'volume' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New Volume</h3>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter volume name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateVolume}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateDialog(null);
                    setNewItemName('');
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Subfolder view
  if (selectedVolume && !selectedSubfolder) {
    return (
      <div>
        {renderBreadcrumb()}
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Subfolders</h2>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-slate-600">Organize documents within {selectedVolume.name}</p>
              {selectedFolder?.prefix && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Document Prefix: {selectedFolder.prefix}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={navigateUp}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setShowCreateDialog('subfolder')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Subfolder</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedVolume.subfolders.map((subfolder) => (
            <div
              key={subfolder.id}
              onClick={() => navigateToSubfolder(subfolder)}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {subfolder.name}
                  </h3>
                  <p className="text-sm text-slate-500">{subfolder.documents.length} documents</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Created {formatDate(subfolder.createdAt)}</span>
                <ChevronRight className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {showCreateDialog === 'subfolder' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New Subfolder</h3>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter subfolder name (e.g., DR, TR)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateSubfolder}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateDialog(null);
                    setNewItemName('');
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Document view
  if (selectedSubfolder) {
    return (
      <DocumentManager
        subfolder={selectedSubfolder}
        mainFolder={selectedFolder}
        onBack={navigateUp}
        onDocumentUpdate={(updatedSubfolder) => {
          const updatedFolders = folders.map(f => 
            f.id === selectedFolder!.id 
              ? {
                  ...f,
                  volumes: f.volumes.map(v => 
                    v.id === selectedVolume!.id
                      ? {
                          ...v,
                          subfolders: v.subfolders.map(sf => 
                            sf.id === selectedSubfolder.id ? updatedSubfolder : sf
                          )
                        }
                      : v
                  )
                }
              : f
          );
          updateFolders(updatedFolders);
          setSelectedSubfolder(updatedSubfolder);
        }}
        breadcrumb={renderBreadcrumb()}
      />
    );
  }

  return null;
};

export default Dashboard;