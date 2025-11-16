'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useTransition, useEffect } from 'react'
import {
  Users,
  Calendar,
  ClipboardList,
  FileText,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ShoppingBasket,
  Package,
  BadgeDollarSign,
  Shield,
  // أضفت أيقونات جديدة
  Grid,
  Layers,
  UserCog,
  Key,
  Loader2,
  CalendarCheck,
} from 'lucide-react'

// 🔹 استيراد هوك المستخدم الحالي
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserPermissions } from '@/hooks/usePermissions'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigation } from '@/contexts/NavigationContext'

// Helper function to get dashboard href based on role
const getDashboardHref = (userRole?: string): string => {
  switch (userRole) {
    case 'طبيب':
      return '/dashboard/doctor'
    case 'سكرتير':
      return '/dashboard/reception'
    case 'محاسب':
      return '/dashboard/accountant'
    case 'مالك':
    case 'مدير':
    default:
      return '/dashboard'
  }
}

const navItems = [
  {
    name: 'لوحة التحكم',
    href: '/dashboard', // Will be overridden dynamically
    icon: <LayoutDashboard size={20} />,
    permission: null, // Always visible
  },
  { 
    name: 'العملاء', 
    href: '/clients', 
    icon: <Users size={20} />,
    permission: 'clients.view',
  },
  { 
    name: 'المواعيد', 
    href: '/appointments', 
    icon: <Calendar size={20} />,
    permission: 'appointments.view',
  },
  {
    name: 'إدارة المواعيد',
    href: '/appointment-management',
    icon: <CalendarCheck size={20} />,
    permission: 'appointments.view',
  },
  {
    name: 'مراحل العلاج',
    href: '/treatment-stages',
    icon: <ClipboardList size={20} />,
    permission: 'treatment-stages.view',
  },
  { 
    name: 'الفواتير', 
    href: '/invoices', 
    icon: <FileText size={20} />,
    permission: 'invoices.view',
  },
  {
    name: 'المشتريات',
    href: '/financial-records',
    icon: <ShoppingBasket size={20} />,
    permission: 'financial-records.view',
  },
  {
    name: 'المنتجات',
    href: '/products',
    icon: <Package size={20} />,
    permission: 'products.view',
  },
  {
    name: 'المبيعات',
    href: '/sales',
    icon: <BadgeDollarSign size={20} />,
    permission: 'sales.view',
  },
  // إضافة الأقسام
  {
    name: 'الأقسام',
    href: '/departments',
    icon: <Grid size={20} />,
    permission: 'departments.view',
  },
  // إضافة الخدمات
  {
    name: 'الخدمات',
    href: '/services',
    icon: <Layers size={20} />,
    permission: 'services.view',
  },
  // إضافة التحليل
  {
    name: 'التحليل التنفيذي',
    href: '/dashboard/analytics/executive',
    icon: <LayoutDashboard size={20} />,
    permission: 'analytics.view',
  },
]

// Helper function to get default permissions for a role (when permissions array is empty)
const getDefaultPermissionsForRole = (role?: string): string[] => {
  switch (role) {
    case 'سكرتير': // Receptionist
      return [
        'appointments.view',
        'appointments.create',
        'appointments.edit',
        'clients.view',
        'clients.create',
        'clients.edit',
        // Note: treatment-stages and invoices removed - receptionists don't have permission
      ]
    case 'طبيب': // Doctor
      return [
        'appointments.view',
        'appointments.edit',
        'clients.view',
        'treatment-stages.view',
        'treatment-stages.create',
        'treatment-stages.edit',
      ]
    case 'محاسب': // Accountant
      return [
        'invoices.view',
        'invoices.create',
        'invoices.edit',
        'financial-records.view',
        'financial-records.create',
        'financial-records.edit',
        'sales.view',
        'sales.create',
      ]
    default:
      return []
  }
}

