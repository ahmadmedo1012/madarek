// Owner chrome for every page re-exported below (D11 css split, 12-15) —
// this barrel is the single lazy chunk all /owner routes load from.
import '../../styles/owner.css';
import '../../styles/r305-admin-owner.css'; // R305-A8 «Heron» scoped sheet — directly after the family sheet (Task 1 contract)

export { OwnerDashboardPage } from './OwnerDashboardPage';
export { OwnerUsersPage } from './OwnerUsersPage';
export { OwnerActivityPage } from './OwnerActivityPage';
export { OwnerContentPage } from './OwnerContentPage';
export { OwnerSystemPage } from './OwnerSystemPage';
export { OwnerEducationPage } from './OwnerEducationPage';
export { OwnerRealtimePage } from './OwnerRealtimePage';
export { OwnerAiPage } from './OwnerAiPage';
export { OwnerAlertsPage } from './OwnerAlertsPage';
export { OwnerGovernancePage } from './OwnerGovernancePage';
export { OwnerInstitutionsPage } from './OwnerInstitutionsPage';
export { OwnerInstitutionDetailPage } from './OwnerInstitutionDetailPage';
