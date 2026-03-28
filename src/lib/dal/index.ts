// Artists
export { getArtistProfile, updateArtistProfile } from './artists';

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
  checkSchedulingConflict,
} from './appointments';

// Contacts
export {
  createContact,
  getContacts,
  updateContactStatus,
  updateContact,
  deleteContact,
} from './contacts';

// Designs
export { getPublicDesigns, getPublicDesignById, getAllDesigns, updateDesignApprovalStatus } from './designs';

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

// Gift Cards
export {
  createGiftCard,
  validateGiftCard,
  redeemGiftCard,
  getGiftCardByCode,
  getGiftCards,
} from './gift-cards';

// Orders
export {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getOrderStats,
  getOrderByCheckoutSessionId,
} from './orders';

// Payments
export {
  getOrCreateStripeCustomer,
  createPaymentRecord,
  getPayments,
  getPaymentsBySession,
  getPaymentStats,
} from './payments';

// Products
export {
  getActiveProducts,
  getProductById,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from './products';

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
