// src/types/api.ts
// Shared TypeScript interfaces for API responses matching backend

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// User types
export interface User {
  _id: string
  id?: string
  name: string
  email: string
  role: 'سكرتير' | 'طبيب' | 'محاسب' | 'مدير' | 'مالك'
  roleId?: string | Role
  roleDetails?: Role | null
  permissions?: string[]
  branch: string | Branch
  departments?: string[] | Department[]
  hasAllDepartments?: boolean
  isActive: boolean
  createdBy?: string | User
  updatedBy?: string | User
  deletedBy?: string | User
  deletedAt?: string
  createdAt?: string
  updatedAt?: string
}

// Client types
export interface Address {
  city?: string
  region?: string
  street?: string
}

export interface EmergencyContact {
  name?: string
  phone?: string
  relationship?: string
}

export interface Lifestyle {
  smoking?: string
  alcohol?: string
  physicalActivity?: string
  diet?: string
}

export interface BaselineVitals {
  bloodPressure?: string
  bloodSugar?: string
  weight?: number
  height?: number
}

export interface Client {
  _id: string
  id?: string
  refNumber?: string
  firstName: string
  fatherName: string
  lastName: string
  fullName: string
  phone: string
  gender: 'male' | 'female'
  dateOfBirth?: string
  nationalId?: string
  idNumber?: string
  passportNumber?: string
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed'
  nationality?: string
  email?: string
  address?: Address | string // Support both old string and new object
  emergencyContact?: EmergencyContact
  primaryReasonForVisit?: string
  currentMedicalHistory?: string
  allergies?: string[]
  chronicDiseases?: string[]
  previousSurgeries?: string[]
  currentMedications?: string[]
  familyHistory?: string
  dateFileOpening?: string
  lifestyle?: Lifestyle
  bmi?: number
  baselineVitals?: BaselineVitals
  appointmentAdherence?: string
  improvementNotes?: string
  clientClassification?: 'regular' | 'new' | 'chronic' | 'VIP'
  // Keep old fields for backward compatibility
  medicalHistory?: string
  createdAt?: string
  updatedAt?: string
}

