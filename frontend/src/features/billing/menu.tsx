import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Invoices', path: '/billing/invoices', icon: ReceiptLongIcon, roles: ['ADMIN', 'BILLING', 'RECEPTIONIST'] },
  { label: 'Payments', path: '/billing/payments', icon: PaymentsIcon, roles: ['ADMIN', 'BILLING'] },
  { label: 'Refunds', path: '/billing/refunds', icon: CurrencyExchangeIcon, roles: ['ADMIN', 'BILLING'] },
  { label: 'Deposits', path: '/billing/deposits', icon: AccountBalanceWalletIcon, roles: ['ADMIN', 'BILLING', 'RECEPTIONIST'] },
  { label: 'Insurance Plans', path: '/billing/insurance-plans', icon: HealthAndSafetyIcon, roles: ['ADMIN', 'BILLING'] },
  { label: 'Patient Insurance', path: '/billing/patient-insurance', icon: HealthAndSafetyIcon, roles: ['ADMIN', 'BILLING'] },
  { label: 'Claims', path: '/billing/claims', icon: DescriptionIcon, roles: ['ADMIN', 'BILLING'] },
  { label: 'Billing Stats', path: '/billing/stats', icon: BarChartIcon, roles: ['ADMIN', 'BILLING'] },
];

export default { menuItems };
