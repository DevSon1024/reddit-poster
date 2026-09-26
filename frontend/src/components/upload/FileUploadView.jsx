import React, { useState, useEffect, useRef } from 'react';
import FilePreviewGrid from './FilePreviewGrid';
import Button from '../common/Button';
import { useApp } from '../../context/AppContext';
import { fetchUsers } from '../../api/usersApi';
import { uploadDirectFiles } from '../../api/filesApi';
import {
  UploadCloud,
  FileImage,
  FileVideo,
  User,
  Trash2,
} from 'lucide-react';

export default function FileUploadView() {
  const { showToast, triggerRefresh, startUpload, finishUpload } = useApp();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [uploadType, setUploadType] = useState('images'); // 'images' or 'videos'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const fileInputRef = useRef(null);

  // Load users for the dropdown
  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setIsUserLoading(true);
      try {
        const data = await fetchUsers();
        if (isMounted) {
          setUsers(data || []);
          if (data && data.length > 0) {
            setSelectedUser(data[0].Username);
          }
        }
      } catch (err) {
        if (isMounted) {
          showToast(`Error fetching users: ${err.message}`, 'error');
        }
      } finally {
        if (isMounted) {
          setIsUserLoading(false);
        }
      }
    }
    loadUsers();
    return () => { isMounted = false; };
  }, [showToast]);

  // File selection handling
  const handleFilesAdded = (newFiles) => {
    const fileList = Array.from(newFiles);
    const allowedImages = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedVideos = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const allowedExts = uploadType === 'images' ? allowedImages : allowedVideos;

    const validFiles = [];
    const invalidFiles = [];

    fileList.forEach(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (allowedExts.includes(ext)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      showToast(
        `Skipped ${invalidFiles.length} file(s) not matching ${uploadType} format: ${invalidFiles.slice(0, 2).join(', ')}...`,
        'error'
      );
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload handler
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedUser) {
      showToast('Please select a user to attribute this upload to.', 'error');
      return;
    }

    if (selectedFiles.length === 0) {
      showToast('Please choose at least one file to upload.', 'error');
      return;
    }

    setIsUploading(true);

    const matchedUser = users.find(u => u.Username === selectedUser);
    const displayName = matchedUser ? matchedUser.Name : selectedUser;

    const uploadId = startUpload({
      name: displayName,
      username: selectedUser,
      count: selectedFiles.length,
      type: uploadType,
      isStaging: true,
    });

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('username', selectedUser);
    formData.append('type', uploadType);

    try {
      const result = await uploadDirectFiles(formData);
      finishUpload(uploadId, { success: true });
      showToast(result.message || `Uploaded ${selectedFiles.length} files successfully!`, 'success');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      triggerRefresh();
    } catch (err) {
      finishUpload(uploadId, { success: false, error: err.message });
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-700/70 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Title Header */}
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Direct File Staging Upload
            </h2>
            <p className="text-xs text-slate-400">
              Upload images or videos directly to server staging folders for posting
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-6 pt-6">
          {/* User Picker & Content Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* User Dropdown */}
            <div>
              <label
                htmlFor="upload-user-select"
                className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-orange-400" />
                <span>Target Model / Creator</span>
              </label>
              <select
                id="upload-user-select"
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                disabled={isUploading || isUserLoading}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-reddit-orange focus:border-transparent cursor-pointer shadow-sm"
              >
                {users.length > 0 ? (
                  users.map(u => (
                    <option key={u.Username} value={u.Username}>
                      {u.Name} (@{u.Username})
                    </option>
                  ))
                ) : (
                  <option value="">No users found in users.csv</option>
                )}
              </select>
            </div>

            {/* Type Selector (Radio Pills) */}
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-2">
                Media Content Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadType('images');
                    setSelectedFiles([]);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                    uploadType === 'images'
                      ? 'bg-reddit-orange text-white border-reddit-orange shadow-glow-orange'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <FileImage className="w-4 h-4" />
                  <span>Images</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadType('videos');
                    setSelectedFiles([]);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                    uploadType === 'videos'
                      ? 'bg-sky-600 text-white border-sky-500 shadow-glow-blue'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <FileVideo className="w-4 h-4" />
                  <span>Videos</span>
                </button>
              </div>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className={`relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 text-center ${
              isDragging
                ? 'border-reddit-orange bg-reddit-orange/5 scale-[1.01]'
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={uploadType === 'images' ? 'image/*' : 'video/*'}
              onChange={e => handleFilesAdded(e.target.files)}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
              {uploadType === 'images' ? (
                <FileImage className="w-7 h-7 text-reddit-orange" />
              ) : (
                <FileVideo className="w-7 h-7 text-sky-400" />
              )}
            </div>

            <p className="text-sm font-semibold text-slate-200 mb-1">
              Drag & drop {uploadType} here, or{' '}
              <span className="text-reddit-orange hover:underline">browse files</span>
            </p>
            <p className="text-xs text-slate-400">
              {uploadType === 'images'
                ? 'Supports JPG, PNG, WEBP files'
                : 'Supports MP4, MOV, MKV files'}
            </p>
          </div>

          {/* File Previews */}
          <FilePreviewGrid
            files={selectedFiles}
            onRemoveFile={handleRemoveFile}
            uploadType={uploadType}
          />

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
            {selectedFiles.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isUploading}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Selection</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isUploading}
                disabled={isUploading || selectedFiles.length === 0}
                icon={UploadCloud}
              >
                {isUploading
                  ? 'Uploading to Server...'
                  : `Upload ${selectedFiles.length} File${selectedFiles.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
