import React, { useEffect } from 'react';

interface AdScanModalProps {
  visible: boolean;
  onAdCompleted: () => void;
  onClose: () => void;
}

export const AdScanModal: React.FC<AdScanModalProps> = ({
  visible,
  onAdCompleted,
}) => {
  useEffect(() => {
    if (visible) {
      // Complete scan immediately on web
      onAdCompleted();
    }
  }, [visible, onAdCompleted]);

  return null;
};
