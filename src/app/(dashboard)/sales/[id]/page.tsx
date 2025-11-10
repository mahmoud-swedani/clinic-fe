'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SaleItem, SalePayment } from '@/types/api'

export default function SaleDetailsPage() {
  const { id } = useParams()
  const router = useRouter()

  // جلب تفاصيل البيع
  const {
    data: sale,
    isLoading: loadingSale,
    error: errorSale,
  } = useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      const res = await axios.get(`/sales/${id}`)
      // The API returns { success: true, data: <sale> }
      return res.data?.data || res.data
    },
    enabled: !!id,
  })

  // جلب الدفعات الخاصة بالبيع
  const {
    data: payments,
    isLoading: loadingPayments,
    error: errorPayments,
  } = useQuery({
    queryKey: ['salePayments', id],
    queryFn: async () => {
      const res = await axios.get(`/sales/${id}/payments`)
      // The API returns { success: true, data: <payments> }
      return res.data?.data || res.data || []
    },
    enabled: !!id,
  })

  if (loadingSale) return <div className='p-4'>جارٍ التحميل...</div>
  if (errorSale)
    return <div className='p-4 text-red-600'>حدث خطأ أثناء جلب البيانات</div>
  if (!sale) return <div className='p-4'>لا توجد بيانات</div>

  return (
    <div className='p-4 max-w-3xl mx-auto space-y-6'>
      <Button
        variant='outline'
        onClick={() => router.push('/sales')}
        className='mb-4'
      >
        العودة إلى المبيعات
      </Button>

      <h1 className='text-2xl font-bold border-b pb-2'>تفاصيل عملية البيع</h1>

      {/* معلومات المريض */}
      <section>
        <h2 className='text-xl font-semibold mb-2'>معلومات المريض</h2>
        <div className='grid gap-1 text-sm'>
          <p>
            <strong>الاسم:</strong>{' '}
            {typeof sale.patient === 'object' && sale.patient !== null
              ? sale.patient.fullName
              : 'غير معروف'}
          </p>
          <p>
            <strong>الهاتف:</strong>{' '}
            {typeof sale.patient === 'object' && sale.patient !== null
              ? sale.patient.phone || 'غير متوفر'
              : 'غير متوفر'}
          </p>
        </div>
      </section>

      {/* عناصر البيع */}
      <section>
        <h2 className='text-xl font-semibold mb-2'>عناصر البيع</h2>
        <table className='w-full text-right table-auto border-collapse border border-gray-300'>
          <thead className='bg-gray-100'>
            <tr>
              <th className='border border-gray-300 p-2'>المنتج</th>
              <th className='border border-gray-300 p-2'>الكمية</th>
              <th className='border border-gray-300 p-2'>سعر الوحدة</th>
              <th className='border border-gray-300 p-2'>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(sale.items) && sale.items.length > 0 ? (
              sale.items.map((item: SaleItem, index: number) => {
                const product = typeof item.product === 'object' ? item.product : null
                const productId =
                  product?._id ||
                  (typeof item.product === 'string' ? item.product : `product-${index}`)
                return (
                  <tr key={productId} className='hover:bg-gray-50'>
                    <td className='border border-gray-300 p-2'>
                      {product?.name || 'منتج غير معروف'}
                    </td>
                    <td className='border border-gray-300 p-2'>{item.quantity}</td>
                    <td className='border border-gray-300 p-2'>
                      {item.unitPrice?.toLocaleString() || '0'} ل.س
                    </td>
                    <td className='border border-gray-300 p-2'>
                      {((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()} ل.س
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={4} className='border border-gray-300 p-2 text-center text-gray-500'>
                  لا توجد عناصر
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ملخص الدفع */}
      <section className='bg-gray-50 p-4 rounded-xl shadow-sm space-y-2'>
        <h2 className='text-xl font-semibold mb-2'>الملخص المالي</h2>
        <div className='grid gap-1 text-sm'>
          <p>
            <strong>الإجمالي:</strong> {sale.totalAmount.toLocaleString()} ل.س
          </p>
          <p>
            <strong>المدفوع:</strong> {sale.paidAmount.toLocaleString()} ل.س
          </p>
          <p>
            <strong>المتبقي:</strong>{' '}
            <span
              className={
                sale.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'
              }
            >
              {sale.remainingAmount.toLocaleString()} ل.س
            </span>
          </p>
          <p>
            <strong>حالة الدفع:</strong>{' '}
            {sale.paymentStatus === 'paid'
              ? 'مدفوع بالكامل'
              : sale.paymentStatus === 'partial'
              ? 'مدفوع جزئي'
              : 'غير مدفوع'}
          </p>
          <p>
            <strong>طريقة الدفع:</strong>{' '}
            {sale.paymentMethod.charAt(0).toUpperCase() +
              sale.paymentMethod.slice(1)}
          </p>
          {sale.notes && (
            <p>
              <strong>ملاحظات:</strong> {sale.notes}
            </p>
          )}
        </div>

        {/* زر إضافة دفعة */}
        {sale.remainingAmount > 0 && (
          <div className='pt-4'>
            <Link href={`/sales/${sale._id}/payments`}>
              <Button
                variant='default'
                className='bg-primary text-white hover:bg-primary/90'
              >
                إضافة دفعة
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* قسم الدفعات */}
      <section>
        <h2 className='text-xl font-semibold mb-2'>الدفعات</h2>

        {loadingPayments && <div>جارٍ تحميل الدفعات...</div>}
        {errorPayments && (
          <div className='text-red-600'>حدث خطأ أثناء جلب الدفعات</div>
        )}

        {!loadingPayments && (!payments || (Array.isArray(payments) && payments.length === 0)) && (
          <div className='text-sm text-gray-500'>لا توجد دفعات مسجلة بعد</div>
        )}

        {Array.isArray(payments) && payments.length > 0 && (
          <table className='w-full text-right table-auto border-collapse border border-gray-300'>
            <thead className='bg-gray-100'>
              <tr>
                <th className='border border-gray-300 p-2'>المبلغ</th>
                <th className='border border-gray-300 p-2'>تاريخ الدفعة</th>
                <th className='border border-gray-300 p-2'>مسجل بواسطة</th>
                <th className='border border-gray-300 p-2'>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment: SalePayment) => (
                <tr key={payment._id} className='hover:bg-gray-50'>
                  <td className='border border-gray-300 p-2'>
                    {payment.amount.toLocaleString()} ل.س
                  </td>
                  <td className='border border-gray-300 p-2'>
                    {payment.createdAt
                      ? new Date(payment.createdAt).toLocaleDateString('ar-SY', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td className='border border-gray-300 p-2'>
                    {typeof payment.createdBy === 'object' &&
                    payment.createdBy !== null
                      ? payment.createdBy.name || 'غير معروف'
                      : 'غير معروف'}
                  </td>
                  <td className='border border-gray-300 p-2'>
                    {payment.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
