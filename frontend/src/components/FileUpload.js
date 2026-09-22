import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:5000';

function FileUpload({ onUploadSuccess }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [uploadType, setUploadType] = useState('images');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data);
        if (data.length > 0) {
          setSelectedUser(data[0].Username);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
    setMessage(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'Please select files to upload.' });
      return;
    }
    if (!selectedUser) {
      setMessage({ type: 'error', text: 'Please select a user.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('username', selectedUser);
    formData.append('type', uploadType);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');

      setMessage({ type: 'success', text: data.message });
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-reddit-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Direct File Upload
      </h2>

      <form onSubmit={handleUpload} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Selection */}
          <div>
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">Select Reddit User</label>
            <select
              id="user-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-reddit-blue focus:border-reddit-blue sm:text-sm rounded-md border shadow-sm"
              disabled={isUploading}
            >
              <option value="">-- Choose User --</option>
              {users.map(user => (
                <option key={user.Username} value={user.Username}>
                  {user.Name} (@{user.Username})
                </option>
              ))}
            </select>
          </div>

          {/* Upload Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Content Type</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-reddit-blue h-4 w-4"
                  name="uploadType"
                  value="images"
                  checked={uploadType === 'images'}
                  onChange={() => setUploadType('images')}
                  disabled={isUploading}
                />
                <span className="ml-2 text-sm text-gray-700">Images</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-reddit-orange h-4 w-4"
                  name="uploadType"
                  value="videos"
                  checked={uploadType === 'videos'}
                  onChange={() => setUploadType('videos')}
                  disabled={isUploading}
                />
                <span className="ml-2 text-sm text-gray-700">Videos</span>
              </label>
            </div>
          </div>
        </div>

        {/* File Dropzone / Input */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
            selectedFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-reddit-blue bg-gray-50'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept={uploadType === 'images' ? 'image/*' : 'video/*'}
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            disabled={isUploading}
          />
          <label htmlFor="file-upload" className="cursor-pointer group">
            <div className="flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-3 text-gray-400 group-hover:text-reddit-blue transition-colors ${isUploading ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-gray-700 group-hover:text-reddit-blue">
                {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : `Click to select ${uploadType}`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {uploadType === 'images' ? 'JPG, PNG, WEBP' : 'MP4, MOV, AVI, MKV'}
              </p>
            </div>
          </label>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="max-h-32 overflow-y-auto bg-gray-100 rounded p-3 space-y-1">
            {selectedFiles.map((file, i) => (
              <div key={i} className="text-xs text-gray-600 flex justify-between">
                <span className="truncate mr-2">{file.name}</span>
                <span className="flex-shrink-0 text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isUploading || selectedFiles.length === 0}
            className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-all duration-200 ${
              isUploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : uploadType === 'images' ? 'bg-reddit-blue hover:bg-blue-700' : 'bg-reddit-orange hover:bg-orange-600'
            }`}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              `Upload to ${uploadType === 'images' ? 'Images' : 'Videos'} Folder`
            )}
          </button>
        </div>
      </form>

      {message && (
        <div className={`mt-6 p-4 rounded-md flex items-start ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex-shrink-0">
            {message.type === 'success' ? (
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
