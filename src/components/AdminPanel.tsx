import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, FolderOpen, Calendar, Download, Filter, Search } from 'lucide-react';
import { MainFolder, Document } from '../types';
import { getMainFolders, saveMainFolders } from '../utils/storage';
import { formatDate, getStatusColor, getTypeColor, formatFileSize, generateDocumentFileName } from '../utils/documentUtils';
import FolderManager from './FolderManager';

const AdminPanel: React.FC = () => {
  const [folders, setFolders] = useState<MainFolder[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'folders'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [volumeFilter, setVolumeFilter] = useState<string>('all');
  const [subfolderFilter, setSubfolderFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('date');

  useEffect(() => {
    setFolders(getMainFolders());
  }, []);

  const getAllDocuments = (): (Document & { folderPath: string; folderId: string; volumeId: string; subfolderId: string })[] => {
    const allDocs: (Document & { folderPath: string; folderId: string; volumeId: string; subfolderId: string })[] = [];
    
    folders.forEach(folder => {
      folder.volumes.forEach(volume => {
        volume.subfolders.forEach(subfolder => {
          subfolder.documents.forEach(doc => {
            allDocs.push({
              ...doc,
              folderPath: `${folder.name} > ${volume.name} > ${subfolder.name}`,
              folderId: folder.id,
              volumeId: volume.id,
              subfolderId: subfolder.id
            });
          });
        });
      });
    });

    return allDocs;
  };

  const getFilteredDocuments = () => {
    let docs = getAllDocuments();

    // Search filter
    if (searchTerm) {
      docs = docs.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.folderPath.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      docs = docs.filter(doc => doc.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      docs = docs.filter(doc => doc.type === typeFilter);
    }

    // Folder filter
    if (folderFilter !== 'all') {
      docs = docs.filter(doc => doc.folderId === folderFilter);
    }

    // Volume filter
    if (volumeFilter !== 'all') {
      docs = docs.filter(doc => doc.volumeId === volumeFilter);
    }

    // Subfolder filter
    if (subfolderFilter !== 'all') {
      docs = docs.filter(doc => doc.subfolderId === subfolderFilter);
    }

    // Sort
    docs.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'date':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return docs;
  };

  const getAvailableVolumes = () => {
    if (folderFilter === 'all') return [];
    const folder = folders.find(f => f.id === folderFilter);
    return folder ? folder.volumes : [];
  };

  const getAvailableSubfolders = () => {
    if (volumeFilter === 'all') return [];
    const folder = folders.find(f => f.id === folderFilter);
    if (!folder) return [];
    const volume = folder.volumes.find(v => v.id === volumeFilter);
    return volume ? volume.subfolders : [];
  };

  const getStats = () => {
    const allDocs = getAllDocuments();
    return {
      totalFolders: folders.length,
      totalVolumes: folders.reduce((total, f) => total + f.volumes.length, 0),
      totalSubfolders: folders.reduce((total, f) => 
        total + f.volumes.reduce((vTotal, v) => vTotal + v.subfolders.length, 0), 0
      ),
      totalDocuments: allDocs.length,
      draftDocuments: allDocs.filter(d => d.status === 'Draft').length,
      finalDocuments: allDocs.filter(d => d.status === 'Final').length,
      militaryDocuments: allDocs.filter(d => d.type === 'M').length,
      civilDocuments: allDocs.filter(d => d.type === 'C').length,
      recentDocuments: allDocs
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
    };
  };

  const exportFilteredData = () => {
    const filteredDocs = getFilteredDocuments();
    const csvData = [
      ['Document Name', 'Document Title/Description', 'Folder Path', 'Type', 'Status', 'Month', 'Year', 'Issue', 'Revision', 'Created', 'Updated', 'Generated Filename'],
      ...filteredDocs.map(doc => [
        doc.name,
        doc.title,
        doc.folderPath,
        doc.type === 'M' ? 'Military' : doc.type === 'C' ? 'Civil' : 'Not Specified',
        doc.status,
        doc.month,
        doc.year,
        doc.issue.toString(),
        doc.revision,
        formatDate(doc.createdAt),
        formatDate(doc.updatedAt),
        generateDocumentFileName(doc)
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const element = document.createElement('a');
    const file = new Blob([csvContent], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = `docstructor-filtered-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const stats = getStats();
  const filteredDocuments = getFilteredDocuments();

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'documents', name: 'All Documents', icon: FileText },
    { id: 'folders', name: 'Folder Management', icon: FolderOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Admin Panel</h2>
          <p className="text-slate-600 mt-1">Comprehensive system overview and management</p>
        </div>
        <button
          onClick={exportFilteredData}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export Filtered Data</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Documents</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalDocuments}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Main Folders</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalFolders}</p>
                </div>
                <FolderOpen className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Volumes</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalVolumes}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">V</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Subfolders</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalSubfolders}</p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">S</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Document Status Distribution</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.draftDocuments}</div>
                  <div className="text-sm text-slate-600">Draft</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.finalDocuments}</div>
                  <div className="text-sm text-slate-600">Final</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Document Type Distribution</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.militaryDocuments}</div>
                  <div className="text-sm text-slate-600">Military</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.civilDocuments}</div>
                  <div className="text-sm text-slate-600">Civil</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Documents */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Documents</h3>
            <div className="space-y-3">
              {stats.recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{doc.name}</p>
                    <p className="text-sm text-slate-500">{doc.title}</p>
                    <p className="text-xs text-slate-400">{doc.folderPath}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                    {doc.type && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(doc.type)}`}>
                        {doc.type === 'M' ? 'Military' : 'Civil'}
                      </span>
                    )}
                    <span className="text-sm text-slate-500">{formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
              ))}
              {stats.recentDocuments.length === 0 && (
                <p className="text-slate-500 text-center py-4">No documents found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={folderFilter}
                onChange={(e) => {
                  setFolderFilter(e.target.value);
                  setVolumeFilter('all');
                  setSubfolderFilter('all');
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Folders</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>

              <select
                value={volumeFilter}
                onChange={(e) => {
                  setVolumeFilter(e.target.value);
                  setSubfolderFilter('all');
                }}
                disabled={folderFilter === 'all'}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
              >
                <option value="all">All Volumes</option>
                {getAvailableVolumes().map(volume => (
                  <option key={volume.id} value={volume.id}>{volume.name}</option>
                ))}
              </select>

              <select
                value={subfolderFilter}
                onChange={(e) => setSubfolderFilter(e.target.value)}
                disabled={volumeFilter === 'all'}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
              >
                <option value="all">All Subfolders</option>
                {getAvailableSubfolders().map(subfolder => (
                  <option key={subfolder.id} value={subfolder.id}>{subfolder.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Final">Final</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="M">Military</option>
                <option value="C">Civil</option>
              </select>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-slate-600">
                Showing {filteredDocuments.length} of {getAllDocuments().length} documents
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Title/Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Issue & Rev
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-blue-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">{doc.name}</div>
                            <div className="text-xs text-slate-500">{generateDocumentFileName(doc)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 max-w-xs truncate" title={doc.title}>
                          {doc.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{doc.folderPath}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {doc.type ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(doc.type)}`}>
                            {doc.type === 'M' ? 'Military' : 'Civil'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Not specified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div>{doc.month} {doc.year}</div>
                        <div className="text-xs">{formatDate(doc.updatedAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        Issue {doc.issue} • Rev {doc.revision}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No documents found</h3>
                <p className="text-slate-500">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Folders Tab */}
      {activeTab === 'folders' && (
        <FolderManager 
          folders={folders} 
          onFolderUpdate={(updatedFolders) => {
            setFolders(updatedFolders);
            // Save to storage using the imported function
            saveMainFolders(updatedFolders);
          }} 
        />
      )}
    </div>
  );
};

export default AdminPanel;