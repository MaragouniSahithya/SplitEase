import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmStyle = 'danger',
  onConfirm,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onCancel}
      />

      {/* Modal box */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="p-2 rounded-full shrink-0"
            style={{
              backgroundColor: confirmStyle === 'danger' ? '#fee2e2' : '#d1fae5',
              color: confirmStyle === 'danger' ? '#ef4444' : '#10b981'
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-500 mb-6 leading-relaxed pl-1">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all text-sm hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: confirmStyle === 'danger' ? '#ef4444' : '#0d9488'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmModal;
