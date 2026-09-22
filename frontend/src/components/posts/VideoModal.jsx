import React from 'react';
import Modal from '../common/Modal';
import { API_BASE_URL } from '../../api/client';

export default function VideoModal({ isOpen, videoFile, onClose }) {
  if (!videoFile) return null;

  const videoUrl = `${API_BASE_URL}/videos/${encodeURIComponent(videoFile)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={videoFile}
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col items-center justify-center">
        <video
          key={videoFile}
          controls
          autoPlay
          className="w-full max-h-[75vh] rounded-xl bg-black shadow-inner border border-slate-800"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support HTML5 video playback.
        </video>
        <p className="mt-3 text-xs text-slate-400 font-mono self-start truncate max-w-full">
          Source: {videoFile}
        </p>
      </div>
    </Modal>
  );
}
