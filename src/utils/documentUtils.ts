import { Document } from '../types';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getStatusColor = (status: Document['status']): string => {
  switch (status) {
    case 'Draft':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Final':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getTypeColor = (type: Document['type']): string => {
  switch (type) {
    case 'M':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'C':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getCurrentMonth = (): string => {
  return new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
};

export const getCurrentYear = (): string => {
  return new Date().getFullYear().toString();
};

export const generateDocumentFileName = (document: Document): string => {
  const parts = [document.name];
  
  // Only add type if it's specified
  if (document.type) {
    parts.push(document.type);
  }
  
  // Add issue number (single digit, no padding)
  parts.push(`ISSUE-${document.issue}`);
  
  // Add revision with REV- prefix
  parts.push(`REV-${document.revision}`);
  
  // Add month and year
  parts.push(document.month);
  parts.push(document.year);
  
  return parts.join('-');
};

// Store file data in localStorage with document ID as key
export const storeDocumentFile = (documentId: string, file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as string,
          lastModified: file.lastModified
        };
        localStorage.setItem(`doc_file_${documentId}`, JSON.stringify(fileData));
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

// Retrieve file data from localStorage
export const getDocumentFile = (documentId: string): any | null => {
  try {
    const fileData = localStorage.getItem(`doc_file_${documentId}`);
    return fileData ? JSON.parse(fileData) : null;
  } catch (error) {
    console.error('Error retrieving document file:', error);
    return null;
  }
};

// Download document with actual file content or generated content
export const downloadDocument = (document: Document): void => {
  const fileName = `${generateDocumentFileName(document)}.${document.fileType}`;
  const storedFile = getDocumentFile(document.id);
  
  if (storedFile && storedFile.data) {
    // Download the actual uploaded file
    const link = document.createElement('a');
    link.href = storedFile.data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Generate a document with metadata if no file is stored
    const content = generateDocumentContent(document);
    const blob = new Blob([content], { type: getContentType(document.fileType) });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
};

// Open document in a new tab or appropriate application
export const openDocument = (document: Document): void => {
  const storedFile = getDocumentFile(document.id);
  
  if (storedFile && storedFile.data) {
    // Open the actual uploaded file
    const newWindow = window.open();
    if (newWindow) {
      if (document.fileType === 'pdf') {
        newWindow.location.href = storedFile.data;
      } else {
        // For other file types, create a preview page
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${document.name} - ${document.title}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  max-width: 800px; 
                  margin: 0 auto; 
                  padding: 20px;
                  line-height: 1.6;
                }
                .header {
                  background: #f8f9fa;
                  padding: 20px;
                  border-radius: 8px;
                  margin-bottom: 20px;
                  border-left: 4px solid #007bff;
                }
                .metadata {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                  gap: 10px;
                  margin: 20px 0;
                }
                .metadata-item {
                  background: #f8f9fa;
                  padding: 10px;
                  border-radius: 4px;
                }
                .download-btn {
                  background: #007bff;
                  color: white;
                  padding: 10px 20px;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  text-decoration: none;
                  display: inline-block;
                  margin: 10px 0;
                }
                .download-btn:hover {
                  background: #0056b3;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${document.name}</h1>
                <p><strong>Title:</strong> ${document.title}</p>
              </div>
              
              <div class="metadata">
                <div class="metadata-item">
                  <strong>Status:</strong> ${document.status}
                </div>
                <div class="metadata-item">
                  <strong>Type:</strong> ${document.type ? (document.type === 'M' ? 'Military' : 'Civil') : 'Not specified'}
                </div>
                <div class="metadata-item">
                  <strong>Issue:</strong> ${document.issue}
                </div>
                <div class="metadata-item">
                  <strong>Revision:</strong> ${document.revision}
                </div>
                <div class="metadata-item">
                  <strong>Date:</strong> ${document.month} ${document.year}
                </div>
                <div class="metadata-item">
                  <strong>File Type:</strong> ${document.fileType.toUpperCase()}
                </div>
              </div>
              
              <a href="${storedFile.data}" download="${generateDocumentFileName(document)}.${document.fileType}" class="download-btn">
                Download Original File
              </a>
              
              <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h3>Document Information</h3>
                <p><strong>Created:</strong> ${formatDate(document.createdAt)}</p>
                <p><strong>Last Updated:</strong> ${formatDate(document.updatedAt)}</p>
                <p><strong>Generated Filename:</strong> ${generateDocumentFileName(document)}.${document.fileType}</p>
              </div>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  } else {
    // Generate and open a preview document
    const content = generateDocumentContent(document);
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.onload = () => {
        URL.revokeObjectURL(url);
      };
    }
  }
};

// Generate document content for preview/download
const generateDocumentContent = (document: Document): string => {
  if (document.fileType === 'pdf') {
    // For PDF, return HTML content that will be converted
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${document.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .metadata { margin: 30px 0; }
            .metadata table { width: 100%; border-collapse: collapse; }
            .metadata th, .metadata td { padding: 8px; border: 1px solid #ddd; text-align: left; }
            .metadata th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${document.name}</h1>
            <h2>${document.title}</h2>
          </div>
          
          <div class="metadata">
            <table>
              <tr><th>Property</th><th>Value</th></tr>
              <tr><td>Document Name</td><td>${document.name}</td></tr>
              <tr><td>Title/Description</td><td>${document.title}</td></tr>
              <tr><td>Status</td><td>${document.status}</td></tr>
              <tr><td>Type</td><td>${document.type ? (document.type === 'M' ? 'Military' : 'Civil') : 'Not specified'}</td></tr>
              <tr><td>Issue Number</td><td>${document.issue}</td></tr>
              <tr><td>Revision</td><td>${document.revision}</td></tr>
              <tr><td>Month</td><td>${document.month}</td></tr>
              <tr><td>Year</td><td>${document.year}</td></tr>
              <tr><td>Created</td><td>${formatDate(document.createdAt)}</td></tr>
              <tr><td>Last Updated</td><td>${formatDate(document.updatedAt)}</td></tr>
              <tr><td>Generated Filename</td><td>${generateDocumentFileName(document)}.${document.fileType}</td></tr>
            </table>
          </div>
          
          <div style="margin-top: 40px;">
            <h3>Document Content</h3>
            <p>This is a generated document preview. The actual document content would appear here.</p>
            <p>Document ID: ${document.id}</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
  } else {
    // For text-based documents
    return `Document: ${document.name}
Title: ${document.title}
Status: ${document.status}
Type: ${document.type ? (document.type === 'M' ? 'Military' : 'Civil') : 'Not specified'}
Issue: ${document.issue}
Revision: ${document.revision}
Date: ${document.month} ${document.year}
Created: ${formatDate(document.createdAt)}
Last Updated: ${formatDate(document.updatedAt)}
Generated Filename: ${generateDocumentFileName(document)}.${document.fileType}

---

This is a generated document preview. The actual document content would appear here.

Document ID: ${document.id}
Generated on: ${new Date().toLocaleString()}`;
  }
};

// Get appropriate content type for file
const getContentType = (fileType: string): string => {
  switch (fileType) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    default:
      return 'text/plain';
  }
};

export const exportToPDF = (document: Document): void => {
  // Simulate PDF export
  const fileName = generateDocumentFileName(document).replace('.docx', '.pdf');
  const element = document.createElement('a');
  const file = new Blob([`PDF Export of ${document.name}\nTitle: ${document.title}\nType: ${document.type}\nStatus: ${document.status}\nGenerated: ${new Date().toISOString()}`], {
    type: 'application/pdf'
  });
  element.href = URL.createObjectURL(file);
  element.download = fileName;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};