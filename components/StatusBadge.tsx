
import React from 'react';
import { PlanStatus } from '../types';
import { COLORS } from '../constants';

interface StatusBadgeProps {
  status: PlanStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = (COLORS.status as Record<string, string>)[status] || 'bg-gray-100 text-gray-800';

  const getFriendlyLabel = (s: PlanStatus) => {
    const mapping: Record<string, string> = {
      'DRAFT': 'Started',
      'SUBMITTED': 'Submitted',
      'PRE_SCREENING': 'Under Review',
      'REVIEW_POOL': 'Technical Review',
      'IN_REVIEW': 'Technical Review',
      'CORRECTIONS_REQUIRED': 'Needs Attention',
      'REJECTED': 'Rejected',
      'APPROVED': 'Approved',
      'REJECTED_PRE_SCREEN': 'Review Failed'
    };
    return mapping[s] || s.replace(/_/g, ' ');
  };

  const label = getFriendlyLabel(status);

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wide ${styles}`}>
      {label}
    </span>
  );
};
