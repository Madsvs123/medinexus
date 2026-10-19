import MedicationIcon from '@mui/icons-material/Medication';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MedicationLiquidIcon from '@mui/icons-material/MedicationLiquid';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Medications', path: '/pharmacy/medications', icon: MedicationIcon, roles: ['ADMIN', 'PHARMACIST', 'DOCTOR'] },
  { label: 'New Medication', path: '/pharmacy/medications/new', icon: AddIcon, roles: ['ADMIN', 'PHARMACIST'] },
  { label: 'Batches', path: '/pharmacy/batches', icon: InventoryIcon, roles: ['ADMIN', 'PHARMACIST'] },
  { label: 'Suppliers', path: '/pharmacy/suppliers', icon: LocalShippingIcon, roles: ['ADMIN', 'PHARMACIST'] },
  { label: 'Dispense', path: '/pharmacy/dispense', icon: MedicationLiquidIcon, roles: ['ADMIN', 'PHARMACIST'] },
  { label: 'Interactions', path: '/pharmacy/interactions', icon: SwapHorizIcon, roles: ['ADMIN', 'PHARMACIST'] },
  { label: 'Transfers', path: '/pharmacy/transfers', icon: SwapHorizIcon, roles: ['ADMIN', 'PHARMACIST'] },
  { label: 'Returns', path: '/pharmacy/returns', icon: AssignmentReturnIcon, roles: ['ADMIN', 'PHARMACIST'] },
  { label: 'Stock Alerts', path: '/pharmacy/alerts', icon: WarningAmberIcon, roles: ['ADMIN', 'PHARMACIST'] },
];
