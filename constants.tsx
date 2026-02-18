
import { Plan, PlanStatusValues } from './types';

export const COLORS = {
  primary: '#003366',
  accent: '#800000',
  bg: '#F3F4F6',
  status: {
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CORRECTIONS_REQUIRED: 'bg-amber-100 text-amber-800 border-amber-200',
    IN_REVIEW: 'bg-blue-100 text-blue-800 border-blue-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    PENDING_PAYMENT: 'bg-gray-100 text-gray-800 border-gray-200'
  }
};

export const MOCK_PLANS: Plan[] = [
  {
    id: 'BCC-2026-RES-0043',
    propertyAddress: '12 Khumalo Ave, Suburbs',
    standNumber: '5432-SUB',
    category: 'RESIDENTIAL',
    status: 'IN_REVIEW',
    progress: 65,
    lastUpdate: '2024-05-20',
    architect: 'Ncube & Associates',
    owner: 'Themba Sibanda',
    comments: [
      { id: 'c1', department: 'Engineering', author: 'Eng. Dube', text: 'Foundation depth looks sufficient. Drainage needs clarification.', status: 'CORRECTIONS_REQUIRED', timestamp: '2024-05-18' },
      { id: 'c2', department: 'Fire Safety', author: 'Officer Moyo', text: 'Exit routes cleared.', status: 'APPROVED', timestamp: '2024-05-19' }
    ]
  },
  {
    id: 'BCC-2026-COM-0112',
    propertyAddress: '88 Robert Mugabe Way, CBD',
    standNumber: '102-CBD',
    category: 'COMMERCIAL',
    status: 'APPROVED',
    progress: 100,
    lastUpdate: '2024-05-15',
    architect: 'BlueCity Architects',
    owner: 'Bulawayo Mall Ltd',
    comments: []
  },
  {
    id: 'BCC-2026-IND-0005',
    propertyAddress: 'Unit 4, Belmont Industrial',
    standNumber: '881-BEL',
    category: 'INDUSTRIAL',
    status: 'REJECTED',
    progress: 15,
    lastUpdate: '2024-05-21',
    architect: 'ZimDesign',
    owner: 'Heavy Machinery Co.',
    comments: [
      { id: 'c3', department: 'Planning', author: 'Plnr. Gumbo', text: 'Building line encroachment exceeds 2m. Resubmission required.', status: 'REJECTED', timestamp: '2024-05-21' }
    ]
  }
];
