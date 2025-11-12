// src/lib/queryKeys.ts
// Centralized query key factory for consistent React Query keys

export const queryKeys = {
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters || {}] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    doctors: () => [...queryKeys.users.all, 'doctors'] as const,
    managers: () => [...queryKeys.users.all, 'managers'] as const,
    accountants: () => [...queryKeys.users.all, 'accountants'] as const,
    secretaries: () => [...queryKeys.users.all, 'secretaries'] as const,
  },

  // Current User
  currentUser: {
    all: ['currentUser'] as const,
    me: () => [...queryKeys.currentUser.all, 'me'] as const,
  },

  // Patients
  patients: {
    all: ['patients'] as const,
    lists: () => [...queryKeys.patients.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.patients.lists(), filters || {}] as const,
    details: () => [...queryKeys.patients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.patients.details(), id] as const,
    withAppointments: (id: string) =>
      [...queryKeys.patients.details(), id, 'appointments'] as const,
  },

  // Appointments
  appointments: {
    all: ['appointments'] as const,
    lists: () => [...queryKeys.appointments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.appointments.lists(), filters || {}] as const,
    details: () => [...queryKeys.appointments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.appointments.details(), id] as const,
    byPatient: (patientId: string) =>
      [...queryKeys.appointments.all, 'patient', patientId] as const,
  },

  // Departments
  departments: {
    all: ['departments'] as const,
    lists: () => [...queryKeys.departments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.departments.lists(), filters || {}] as const,
    details: () => [...queryKeys.departments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.departments.details(), id] as const,
  },

  // Services
  services: {
    all: ['services'] as const,
    lists: () => [...queryKeys.services.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.services.lists(), filters || {}] as const,
    details: () => [...queryKeys.services.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.services.details(), id] as const,
    byDepartment: (departmentId: string) =>
      [...queryKeys.services.all, 'department', departmentId] as const,
  },

  // Branches
  branches: {
    all: ['branches'] as const,
    lists: () => [...queryKeys.branches.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.branches.lists(), filters || {}] as const,
  },

  // Invoices
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.invoices.lists(), filters || {}] as const,
    unpaid: (filters?: Record<string, unknown>) =>
      [...queryKeys.invoices.all, 'unpaid', filters || {}] as const,
  },

  // Payments
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.payments.lists(), filters || {}] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.products.lists(), filters || {}] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },

  // Sales
  sales: {
    all: ['sales'] as const,
    lists: () => [...queryKeys.sales.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.sales.lists(), filters || {}] as const,
    details: () => [...queryKeys.sales.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sales.details(), id] as const,
    payments: (id: string) =>
      [...queryKeys.sales.details(), id, 'payments'] as const,
  },

  // Financial Records
  financialRecords: {
    all: ['financial-records'] as const,
    lists: () => [...queryKeys.financialRecords.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.financialRecords.lists(), filters || {}] as const,
    details: () => [...queryKeys.financialRecords.all, 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.financialRecords.details(), id] as const,
  },

  // Treatment Stages
  treatmentStages: {
    all: ['treatment-stages'] as const,
    lists: () => [...queryKeys.treatmentStages.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.treatmentStages.lists(), filters || {}] as const,
    details: () => [...queryKeys.treatmentStages.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.treatmentStages.details(), id] as const,
    byPatient: (patientId: string) =>
      [...queryKeys.treatmentStages.all, 'patient', patientId] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },

  // Analytics (for future use)
  analytics: {
    all: ['analytics'] as const,
    executive: (filters?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, 'executive', filters] as const,
    department: (id: string, filters?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, 'department', id, filters] as const,
    service: (id: string, filters?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, 'service', id, filters] as const,
  },

  // Roles
  roles: {
    all: ['roles'] as const,
    lists: () => [...queryKeys.roles.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.roles.lists(), filters || {}] as const,
    details: () => [...queryKeys.roles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.roles.details(), id] as const,
    permissions: (id: string) =>
      [...queryKeys.roles.details(), id, 'permissions'] as const,
  },

  // Permissions
  permissions: {
    all: ['permissions'] as const,
    lists: () => [...queryKeys.permissions.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.permissions.lists(), filters || {}] as const,
    details: () => [...queryKeys.permissions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.permissions.details(), id] as const,
    categories: () => [...queryKeys.permissions.all, 'categories'] as const,
    byCategory: () => [...queryKeys.permissions.all, 'byCategory'] as const,
  },

  // Audit Logs
  auditLogs: {
    all: ['auditLogs'] as const,
    lists: () => [...queryKeys.auditLogs.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.auditLogs.lists(), filters || {}] as const,
    entity: (entityType: string, entityId: string) =>
      [...queryKeys.auditLogs.all, 'entity', entityType, entityId] as const,
    user: (userId: string) =>
      [...queryKeys.auditLogs.all, 'user', userId] as const,
  },
}


