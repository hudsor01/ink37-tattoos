// Customers
export {
  getCustomers,
  getCustomerById,
  getCustomerWithDetails,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customers';

// Appointments
export {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentsByDateRange,
  getAppointmentStats,
} from './appointments';

// Designs
export { getPublicDesigns, getPublicDesignById, getAllDesigns } from './designs';

// Users
export { getUsers } from './users';

// Sessions
export {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
} from './sessions';

// Media
export {
  getMediaItems,
  getMediaItemById,
  createMediaItem,
  updateMediaItem,
  deleteMediaItem,
  togglePublicVisibility,
} from './media';

// Analytics
export {
  getDashboardStats,
  getRevenueData,
  getClientAcquisitionData,
  getAppointmentTypeBreakdown,
} from './analytics';

// Settings
export { getSettings, getSettingByKey, upsertSetting } from './settings';

// Audit
export { logAudit, getAuditLogs } from './audit';
