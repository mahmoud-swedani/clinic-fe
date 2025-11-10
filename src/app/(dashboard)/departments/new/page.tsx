import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DepartmentForm from '@/components/departments/departments-form'

export default function NewDepartmentPage() {
  return (
    <div className='p-4'>
      <Card>
        <CardHeader>
          <CardTitle>إضافة قسم جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <DepartmentForm />
        </CardContent>
      </Card>
    </div>
  )
}