export interface ClientMedication {
  _id: string
  id?: string
  client: string | Client
  medicationName: string
  dosage?: string
  frequency?: string
  startDate?: string
  endDate?: string
  results?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface ClientImmunization {
  _id: string
  id?: string
  client: string | Client
  vaccineName: string
  date: string
  batchNumber?: string
  nextDueDate?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface ClientTestResult {
  _id: string
  id?: string
  client: string | Client
  testName: string
  testDate: string
  results: string
  doctor?: string | User
  notes?: string
  attachments?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ClientWithAppointments {
  client: Client
  appointments: Appointment[]
}

// Appointment types
export interface Appointment {
  _id: string
  id?: string
  client: string | Client
  doctor: string | User
  date: string
  type: string
  status: 'محجوز' | 'نشط' | 'تم' | 'ملغي'
  notes?: string
  service: string | Service
  departmentId: string | Department
  createdAt?: string
  updatedAt?: string
}

// Branch types
export interface Branch {
  _id: string
  id?: string
  name: string
  location?: string
  phone?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// Department types
export interface Department {
  _id: string
  id?: string
  name: string
  description?: string
  branch: string | Branch
  createdAt?: string
  updatedAt?: string
}

// Service types
export interface Service {
  _id: string
  id?: string
  departmentId: string | Department
  name: string
  description?: string
  price: number
  duration: number
  image?: string
  isActive: boolean
  requiresConsultation: boolean
  createdAt?: string
  updatedAt?: string
}

// Invoice types
export interface Invoice {
  _id: string
  id?: string
  client: string | Client
  appointment: string | Appointment
  treatmentStages: string[] | TreatmentStage[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: 'غير مدفوعة' | 'مدفوعة جزئيًا' | 'مدفوعة بالكامل' | 'دين معدوم'
  createdBy: string | User
  createdAt?: string
  updatedAt?: string
}

// Payment types
export interface Payment {
  _id: string
  id?: string
  client: string | Client
  appointment?: string | Appointment
  invoice: string | Invoice
  amount: number
  method: 'نقدًا' | 'بطاقة' | 'تحويل بنكي' | 'أخرى'
  date: string
  receivedBy: string | User
  createdAt?: string
  updatedAt?: string
}

// Treatment Stage types
export interface TreatmentStage {
  _id: string
  id?: string
  client: string | Client
  title: string
  description?: string
  date: string
  doctor?: string | User
  appointment?: string | Appointment
  cost?: number
  isCompleted: boolean
  createdAt?: string
  updatedAt?: string
}

// Product types
export interface Product {
  _id: string
  id?: string
  name: string
  category?: string
  unit: 'قطعة' | 'كغم' | 'لتر' | 'علبة' | 'أخرى'
  purchasePrice: number
  sellingPrice?: number
  stock: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

// Sale types
export interface SaleItem {
  product: string | Product
  quantity: number
  unitPrice: number
}

export interface Sale {
  _id: string
  id?: string
  client: string | Client
  items: SaleItem[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  paymentStatus: 'paid' | 'partial' | 'unpaid'
  paymentMethod: 'cash' | 'card' | 'insurance' | 'other'
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface SalePayment {
  _id: string
  id?: string
  sale: string | Sale
  amount: number
  createdBy: string | User
  notes?: string
  createdAt?: string
}

// Financial Record types
export interface FinancialRecordPayment {
  amount: number
  paymentDate: string
  method: 'cash' | 'check' | 'transfer' | 'other'
  notes?: string
}

export interface FinancialRecord {
  _id: string
  id?: string
  recordType: 'purchase' | 'expense' | 'salary'
  invoiceNumber?: string
  supplierName?: string
  description?: string
  recordDate: string
  totalAmount: number
  status: 'paid' | 'partial' | 'unpaid'
  payments: FinancialRecordPayment[]
  createdAt?: string
  updatedAt?: string
}

// Dashboard types
export interface DashboardStats {
  totalClients: number
  totalAppointments: number
  totalUsers: number
  totalBranches: number
  totalInvoices: number
  totalStages: number
  totalProducts: number
  totalProductCapital: number
  totalRevenue: number
  totalExpenses: number
  totalPurchases: number
  totalSalaries: number
  totalFinancialOut: number
  netRevenueAfterPurchases: number
  netProfit: number
}

export interface RecentActivity {
  type: 'appointment' | 'payment' | 'invoice'
  description: string
  name: string
  amount?: number
  total?: number
  time: string
}

export interface DashboardData {
  stats: DashboardStats
  recentAppointments: Appointment[]
  recentActivities: RecentActivity[]
}

// Analytics types (for future use)
export interface AnalyticsFilters {
  branchId?: string
  startDate?: string
  endDate?: string
  departmentId?: string
  serviceId?: string
}

export interface TimeSeriesDataPoint {
  date: string
  value: number
  label?: string
}

// Request payload types
export interface CreateClientRequest {
  refNumber?: string
  firstName: string
  fatherName: string
  lastName: string
  fullName: string
  phone: string
  gender: 'male' | 'female'
  dateOfBirth?: string
  nationalId?: string
  idNumber?: string
  passportNumber?: string
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed'
  nationality?: string
  email?: string
  address?: Address | string
  emergencyContact?: EmergencyContact
  primaryReasonForVisit?: string
  currentMedicalHistory?: string
  allergies?: string[]
  chronicDiseases?: string[]
  previousSurgeries?: string[]
  currentMedications?: string[]
  familyHistory?: string
  dateFileOpening?: string
  lifestyle?: Lifestyle
  bmi?: number
  baselineVitals?: BaselineVitals
  appointmentAdherence?: string
  improvementNotes?: string
  clientClassification?: 'regular' | 'new' | 'chronic' | 'VIP'
  medicalHistory?: string
}

export interface CreateAppointmentRequest {
  client: string
  doctor: string
  date: string
  type: string
  notes?: string
  service: string
  departmentId: string
}

export interface CreatePaymentRequest {
  invoiceId: string
  amount: number
  method: 'نقدًا' | 'بطاقة' | 'تحويل بنكي' | 'أخرى'
  client: string
  appointment?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: string
    branch: string
    permissions?: string[]
  }
}

// Role types
export interface Role {
  _id: string
  id?: string
  name: string
  description?: string
  isSystemRole: boolean
  createdBy?: string | User
  updatedBy?: string | User
  permissions?: Permission[]
  createdAt?: string
  updatedAt?: string
}

// Permission types
export interface Permission {
  _id: string
  id?: string
  name: string
  description?: string
  category: string
  createdBy?: string | User
  updatedBy?: string | User
  createdAt?: string
  updatedAt?: string
}

// Role Permission types
export interface RolePermission {
  _id: string
  id?: string
  role: string | Role
  permission: string | Permission
  grantedBy: string | User
  grantedAt: string
}

// Audit Log types
export interface AuditLog {
  _id: string
  id?: string
  entityType: 'User' | 'Role' | 'Permission' | 'RolePermission' | 'Appointment' | 'Client' | 'TreatmentStage' | 'Invoice'
  entityId: string
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'assign-permission'
    | 'remove-permission'
    | 'assign-role'
    | 'remove-role'
    | 'toggle-status'
  changes?: {
    before?: unknown
    after?: unknown
  }
  performedBy: string | User
  performedAt: string
  ipAddress?: string
  userAgent?: string
}



