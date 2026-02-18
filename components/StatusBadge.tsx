
import React from 'react';
import { PlanStatus } from '../types';
import { COLORS } from '../constants';

interface StatusBadgeProps {
  status: PlanStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Use indexed access with casting to ensure the compiler recognizes valid keys
  const styles = (COLORS.status as Record<string, string>)[status] || 'bg-gray-100 text-gray-800';
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wide ${styles}`}>
      {label}
    </span>
  );
};
