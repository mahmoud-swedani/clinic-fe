import { Metadata } from 'next'
import PatientDetailsClient from './PatientDetailsClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  // انتظر params لأنها غير متزامنة
  const awaitedParams = await params

  return {
    title: `تفاصيل المريض ${awaitedParams.id}`,
  }
}

// اجعل الصفحة async لكي تنتظر params
export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // انتظر params هنا أيضاً
  const awaitedParams = await params

  return (
    <main className='p-6 max-w-5xl mx-auto bg-white rounded-lg shadow-lg'>
      <h1 className='text-3xl font-bold mb-6 text-gray-900'>تفاصيل المريض</h1>
      <PatientDetailsClient id={awaitedParams.id} />
    </main>
  )
}
