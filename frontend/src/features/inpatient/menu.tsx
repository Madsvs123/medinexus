import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AddIcon from '@mui/icons-material/Add';
import GridViewIcon from '@mui/icons-material/GridView';
import HotelIcon from '@mui/icons-material/Hotel';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Admissions', path: '/inpatient/admissions', icon: LocalHospitalIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE'] },
  { label: 'New Admission', path: '/inpatient/admissions/new', icon: AddIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE'] },
  { label: 'Ward Board', path: '/inpatient/ward-board', icon: GridViewIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE'] },
  { label: 'Beds', path: '/inpatient/beds', icon: HotelIcon, roles: ['ADMIN', 'NURSE'] },
];
