'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState } from 'react'
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
} from 'lucide-react'

// 🔹 استيراد هوك المستخدم الحالي
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserPermissions } from '@/hooks/usePermissions'

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
    name: 'المرضى', 
    href: '/patients', 
    icon: <Users size={20} />,
    permission: 'patients.view',
  },
  { 
    name: 'المواعيد', 
    href: '/appointments', 
    icon: <Calendar size={20} />,
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

// Helper function to check if menu item should be shown based on permissions
const shouldShowMenuItem = (
  permission: string | null,
  userRole?: string,
  hasPermission?: (perm: string) => boolean,
  hasAnyPermission?: (perms: string[]) => boolean
): boolean => {
  // Owner and Manager can see all items
  if (userRole === 'مالك' || userRole === 'مدير') {
    return true
  }

  // If no permission required, always show
  if (!permission) {
    return true
  }

  // Check if user has the required permission
  if (hasPermission && hasAnyPermission) {
    // Extract the feature name (e.g., 'sales' from 'sales.view')
    const featureName = permission.split('.')[0]
    
    // Check if user has ANY permission for this feature (view, create, edit, or delete)
    const relatedPermissions = [
      `${featureName}.view`,
      `${featureName}.create`,
      `${featureName}.edit`,
      `${featureName}.delete`,
    ]
    
    return hasAnyPermission(relatedPermissions)
  }

  return false
}

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const { data: user } = useCurrentUser()
  const { hasPermission, hasAnyPermission } = useUserPermissions()

  const isOwnerOrManager =
    user?.role === 'مالك' || user?.role === 'مدير'

  // Filter menu items based on permissions
  const visibleNavItems = navItems
    .filter((item) =>
      shouldShowMenuItem(item.permission, user?.role, hasPermission, hasAnyPermission)
    )
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
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>

      <nav className='space-y-2 flex-1 w-full'>
        {visibleNavItems.map((item) => {
          // Special handling for dashboard - check if pathname matches any dashboard route
          const isDashboardActive = item.href.startsWith('/dashboard') && 
            (pathname === '/dashboard' || 
             pathname === '/dashboard/doctor' || 
             pathname === '/dashboard/reception' || 
             pathname === '/dashboard/accountant')
          
          const isActive = item.href.startsWith('/dashboard') 
            ? isDashboardActive 
            : pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 p-2 rounded hover:bg-gray-200 transition',
                isActive && 'bg-gray-300 font-bold',
                collapsed ? 'justify-center' : ''
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {/* رابط المستخدمين يظهر فقط للمالك أو المدير أو الأدمن */}
        {isOwnerOrManager && (
          <Link
            href='/users'
            className={cn(
              'flex items-center gap-2 p-2 rounded hover:bg-gray-200 transition',
              pathname.startsWith('/users') && 'bg-gray-300 font-bold',
              collapsed ? 'justify-center' : ''
            )}
          >
            <Shield size={20} />
            {!collapsed && <span>المستخدمين</span>}
          </Link>
        )}

        {/* رابط الأدوار والصلاحيات يظهر فقط للمالك */}
        {user?.role === 'مالك' && (
          <>
            <Link
              href='/roles'
              className={cn(
                'flex items-center gap-2 p-2 rounded hover:bg-gray-200 transition',
                pathname.startsWith('/roles') && 'bg-gray-300 font-bold',
                collapsed ? 'justify-center' : ''
              )}
            >
              <UserCog size={20} />
              {!collapsed && <span>الأدوار</span>}
            </Link>
            <Link
              href='/permissions'
              className={cn(
                'flex items-center gap-2 p-2 rounded hover:bg-gray-200 transition',
                pathname.startsWith('/permissions') && 'bg-gray-300 font-bold',
                collapsed ? 'justify-center' : ''
              )}
            >
              <Key size={20} />
              {!collapsed && <span>الصلاحيات</span>}
            </Link>
          </>
        )}
      </nav>
    </aside>
  )
}
