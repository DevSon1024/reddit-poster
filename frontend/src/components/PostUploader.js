import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:5000';

function PostUploader({ post, flairs, selectedAccount, onUploadSuccess, onImageDeleted, setIsUploading }) {
  const [caption, setCaption] = useState('');
  const [selectedFlair, setSelectedFlair] = useState('');
  const [selectedImages, setSelectedImages] = useState(new Set(post.images));
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const abortControllerRef = useRef(null);
  
  useEffect(() => {
    if (flairs && flairs.length > 0) {
      // Avoid resetting if flair is already selected and still valid
      if (!flairs.find(f => f.id === selectedFlair)) {
        setSelectedFlair(flairs[0].id);
      }
    }
  }, [flairs, selectedFlair]);

  // **FIX**: This effect re-syncs the selected images when an image is deleted from the parent state.
  useEffect(() => {
    setSelectedImages(new Set(post.images));
  }, [post.images]);

  const handleImageSelection = (imageName) => {
    setSelectedImages(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(imageName)) {
        newSelected.delete(imageName);
      } else {
        newSelected.add(imageName);
      }
      return newSelected;
    });
  };

  const handleDeleteImage = async (imageName) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${imageName}? This cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/images/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: imageName }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete');
        }

        onImageDeleted(post.uniqueId, imageName);
    } catch (error) {
        console.error("Delete failed:", error);
        alert(`Could not delete image: ${error.message}`);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setIsUploading(false);
    setMessage({ type: 'error', text: 'Upload canceled.' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsUploading(true);
    setMessage(null);

    abortControllerRef.current = new AbortController();

    if (!selectedFlair) {
        setMessage({ type: 'error', text: 'Please select a flair before uploading.' });
        setIsLoading(false);
        setIsUploading(false);
        return;
    }
    
    if (selectedImages.size === 0) {
        setMessage({ type: 'error', text: 'Please select at least one image to upload.' });
        setIsLoading(false);
        setIsUploading(false);
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountUsername: selectedAccount,
          username: post.username,
          caption: caption,
          flairId: selectedFlair,
          imagesToUpload: Array.from(selectedImages),
        }),
        signal: abortControllerRef.current.signal,
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Something went wrong');

      setMessage({ type: 'success', text: `Success! Post URL: ${data.url}` });
      onUploadSuccess(post.uniqueId);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessage({ type: 'error', text: error.message });
      }
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  if (!post) return null;

  // The JSX for this component remains the same as the previous step.
  // ... (paste the JSX from the previous response here)
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-gray-200 pb-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">{post.titlePreview} {post.part > 0 && <span className="text-sm font-normal text-gray-500">(Part {post.part})</span>}</h3>
          <p className="text-sm text-gray-600">Username: <span className="font-semibold">{post.username}</span></p>
        </div>
        <div className="text-sm text-gray-600 mt-2 md:mt-0">
          <p>{post.images.length} images in batch (<span className="font-semibold">{selectedImages.size} selected</span>)</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
        {post.images.map(img => (
          <div key={img} className="relative group aspect-square">
            <label htmlFor={`checkbox-${post.uniqueId}-${img}`} className="cursor-pointer">
              <img 
                src={`${API_BASE_URL}/images/${encodeURIComponent(img)}`} 
                alt={`preview of ${img}`} 
                className={`w-full h-full object-cover rounded-lg transition-all duration-200 ${selectedImages.has(img) ? 'ring-4 ring-offset-2 ring-blue-500' : 'ring-2 ring-gray-200 group-hover:ring-blue-400'}`}
              />
              <div 
                className={`absolute inset-0 bg-black transition-opacity duration-200 rounded-lg ${selectedImages.has(img) ? 'opacity-20' : 'opacity-0'}`}
              ></div>
            </label>
            <input 
              type="checkbox"
              id={`checkbox-${post.uniqueId}-${img}`}
              checked={selectedImages.has(img)} 
              onChange={() => handleImageSelection(img)}
              className="absolute top-2 left-2 h-6 w-6 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <button
              type="button"
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 h-8 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onClick={() => handleDeleteImage(img)}
              title={`Delete ${img}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
             <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
              {img}
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="mt-4 border-t border-gray-200 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor={`caption-${post.uniqueId}`} className="block text-sm font-medium text-gray-700">Caption (Optional)</label>
            <input
              type="text"
              id={`caption-${post.uniqueId}`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isLoading}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter a caption for the post"
            />
          </div>
          <div className="form-group">
            <label htmlFor={`flair-${post.uniqueId}`} className="block text-sm font-medium text-gray-700">Flair</label>
            <select
              id={`flair-${post.uniqueId}`}
              value={selectedFlair}
              onChange={(e) => setSelectedFlair(e.target.value)}
              disabled={isLoading || flairs.length === 0}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {flairs.length === 0 && <option>Loading flairs...</option>}
              {flairs.map((flair) => (
                <option key={flair.id} value={flair.id}>{flair.text}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
        {isLoading ? (
            <button
              type="button"
              onClick={handleCancelUpload}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cancel Upload
            </button>
          ) : (
          <button type="submit" disabled={!selectedFlair || selectedImages.size === 0} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-reddit-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
            {`Upload ${selectedImages.size} Image${selectedImages.size === 1 ? '' : 's'}`}
          </button>
          )}
        </div>
      </form>
      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default PostUploader;