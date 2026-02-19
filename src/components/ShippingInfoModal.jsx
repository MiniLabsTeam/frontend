'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';
import { Edit2, Save, X } from 'lucide-react';

export default function ShippingInfoModal({ isOpen, onClose, shippingInfo, onUpdate }) {
  const { getAuthToken } = useWallet();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    shippingName: '',
    shippingPhone: '',
    shippingAddress: ''
  });

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        shippingName: shippingInfo?.shippingName || '',
        shippingPhone: shippingInfo?.shippingPhone || '',
        shippingAddress: shippingInfo?.shippingAddress || ''
      });
      setIsEditMode(false);
    }
  }, [isOpen, shippingInfo]);

  if (!isOpen) return null;

  const hasShippingInfo = shippingInfo?.shippingName && shippingInfo?.shippingPhone && shippingInfo?.shippingAddress;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // Validate inputs
    if (!formData.shippingName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!formData.shippingPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (!formData.shippingAddress.trim()) {
      toast.error('Delivery address is required');
      return;
    }

    if (formData.shippingName.trim().length < 2) {
      toast.error('Full name must be at least 2 characters');
      return;
    }

    if (formData.shippingPhone.trim().length < 8) {
      toast.error('Phone number must be at least 8 characters');
      return;
    }

    if (formData.shippingAddress.trim().length < 10) {
      toast.error('Delivery address must be at least 10 characters');
      return;
    }

    try {
      setIsSaving(true);
      const authToken = await getAuthToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          shippingName: formData.shippingName.trim(),
          shippingPhone: formData.shippingPhone.trim(),
          shippingAddress: formData.shippingAddress.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update shipping information');
      }

      toast.success('Shipping information updated!');
      setIsEditMode(false);

      // Call onUpdate callback to refresh parent state
      if (onUpdate) {
        onUpdate(data.user);
      }
    } catch (error) {
      console.error('Save shipping info error:', error);
      toast.error(error.message || 'Failed to save shipping information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    setFormData({
      shippingName: shippingInfo?.shippingName || '',
      shippingPhone: shippingInfo?.shippingPhone || '',
      shippingAddress: shippingInfo?.shippingAddress || ''
    });
    setIsEditMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 via-orange-900/20 to-gray-900 border-2 border-orange-500 rounded-2xl p-6 max-w-md w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-black text-white mb-2">
            SHIPPING INFORMATION
          </h2>
          <p className="text-gray-400 text-sm">
            Your delivery details for physical claims
          </p>
        </div>

        {/* Content */}
        {!hasShippingInfo && !isEditMode ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-400 text-base mb-2">
              No shipping information yet
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Add your shipping details to claim physical cars
            </p>
            <button
              onClick={() => setIsEditMode(true)}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transform hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <Edit2 size={16} />
              Add Shipping Info
            </button>
          </div>
        ) : isEditMode ? (
          <div className="space-y-4">
            {/* Edit Form */}
            {/* Name */}
            <div>
              <label className="block text-orange-400 text-xs font-bold mb-2 uppercase tracking-wider">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.shippingName}
                onChange={(e) => handleInputChange('shippingName', e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-black/30 border border-orange-500/30 rounded-lg p-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                maxLength={100}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-orange-400 text-xs font-bold mb-2 uppercase tracking-wider">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.shippingPhone}
                onChange={(e) => handleInputChange('shippingPhone', e.target.value)}
                placeholder="Enter your phone number"
                className="w-full bg-black/30 border border-orange-500/30 rounded-lg p-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                maxLength={20}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-orange-400 text-xs font-bold mb-2 uppercase tracking-wider">
                Delivery Address *
              </label>
              <textarea
                value={formData.shippingAddress}
                onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                placeholder="Enter your complete delivery address"
                rows={4}
                className="w-full bg-black/30 border border-orange-500/30 rounded-lg p-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none"
                maxLength={500}
              />
            </div>

            {/* Info Note */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-xs text-center">
                ℹ️ This information will be used when you claim physical cars
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none inline-flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none inline-flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* View Mode */}
            {/* Name */}
            <div className="bg-black/30 border border-orange-500/30 rounded-lg p-4">
              <label className="block text-orange-400 text-xs font-bold mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <p className="text-white text-lg font-bold">
                {shippingInfo.shippingName}
              </p>
            </div>

            {/* Phone */}
            <div className="bg-black/30 border border-orange-500/30 rounded-lg p-4">
              <label className="block text-orange-400 text-xs font-bold mb-1 uppercase tracking-wider">
                Phone Number
              </label>
              <p className="text-white text-lg font-bold">
                {shippingInfo.shippingPhone}
              </p>
            </div>

            {/* Address */}
            <div className="bg-black/30 border border-orange-500/30 rounded-lg p-4">
              <label className="block text-orange-400 text-xs font-bold mb-1 uppercase tracking-wider">
                Delivery Address
              </label>
              <p className="text-white text-base font-semibold leading-relaxed">
                {shippingInfo.shippingAddress}
              </p>
            </div>

            {/* Info Note */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-xs text-center">
                ℹ️ This information will be used when you claim physical cars
              </p>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditMode(true)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 active:scale-95 transition-all inline-flex items-center justify-center gap-2"
            >
              <Edit2 size={18} />
              Edit Information
            </button>
          </div>
        )}

        {/* Close Button */}
        {!isEditMode && (
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full bg-gray-700 hover:bg-gray-800 text-white font-black py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 active:scale-95 transition-all"
            >
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