// Helper function to check if menu item should be shown based on permissions
const shouldShowMenuItem = (
  permission: string | null,
  userRole?: string,
  hasPermission?: (perm: string) => boolean,
  hasAnyPermission?: (perms: string[]) => boolean,
  userPermissions?: string[] // Add user permissions array
): boolean => {
  // Owner and Manager can see all items
  if (userRole === 'مالك' || userRole === 'مدير') {
    return true
  }

  // If no permission required, always show
  if (!permission) {
    return true
  }

  // If user has no permissions, use role-based defaults
  const effectivePermissions = (userPermissions && userPermissions.length > 0)
    ? userPermissions
    : getDefaultPermissionsForRole(userRole)

  // Extract the feature name (e.g., 'sales' from 'sales.view')
  const featureName = permission.split('.')[0]
  
  // Check if user has ANY permission for this feature (view, create, edit, or delete)
  const relatedPermissions = [
    `${featureName}.view`,
    `${featureName}.create`,
    `${featureName}.edit`,
    `${featureName}.delete`,
  ]
  
  return relatedPermissions.some(perm => effectivePermissions.includes(perm))
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const { setIsNavigating } = useNavigation() // Now safe - returns default if context unavailable

  const { data: user, isLoading: userLoading, isFetching: userFetching, isError: userError } = useCurrentUser()
  const { hasPermission, hasAnyPermission, permissions: userPermissions } = useUserPermissions()

  const isOwnerOrManager =
    user?.role === 'مالك' || user?.role === 'مدير'

  // Check if user data is loading or fetching (consistent loading state)
  const isUserLoading = userLoading || userFetching

  // Reset navigating state when pathname changes (navigation completed)
  useEffect(() => {
    setNavigatingTo(null)
    setIsNavigating(false)
  }, [pathname, setIsNavigating])

  // Update global navigation state
  useEffect(() => {
    setIsNavigating(isPending)
  }, [isPending, setIsNavigating])

  // Handle navigation with transition
  const handleNavigation = (href: string) => {
    setNavigatingTo(href)
    setIsNavigating(true)
    startTransition(() => {
      router.push(href)
    })
  }

  // Prefetch route on hover
  const handleMouseEnter = (href: string) => {
    router.prefetch(href)
  }

  // Filter menu items based on permissions
  // Only filter and show items when user data is loaded (not loading/fetching and no error)
  const visibleNavItems = isUserLoading || userError || !user
    ? [] // Don't show any items while loading/fetching or on error
    : (() => {
        // For Owner/Manager, show items immediately (they see all items anyway)
        if (isOwnerOrManager) {
          return navItems.map((item) => {
            // Override dashboard href based on user role
            if (item.href === '/dashboard') {
              return {
                ...item,
                href: getDashboardHref(user?.role),
              }
            }
            return item
          })
        }
        
        // For other roles, ensure permissions array is loaded (not undefined)
        // Check if permissions property exists on user object (even if empty array)
        // to distinguish between "no permissions" and "permissions not loaded yet"
        if (user?.permissions === undefined) {
          // Permissions not loaded yet - return empty array to show loading state
          return []
        }
        
        // Permissions are loaded (even if empty array), filter menu items
        return navItems
          .filter((item) => {
            const shouldShow = shouldShowMenuItem(
              item.permission, 
              user?.role, 
              hasPermission, 
              hasAnyPermission,
              userPermissions
            )
            return shouldShow
          })
          .map((item) => {
            // Override dashboard href based on user role
            if (item.href === '/dashboard') {
              return {
                ...item,
                href: getDashboardHref(user?.role),
              }
            }
            return item
          })
      })()

  return (
    <aside
      className={cn(
        'h-full bg-gray-100 border-r transition-all duration-300 p-4 flex flex-col',
        collapsed ? 'w-16 items-center' : 'w-64'
      )}
    >
      {/* زر التصغير */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className='mb-6 text-gray-600 hover:text-black self-end'
        suppressHydrationWarning
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>

      <nav className='space-y-2 flex-1 w-full'>
        {isUserLoading ? (
          // Show loading skeleton while user data is loading or fetching
          <div className='space-y-2'>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className={cn(
                  'h-10 w-full',
                  collapsed && 'h-10 w-10 rounded-full'
                )}
              />
            ))}
          </div>
        ) : userError || !user ? (
          // Show error state if user data failed to load
          <div className='text-sm text-red-500 p-2'>
            حدث خطأ أثناء تحميل البيانات
          </div>
        ) : visibleNavItems.length === 0 ? (
          // Show message if no items are available (shouldn't happen, but handle gracefully)
          <div className='text-sm text-gray-500 p-2'>
            لا توجد عناصر للعرض
          </div>
        ) : (
          // Show filtered menu items
          visibleNavItems.map((item) => {
            // item.href is already transformed (dashboard href is already set based on role)
            const actualHref = item.href
            
            // Check if this is a main dashboard route (not analytics or other sub-routes)
            // Main dashboard routes are: /dashboard, /dashboard/doctor, /dashboard/reception, /dashboard/accountant
            const isMainDashboard = actualHref === '/dashboard' || 
              actualHref === '/dashboard/doctor' || 
              actualHref === '/dashboard/reception' || 
              actualHref === '/dashboard/accountant'
            
            // For main dashboard routes, only match exact pathname (to avoid matching /dashboard/analytics/executive)
            // For analytics and other sub-routes, check if pathname starts with the href followed by / or is exact match
            const isActive = isMainDashboard
              ? pathname === actualHref  // Exact match only for main dashboard routes
              : pathname === actualHref || pathname.startsWith(actualHref + '/')  // Exact or starts with for sub-routes
            
            const isNavigating = navigatingTo === actualHref && isPending
            
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(actualHref)}
                onMouseEnter={() => handleMouseEnter(actualHref)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded hover:bg-gray-200 transition w-full text-right',
                  isActive && 'bg-gray-300 font-bold',
                  isNavigating && 'opacity-70',
                  collapsed ? 'justify-center' : ''
                )}
                disabled={isNavigating}
                suppressHydrationWarning
              >
                {isNavigating ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  item.icon
                )}
                {!collapsed && <span>{item.name}</span>}
              </button>
            )
          })
        )}

        {/* رابط المستخدمين يظهر فقط للمالك أو المدير أو الأدمن */}
        {/* Only show these links when user is loaded and not in error state */}
        {!isUserLoading && !userError && user && isOwnerOrManager && (() => {
          const isNavigating = navigatingTo === '/users' && isPending
          return (
            <button
              onClick={() => handleNavigation('/users')}
              onMouseEnter={() => handleMouseEnter('/users')}
              className={cn(
                'flex items-center gap-2 p-2 rounded hover:bg-gray-200 transition w-full text-right',
                pathname.startsWith('/users') && 'bg-gray-300 font-bold',
                isNavigating && 'opacity-70',
                collapsed ? 'justify-center' : ''
              )}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Shield size={20} />
              )}
              {!collapsed && <span>المستخدمين</span>}
            </button>
          )
        })()}

        {/* رابط الأدوار والصلاحيات يظهر فقط للمالك */}
        {/* Only show these links when user is loaded and not in error state */}
        {!isUserLoading && !userError && user?.role === 'مالك' && (
          <>
            {(() => {
              const isNavigating = navigatingTo === '/roles' && isPending
              return (
                <button
                  onClick={() => handleNavigation('/roles')}
                  onMouseEnter={() => handleMouseEnter('/roles')}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded hover:bg-gray-200 transition w-full text-right',
                    pathname.startsWith('/roles') && 'bg-gray-300 font-bold',
                    isNavigating && 'opacity-70',
                    collapsed ? 'justify-center' : ''
                  )}
                  disabled={isNavigating}
                >
                  {isNavigating ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <UserCog size={20} />
                  )}
                  {!collapsed && <span>الأدوار</span>}
                </button>
              )
            })()}
            {(() => {
              const isNavigating = navigatingTo === '/permissions' && isPending
              return (
                <button
                  onClick={() => handleNavigation('/permissions')}
                  onMouseEnter={() => handleMouseEnter('/permissions')}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded hover:bg-gray-200 transition w-full text-right',
                    pathname.startsWith('/permissions') && 'bg-gray-300 font-bold',
                    isNavigating && 'opacity-70',
                    collapsed ? 'justify-center' : ''
                  )}
                  disabled={isNavigating}
                >
                  {isNavigating ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Key size={20} />
                  )}
                  {!collapsed && <span>الصلاحيات</span>}
                </button>
              )
            })()}
          </>
        )}
      </nav>
    </aside>
  )
}
