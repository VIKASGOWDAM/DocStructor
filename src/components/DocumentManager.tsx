import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Clock, Eye, Edit3, Trash2, Upload, Plus, Settings } from 'lucide-react';
import { Subfolder, Document, MainFolder } from '../types';
import { formatDate, getStatusColor, getTypeColor, getCurrentMonth, getCurrentYear, downloadDocument, openDocument, storeDocumentFile } from '../utils/documentUtils';

interface DocumentManagerProps {
  subfolder: Subfolder;
  mainFolder: MainFolder;
  onBack: () => void;
  onDocumentUpdate: (updatedSubfolder: Subfolder) => void;
  breadcrumb: React.ReactNode;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ 
  subfolder, 
  mainFolder,
  onBack, 
  onDocumentUpdate, 
  breadcrumb 
}) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState<'M' | 'C' | ''>('');
  const [issueNumber, setIssueNumber] = useState('1');
  const [revisionNumber, setRevisionNumber] = useState('nil');
  const [versioningDocument, setVersioningDocument] = useState<Document | null>(null);
  const [customPrefix, setCustomPrefix] = useState('');
  const [fillGaps, setFillGaps] = useState(true);
  const [showNamingOptions, setShowNamingOptions] = useState(false);
  const [selectedGap, setSelectedGap] = useState<number | null>(null);
  const [manualNumbering, setManualNumbering] = useState(false);

  // Smart auto-generation with gap control
  const generateDocumentName = (shouldFillGaps: boolean = fillGaps, specificGap?: number): string => {
    const basePrefix = customPrefix || mainFolder.prefix || '';
    const subfolderName = subfolder.name; // DR, TR, etc.
    
    // Get existing numbers for this combination
    const namePattern = basePrefix ? `${basePrefix}-${subfolderName}` : subfolderName;
    const existingNumbers = subfolder.documents
      .map(doc => {
        const regex = basePrefix 
          ? new RegExp(`^${basePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${subfolderName}-(\\d{3})$`)
          : new RegExp(`^${subfolderName}-(\\d{3})$`);
        const match = doc.name.match(regex);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0)
      .sort((a, b) => a - b); // Sort in ascending order
    
    let nextNumber = 1;
    
    if (specificGap) {
      // Use the specifically selected gap
      nextNumber = specificGap;
    } else if (shouldFillGaps && existingNumbers.length > 0) {
      // Find the first gap
      for (const num of existingNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else if (num > nextNumber) {
          // Found a gap, use the current nextNumber
          break;
        }
      }
    } else {
      // Use next sequential number (highest + 1)
      nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    }
    
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    
    return basePrefix ? `${basePrefix}-${subfolderName}-${formattedNumber}` : `${subfolderName}-${formattedNumber}`;
  };

  // Get available gaps for display
  const getAvailableGaps = (): number[] => {
    const basePrefix = customPrefix || mainFolder.prefix || '';
    const subfolderName = subfolder.name;
    
    const namePattern = basePrefix ? `${basePrefix}-${subfolderName}` : subfolderName;
    const existingNumbers = subfolder.documents
      .map(doc => {
        const regex = basePrefix 
          ? new RegExp(`^${basePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${subfolderName}-(\\d{3})$`)
          : new RegExp(`^${subfolderName}-(\\d{3})$`);
        const match = doc.name.match(regex);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0)
      .sort((a, b) => a - b);
    
    const gaps: number[] = [];
    if (existingNumbers.length > 0) {
      for (let i = 1; i < Math.max(...existingNumbers); i++) {
        if (!existingNumbers.includes(i)) {
          gaps.push(i);
        }
      }
    }
    
    return gaps;
  };

  // Check if document name already exists
  const isDocumentNameTaken = (name: string, excludeId?: string): boolean => {
    return subfolder.documents.some(doc => doc.name === name && doc.id !== excludeId);
  };

  useEffect(() => {
    if (showUploadDialog && !versioningDocument) {
      setCustomPrefix(mainFolder.prefix || '');
      setDocumentName(generateDocumentName());
      setSelectedGap(null);
      setManualNumbering(false);
    }
  }, [showUploadDialog, subfolder.documents, mainFolder.prefix, customPrefix, fillGaps]);

  // Update document name when custom prefix, gap filling preference, or selected gap changes
  useEffect(() => {
    if (showUploadDialog && !versioningDocument) {
      if (manualNumbering && selectedGap) {
        setDocumentName(generateDocumentName(true, selectedGap));
      } else {
        setDocumentName(generateDocumentName());
      }
    }
  }, [customPrefix, fillGaps, selectedGap, manualNumbering]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setShowUploadDialog(true);
    }
    event.target.value = '';
  };

  const handleUploadDocument = async () => {
    if (!uploadFile || !documentName.trim() || !documentTitle.trim()) return;

    // Check for duplicate names (only for new documents, not versions)
    if (!versioningDocument && isDocumentNameTaken(documentName.trim())) {
      alert('A document with this name already exists. Please choose a different name.');
      return;
    }

    const newDocument: Document = {
      id: Date.now().toString(),
      name: documentName.trim(),
      title: documentTitle.trim(),
      type: documentType,
      subfolderId: subfolder.id,
      status: 'Draft',
      month: getCurrentMonth(),
      year: getCurrentYear(),
      issue: parseInt(issueNumber),
      revision: revisionNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      size: uploadFile.size,
      fileType: uploadFile.name.endsWith('.pdf') ? 'pdf' : uploadFile.name.endsWith('.docx') ? 'docx' : 'txt'
    };

    try {
      // Store the actual file data
      await storeDocumentFile(newDocument.id, uploadFile);
      
      const updatedSubfolder = {
        ...subfolder,
        documents: [...subfolder.documents, newDocument]
      };

      onDocumentUpdate(updatedSubfolder);
      resetUploadDialog();
    } catch (error) {
      console.error('Error storing document file:', error);
      alert('Error uploading document. Please try again.');
    }
  };

  const resetUploadDialog = () => {
    setShowUploadDialog(false);
    setShowVersionDialog(false);
    setUploadFile(null);
    setDocumentName('');
    setDocumentTitle('');
    setDocumentType('');
    setIssueNumber('1');
    setRevisionNumber('nil');
    setVersioningDocument(null);
    setCustomPrefix('');
    setShowNamingOptions(false);
    setSelectedGap(null);
    setManualNumbering(false);
  };

  const handleCreateVersion = (document: Document) => {
    setVersioningDocument(document);
    setDocumentName(document.name);
    setDocumentTitle(document.title);
    setDocumentType(document.type);
    setIssueNumber((document.issue + 1).toString());
    setRevisionNumber('nil');
    setShowVersionDialog(true);
  };

  const handleVersionFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
    event.target.value = '';
  };

  const handleUploadVersion = async () => {
    if (!uploadFile || !versioningDocument) return;

    // Ensure at least one field has changed
    const hasChanges = 
      parseInt(issueNumber) !== versioningDocument.issue ||
      revisionNumber !== versioningDocument.revision ||
      documentType !== versioningDocument.type ||
      documentTitle !== versioningDocument.title;

    if (!hasChanges) {
      alert('Please make at least one change (issue number, revision, type, or title) to create a new version.');
      return;
    }

    const newVersion: Document = {
      id: Date.now().toString(),
      name: versioningDocument.name, // Keep the same name for version control
      title: documentTitle.trim(),
      type: documentType,
      subfolderId: subfolder.id,
      status: 'Draft',
      month: getCurrentMonth(),
      year: getCurrentYear(),
      issue: parseInt(issueNumber),
      revision: revisionNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      size: uploadFile.size,
      fileType: uploadFile.name.endsWith('.pdf') ? 'pdf' : uploadFile.name.endsWith('.docx') ? 'docx' : 'txt'
    };

    try {
      // Store the actual file data
      await storeDocumentFile(newVersion.id, uploadFile);
      
      const updatedSubfolder = {
        ...subfolder,
        documents: [...subfolder.documents, newVersion]
      };

      onDocumentUpdate(updatedSubfolder);
      resetUploadDialog();
    } catch (error) {
      console.error('Error storing document file:', error);
      alert('Error uploading document version. Please try again.');
    }
  };

  const handleUpdateDocument = (document: Document, updates: Partial<Document>) => {
    const updatedDocument = { ...document, ...updates, updatedAt: new Date().toISOString() };
    const updatedSubfolder = {
      ...subfolder,
      documents: subfolder.documents.map(d => d.id === document.id ? updatedDocument : d)
    };
    onDocumentUpdate(updatedSubfolder);
  };

  const handleDeleteDocument = (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      // Remove stored file data
      localStorage.removeItem(`doc_file_${documentId}`);
      
      const updatedSubfolder = {
        ...subfolder,
        documents: subfolder.documents.filter(d => d.id !== documentId)
      };
      onDocumentUpdate(updatedSubfolder);
    }
  };

  // Group documents by name for version display
  const groupedDocuments = subfolder.documents.reduce((groups, doc) => {
    if (!groups[doc.name]) {
      groups[doc.name] = [];
    }
    groups[doc.name].push(doc);
    return groups;
  }, {} as Record<string, Document[]>);

  // Sort versions within each group by issue and revision
  Object.keys(groupedDocuments).forEach(name => {
    groupedDocuments[name].sort((a, b) => {
      if (a.issue !== b.issue) return b.issue - a.issue;
      if (a.revision === 'nil' && b.revision !== 'nil') return 1;
      if (a.revision !== 'nil' && b.revision === 'nil') return -1;
      if (a.revision === 'nil' && b.revision === 'nil') return 0;
      return parseInt(b.revision) - parseInt(a.revision);
    });
  });

  const availableGaps = getAvailableGaps();

  return (
    <div>
      {breadcrumb}
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Documents</h2>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-slate-600">Manage documents in {subfolder.name}</p>
            {mainFolder.prefix && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Default Prefix: {mainFolder.prefix}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg transition-colors"
          >
            Back
          </button>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer">
            <Upload className="w-5 h-5" />
            <span>Upload New Document</span>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".docx,.pdf,.txt"
            />
          </label>
        </div>
      </div>

      {/* Document Groups */}
      <div className="space-y-8">
        {Object.entries(groupedDocuments).map(([documentName, versions]) => (
          <div key={documentName} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">{documentName}</h3>
              <button
                onClick={() => handleCreateVersion(versions[0])}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Version</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {versions.map((document, index) => (
                <div key={document.id} className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-slate-900">
                            Version {index + 1}
                          </span>
                          {index === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate" title={document.title}>
                          {document.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          Issue {document.issue} • Rev {document.revision}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedDocument(document);
                          setShowMetadataDialog(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingDocument(document)}
                        className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(document.status)}`}>
                          {document.status}
                        </span>
                        {document.type && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(document.type)}`}>
                            {document.type === 'M' ? 'Military' : 'Civil'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{document.month} {document.year}</span>
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Updated {formatDate(document.updatedAt)}</span>
                    </div>

                    <div className="flex space-x-1 pt-2">
                      <button
                        onClick={() => openDocument(document)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center space-x-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Open</span>
                      </button>
                      <button
                        onClick={() => downloadDocument(document)}
                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center space-x-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedDocuments).length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No documents yet</h3>
          <p className="text-slate-500 mb-6">Upload your first document to get started</p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto transition-colors cursor-pointer w-fit">
            <Upload className="w-5 h-5" />
            <span>Upload Document</span>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".docx,.pdf,.txt"
            />
          </label>
        </div>
      )}

      {/* Upload New Document Dialog */}
      {showUploadDialog && uploadFile && !versioningDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Upload New Document</h3>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder={mainFolder.prefix ? `Default: ${mainFolder.prefix}` : "Enter custom prefix"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Leave empty to use folder default ({mainFolder.prefix || 'none'}) or enter custom prefix
                  </p>
                </div>

                {/* Naming Strategy Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-blue-900">Document Naming Strategy</h4>
                    <button
                      onClick={() => setShowNamingOptions(!showNamingOptions)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {showNamingOptions && (
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          id="fillGaps"
                          name="namingStrategy"
                          checked={fillGaps && !manualNumbering}
                          onChange={() => {
                            setFillGaps(true);
                            setManualNumbering(false);
                            setSelectedGap(null);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label htmlFor="fillGaps" className="text-sm font-medium text-blue-900 cursor-pointer">
                            Fill gaps automatically (Smart numbering)
                          </label>
                          <p className="text-xs text-blue-700 mt-1">
                            Automatically fills the first available gap. If DR-002 was deleted, next document will be DR-002.
                          </p>
                        </div>
                      </div>

                      {availableGaps.length > 0 && (
                        <div className="flex items-start space-x-3">
                          <input
                            type="radio"
                            id="manualGap"
                            name="namingStrategy"
                            checked={manualNumbering}
                            onChange={() => {
                              setManualNumbering(true);
                              setFillGaps(true);
                              setSelectedGap(availableGaps[0]);
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label htmlFor="manualGap" className="text-sm font-medium text-blue-900 cursor-pointer">
                              Choose specific gap to fill
                            </label>
                            <p className="text-xs text-blue-700 mt-1">
                              Manually select which gap you want to fill from the available options.
                            </p>
                            {manualNumbering && (
                              <div className="mt-3">
                                <label className="block text-xs font-medium text-blue-800 mb-2">
                                  Select gap to fill:
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {availableGaps.map(gap => (
                                    <button
                                      key={gap}
                                      type="button"
                                      onClick={() => setSelectedGap(gap)}
                                      className={`px-3 py-2 text-xs rounded border transition-colors ${
                                        selectedGap === gap
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white text-blue-800 border-blue-300 hover:bg-blue-50'
                                      }`}
                                    >
                                      {(customPrefix || mainFolder.prefix || '') ? 
                                        `${customPrefix || mainFolder.prefix}-${subfolder.name}-${gap.toString().padStart(3, '0')}` :
                                        `${subfolder.name}-${gap.toString().padStart(3, '0')}`
                                      }
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          id="sequential"
                          name="namingStrategy"
                          checked={!fillGaps}
                          onChange={() => {
                            setFillGaps(false);
                            setManualNumbering(false);
                            setSelectedGap(null);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label htmlFor="sequential" className="text-sm font-medium text-blue-900 cursor-pointer">
                            Use next sequential number
                          </label>
                          <p className="text-xs text-blue-700 mt-1">
                            Always uses the next highest number. Gaps remain unfilled.
                          </p>
                        </div>
                      </div>

                      {availableGaps.length > 0 && !manualNumbering && fillGaps && (
                        <div className="mt-2">
                          <p className="text-xs text-blue-600 font-medium">Available gaps:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {availableGaps.slice(0, 8).map(gap => (
                              <span key={gap} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {(customPrefix || mainFolder.prefix || '') ? 
                                  `${customPrefix || mainFolder.prefix}-${subfolder.name}-${gap.toString().padStart(3, '0')}` :
                                  `${subfolder.name}-${gap.toString().padStart(3, '0')}`
                                }
                              </span>
                            ))}
                            {availableGaps.length > 8 && (
                              <span className="text-xs text-blue-600">+{availableGaps.length - 8} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Next document will be:</strong> {manualNumbering && selectedGap ? generateDocumentName(true, selectedGap) : generateDocumentName()}
                    </p>
                    {manualNumbering && selectedGap && (
                      <p className="text-xs text-green-700 mt-1">
                        ✓ Will fill gap #{selectedGap.toString().padStart(3, '0')}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Auto-generated name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-slate-500">
                      Auto-generated: {manualNumbering && selectedGap ? generateDocumentName(true, selectedGap) : generateDocumentName()}
                    </p>
                    {availableGaps.length > 0 && fillGaps && !manualNumbering && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Will fill gap: Next available number is {availableGaps[0].toString().padStart(3, '0')}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Title/Description *
                  </label>
                  <textarea
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Enter document title or description"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as 'M' | 'C' | '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select type (optional)</option>
                    <option value="M">M - Military</option>
                    <option value="C">C - Civil</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Issue Number
                    </label>
                    <input
                      type="number"
                      value={issueNumber}
                      onChange={(e) => setIssueNumber(e.target.value)}
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Revision
                    </label>
                    <input
                      type="text"
                      value={revisionNumber}
                      onChange={(e) => setRevisionNumber(e.target.value)}
                      placeholder="nil, 1, 2, etc."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Document Information</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Name: {documentName || 'Enter document name'}</li>
                    <li>• Title: {documentTitle || 'Enter document title'}</li>
                    <li>• Type: {documentType ? (documentType === 'M' ? 'Military' : 'Civil') : 'Not selected'}</li>
                    <li>• Original File: {uploadFile.name}</li>
                    <li>• Size: {(uploadFile.size / 1024).toFixed(1)} KB</li>
                    <li>• Issue: {issueNumber}</li>
                    <li>• Revision: {revisionNumber}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex space-x-3">
                <button
                  onClick={handleUploadDocument}
                  disabled={!documentName.trim() || !documentTitle.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Upload Document
                </button>
                <button
                  onClick={resetUploadDialog}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Version Dialog */}
      {showVersionDialog && versioningDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Upload New Version of {versioningDocument.name}</h3>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="text-sm font-medium text-amber-900 mb-2">Current Version</h4>
                  <ul className="text-xs text-amber-800 space-y-1">
                    <li>• Issue: {versioningDocument.issue}</li>
                    <li>• Revision: {versioningDocument.revision}</li>
                    <li>• Type: {versioningDocument.type ? (versioningDocument.type === 'M' ? 'Military' : 'Civil') : 'Not specified'}</li>
                    <li>• Title: {versioningDocument.title}</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Upload New File *
                  </label>
                  <label className="w-full px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 transition-colors cursor-pointer flex items-center justify-center space-x-2">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-600">
                      {uploadFile ? uploadFile.name : 'Choose file to upload'}
                    </span>
                    <input
                      type="file"
                      onChange={handleVersionFileSelect}
                      className="hidden"
                      accept=".docx,.pdf,.txt"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Title/Description *
                  </label>
                  <textarea
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Enter document title or description"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as 'M' | 'C' | '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select type (optional)</option>
                    <option value="M">M - Military</option>
                    <option value="C">C - Civil</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Issue Number *
                    </label>
                    <input
                      type="number"
                      value={issueNumber}
                      onChange={(e) => setIssueNumber(e.target.value)}
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Revision *
                    </label>
                    <input
                      type="text"
                      value={revisionNumber}
                      onChange={(e) => setRevisionNumber(e.target.value)}
                      placeholder="nil, 1, 2, etc."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="text-sm font-medium text-green-900 mb-2">New Version Information</h4>
                  <ul className="text-xs text-green-800 space-y-1">
                    <li>• Document: {versioningDocument.name}</li>
                    <li>• Title: {documentTitle || 'Enter document title'}</li>
                    <li>• Type: {documentType ? (documentType === 'M' ? 'Military' : 'Civil') : 'Not selected'}</li>
                    <li>• File: {uploadFile?.name || 'Select file'}</li>
                    <li>• Issue: {issueNumber}</li>
                    <li>• Revision: {revisionNumber}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex space-x-3">
                <button
                  onClick={handleUploadVersion}
                  disabled={!uploadFile || !documentTitle.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Upload New Version
                </button>
                <button
                  onClick={resetUploadDialog}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Details Dialog */}
      {showMetadataDialog && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Document Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <p className="text-slate-900 font-mono text-sm bg-slate-50 p-2 rounded">{selectedDocument.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title/Description</label>
                <p className="text-slate-900 text-sm bg-slate-50 p-2 rounded">{selectedDocument.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedDocument.status)}`}>
                    {selectedDocument.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  {selectedDocument.type ? (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(selectedDocument.type)}`}>
                      {selectedDocument.type === 'M' ? 'Military' : 'Civil'}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">Not specified</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <p className="text-slate-900">{selectedDocument.month} {selectedDocument.year}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Issue & Revision</label>
                  <p className="text-slate-900">Issue {selectedDocument.issue} • Rev {selectedDocument.revision}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Created</label>
                <p className="text-slate-900">{formatDate(selectedDocument.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Updated</label>
                <p className="text-slate-900">{formatDate(selectedDocument.updatedAt)}</p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => openDocument(selectedDocument)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Open</span>
              </button>
              <button
                onClick={() => downloadDocument(selectedDocument)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={() => {
                  setShowMetadataDialog(false);
                  setSelectedDocument(null);
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Document Dialog */}
      {editingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Edit Document</h3>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Document Name</label>
                  <input
                    type="text"
                    value={editingDocument.name}
                    onChange={(e) => setEditingDocument({
                      ...editingDocument,
                      name: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Document Title/Description</label>
                  <textarea
                    value={editingDocument.title}
                    onChange={(e) => setEditingDocument({
                      ...editingDocument,
                      title: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Document Type</label>
                  <select
                    value={editingDocument.type}
                    onChange={(e) => setEditingDocument({
                      ...editingDocument,
                      type: e.target.value as 'M' | 'C' | ''
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select type (optional)</option>
                    <option value="M">M - Military</option>
                    <option value="C">C - Civil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={editingDocument.status}
                    onChange={(e) => setEditingDocument({
                      ...editingDocument,
                      status: e.target.value as Document['status']
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Final">Final</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
                    <select
                      value={editingDocument.month}
                      onChange={(e) => setEditingDocument({
                        ...editingDocument,
                        month: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={editingDocument.year}
                      onChange={(e) => setEditingDocument({
                        ...editingDocument,
                        year: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="2020"
                      max="2030"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Issue Number</label>
                    <input
                      type="number"
                      value={editingDocument.issue}
                      onChange={(e) => setEditingDocument({
                        ...editingDocument,
                        issue: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Revision</label>
                    <input
                      type="text"
                      value={editingDocument.revision}
                      onChange={(e) => setEditingDocument({
                        ...editingDocument,
                        revision: e.target.value
                      })}
                      placeholder="nil, 1, 2, etc."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    handleUpdateDocument(editingDocument, {
                      name: editingDocument.name,
                      title: editingDocument.title,
                      type: editingDocument.type,
                      status: editingDocument.status,
                      month: editingDocument.month,
                      year: editingDocument.year,
                      issue: editingDocument.issue,
                      revision: editingDocument.revision
                    });
                    setEditingDocument(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingDocument(null)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;