import { useEffect, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import './App.css'

type Customer = { id: number; name: string; company: string; phone: string; status: 'نشط' | 'جديد' | 'غير نشط' }
type DealStage = 'عميل محتمل' | 'تفاوض' | 'عرض سعر' | 'مكتملة' | 'خاسرة'
type Deal = { id: number; title: string; customerId: number; value: number; stage: DealStage; date: string }
type Employee = { id: number; name: string; role: string; email: string; phone: string; department: string; status: 'نشط' | 'إجازة' | 'غير نشط' }
type TaskStatus = 'لم تبدأ' | 'قيد التنفيذ' | 'مكتملة'
type TaskPriority = 'منخفضة' | 'متوسطة' | 'عالية'
type Task = { id: number; title: string; description: string; employeeId: number; customerId: number | null; dealId: number | null; dueDate: string; priority: TaskPriority; status: TaskStatus }

const menu = [
  { icon: '▦', label: 'لوحة التحكم' }, { icon: '♙', label: 'إدارة العملاء' },
  { icon: '◇', label: 'الصفقات والمبيعات' }, { icon: '☑', label: 'المهام' },
  { icon: '♧', label: 'الموظفون' }, { icon: '▥', label: 'التقارير' }, { icon: '⚙', label: 'الإعدادات' },
]
const stages: DealStage[] = ['عميل محتمل', 'تفاوض', 'عرض سعر', 'مكتملة', 'خاسرة']
const statuses: TaskStatus[] = ['لم تبدأ', 'قيد التنفيذ', 'مكتملة']
const priorities: TaskPriority[] = ['منخفضة', 'متوسطة', 'عالية']
const emptyCustomer = { name: '', company: '', phone: '', status: 'جديد' as Customer['status'] }
const emptyDeal = () => ({ title: '', customerId: 0, value: 0, stage: 'عميل محتمل' as DealStage, date: new Date().toLocaleDateString('en-CA') })
const emptyTask = (employeeId: number = 0) => ({ title: '', description: '', employeeId, customerId: null as number | null, dealId: null as number | null, dueDate: new Date().toLocaleDateString('en-CA'), priority: 'متوسطة' as TaskPriority, status: 'لم تبدأ' as TaskStatus })
function loadData<T>(key: string, fallback: T): T {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : fallback }
  catch { return fallback }
}
const formatMoney = (value: number) => `${value.toLocaleString('en-US')} د.أ`

function App() {
  const [page, setPage] = useState('لوحة التحكم')
  const [company, setCompany] = useState(() => loadData('madar_company', { name: 'شركة مدار للأعمال', email: 'info@madar.example', phone: '0790000000', address: 'عمّان، الأردن' }))
  const [settingsMessage, setSettingsMessage] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersBusy, setCustomersBusy] = useState(false)
  const [customersError, setCustomersError] = useState('')
  const [deals, setDeals] = useState<Deal[]>([])
  const [dealsLoading, setDealsLoading] = useState(true)
  const [dealsBusy, setDealsBusy] = useState(false)
  const [dealsError, setDealsError] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksBusy, setTasksBusy] = useState(false)
  const [tasksError, setTasksError] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [employeesBusy, setEmployeesBusy] = useState(false)
  const [employeesError, setEmployeesError] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [employeeModal, setEmployeeModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<number | null>(null)
  const [employeeForm, setEmployeeForm] = useState<Omit<Employee, 'id'>>({ name: '', role: '', email: '', phone: '', department: '', status: 'نشط' })
  const [search, setSearch] = useState('')
  const [dealSearch, setDealSearch] = useState('')
  const [dealFilter, setDealFilter] = useState('الكل')
  const [taskSearch, setTaskSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState('الكل')
  const [customerModal, setCustomerModal] = useState(false)
  const [dealModal, setDealModal] = useState(false)
  const [taskModal, setTaskModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<number | null>(null)
  const [editingDeal, setEditingDeal] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<number | null>(null)
  const [customerForm, setCustomerForm] = useState(emptyCustomer)
  const [dealForm, setDealForm] = useState(emptyDeal)
  const [taskForm, setTaskForm] = useState(emptyTask)

  // البيانات التشغيلية من PostgreSQL، وإعدادات الشركة فقط من localStorage.
  const API = 'http://localhost:3001/api/customers'
  const readCustomers = async () => {
    setCustomersLoading(true)
    setCustomersError('')
    try {
      const response = await fetch(API)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('customers' in data) || !Array.isArray(data.customers)) throw new Error('استجابة غير متوقعة')
      const rows = data.customers as Customer[]
      setCustomers(rows)
    } catch (error) {
      console.error('Loading customers failed:', error)
      setCustomersError('تعذّر تحميل العملاء من الخادم. تأكد أن Backend يعمل على المنفذ 3001، ثم حاول مجددًا.')
    } finally {
      setCustomersLoading(false)
    }
  }

  useEffect(() => { void readCustomers() }, [])
  const DEALS_API = 'http://localhost:3001/api/deals'
  const readDeals = async () => {
    setDealsLoading(true)
    setDealsError('')
    try {
      const response = await fetch(DEALS_API)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('deals' in data) || !Array.isArray(data.deals)) throw new Error('استجابة غير متوقعة')
      const rows = (data.deals as Array<Record<string, unknown>>).map(row => ({
        id: Number(row.id), title: String(row.title ?? ''),
        customerId: row.customerId == null ? 0 : Number(row.customerId),
        value: Number(row.value), stage: String(row.stage) as DealStage,
        date: String(row.date ?? ''),
      }))
      setDeals(rows)
    } catch (error) {
      console.error('Loading deals failed:', error)
      setDealsError('تعذّر تحميل الصفقات من PostgreSQL. تأكد من تشغيل Backend ثم أعد المحاولة.')
    } finally { setDealsLoading(false) }
  }
  useEffect(() => { void readDeals() }, [])
  const TASKS_API = 'http://localhost:3001/api/tasks'
  const readTasks = async () => {
    setTasksLoading(true)
    setTasksError('')
    try {
      const response = await fetch(TASKS_API)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('tasks' in data) || !Array.isArray(data.tasks)) throw new Error('استجابة غير متوقعة')
      const rows = (data.tasks as Array<Record<string, unknown>>).map(row => ({
        id: Number(row.id), title: String(row.title ?? ''), description: String(row.description ?? ''),
        employeeId: row.employeeId == null ? 0 : Number(row.employeeId),
        customerId: row.customerId == null ? null : Number(row.customerId),
        dealId: row.dealId == null ? null : Number(row.dealId),
        dueDate: String(row.dueDate ?? ''), priority: String(row.priority) as TaskPriority,
        status: String(row.status) as TaskStatus,
      }))
      setTasks(rows)
    } catch (error) {
      console.error('Loading tasks failed:', error)
      setTasks([])
      setTasksError('تعذّر تحميل المهام من PostgreSQL. تأكد من تشغيل Backend ثم أعد المحاولة.')
    } finally { setTasksLoading(false) }
  }
  useEffect(() => { void readTasks() }, [])
  const EMPLOYEES_API = 'http://localhost:3001/api/employees'
  const readEmployees = async () => {
    setEmployeesLoading(true)
    setEmployeesError('')
    try {
      const response = await fetch(EMPLOYEES_API)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('employees' in data) || !Array.isArray(data.employees)) throw new Error('استجابة غير متوقعة')
      setEmployees(data.employees as Employee[])
    } catch (error) {
      console.error('Loading employees failed:', error)
      setEmployeesError('تعذّر تحميل الموظفين من PostgreSQL. تأكد من تشغيل Backend ثم أعد المحاولة.')
      setEmployees([])
    } finally { setEmployeesLoading(false) }
  }
  useEffect(() => { void readEmployees() }, [])
  const saveCompany = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!company.name.trim()) return
    localStorage.setItem('madar_company', JSON.stringify(company))
    setSettingsMessage('تم حفظ إعدادات الشركة بنجاح.')
  }
  const exportBackup = () => {
    const data = { version: 1, exportedAt: new Date().toISOString(), company, customers, deals, tasks, employees }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'madar-crm-backup.json'
    link.click()
    URL.revokeObjectURL(url)
    setSettingsMessage('تم تجهيز النسخة الاحتياطية للتنزيل.')
  }
  const importBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    e.target.value = ''
    setSettingsMessage('استعادة النسخة الاحتياطية معطّلة مؤقتًا حتى نجهّز ترحيلًا آمنًا يحافظ على ربط العملاء بالصفقات والمهام. لم يتم تغيير أي بيانات.')
  }

  const openEmployee = (emp?: Employee) => {
    setEditingEmployee(emp?.id ?? null)
    setEmployeeForm(emp ? { name: emp.name, role: emp.role, email: emp.email, phone: emp.phone, department: emp.department, status: emp.status } : { name: '', role: '', email: '', phone: '', department: '', status: 'نشط' })
    setEmployeeModal(true)
  }
  const saveEmployee = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (employeesBusy || !employeeForm.name.trim() || !employeeForm.role.trim() || !employeeForm.department.trim()) return
    setEmployeesBusy(true)
    setEmployeesError('')
    try {
      const response = await fetch(editingEmployee !== null ? `${EMPLOYEES_API}/${editingEmployee}` : EMPLOYEES_API, {
        method: editingEmployee !== null ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await readEmployees()
      setEmployeeModal(false)
    } catch (error) {
      console.error('Saving employee failed:', error)
      setEmployeesError('فشل حفظ الموظف في PostgreSQL. تحقق من البيانات واتصال الخادم.')
    } finally { setEmployeesBusy(false) }
  }
  const deleteEmployee = async (id: number) => {
    if (employeesBusy || !window.confirm('هل تريد حذف الموظف نهائيًا من PostgreSQL؟')) return
    setEmployeesBusy(true)
    setEmployeesError('')
    try {
      const response = await fetch(`${EMPLOYEES_API}/${id}`, { method: 'DELETE' })
      if (response.status === 409) throw new Error('assigned-tasks')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await readEmployees()
    } catch (error) {
      console.error('Deleting employee failed:', error)
      setEmployeesError(error instanceof Error && error.message === 'assigned-tasks'
        ? 'لا يمكن حذف الموظف لأن لديه مهام مسندة في PostgreSQL.'
        : 'فشل حذف الموظف. تأكد من اتصال الخادم وحاول مجددًا.')
    } finally { setEmployeesBusy(false) }
  }
  const customerName = (id: number | null) => id === null ? '—' : customers.find(c => c.id === id)?.name ?? `عميل غير موجود #${id}`
  const dealName = (id: number | null) => id === null ? '—' : deals.find(d => d.id === id)?.title ?? 'صفقة محذوفة'
  const employeeName = (id: number) => employees.find(e => e.id === id)?.name ?? (id === 0 ? 'موظف محذوف' : `موظف غير موجود #${id}`)

  const openCustomer = (c?: Customer) => {
    setEditingCustomer(c?.id ?? null)
    setCustomerForm(c ? { name: c.name, company: c.company, phone: c.phone, status: c.status } : { ...emptyCustomer })
    setCustomerModal(true)
  }
  const saveCustomer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!customerForm.name.trim() || !customerForm.phone.trim() || customersBusy) return
    setCustomersBusy(true)
    setCustomersError('')
    try {
      const url = editingCustomer !== null ? `${API}/${editingCustomer}` : API
      const response = await fetch(url, {
        method: editingCustomer !== null ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setCustomerModal(false)
      await readCustomers()
    } catch (error) {
      console.error('Saving customer failed:', error)
      setCustomersError('فشل حفظ العميل في قاعدة البيانات. تأكد من اتصال الخادم ثم حاول مرة أخرى.')
    } finally {
      setCustomersBusy(false)
    }
  }

  const deleteCustomer = async (id: number) => {
    if (customersBusy || !window.confirm('هل تريد حذف العميل من PostgreSQL نهائيًا؟ قد تُفصل ارتباطاته بصفقات ومهام قاعدة البيانات.')) return
    setCustomersBusy(true)
    setCustomersError('')
    try {
      const response = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await readCustomers()
    } catch (error) {
      console.error('Deleting customer failed:', error)
      setCustomersError('فشل حذف العميل من قاعدة البيانات. حاول مجددًا بعد التأكد من تشغيل الخادم.')
    } finally {
      setCustomersBusy(false)
    }
  }

  const openDeal = (d?: Deal) => {
    setEditingDeal(d?.id ?? null)
    setDealForm(d ? { title: d.title, customerId: d.customerId, value: d.value, stage: d.stage, date: d.date } : { ...emptyDeal(), customerId: customers[0]?.id ?? 0 })
    setDealModal(true)
  }
  const saveDeal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (dealsBusy || !dealForm.title.trim() || !customers.some(c => c.id === dealForm.customerId) || !Number.isFinite(dealForm.value) || dealForm.value < 0 || !dealForm.date) return
    setDealsBusy(true)
    setDealsError('')
    try {
      const response = await fetch(editingDeal !== null ? `${DEALS_API}/${editingDeal}` : DEALS_API, {
        method: editingDeal !== null ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealForm),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await readDeals()
      setDealModal(false)
    } catch (error) {
      console.error('Saving deal failed:', error)
      setDealsError('فشل حفظ الصفقة في قاعدة البيانات. تأكد من صحة البيانات واتصال الخادم.')
    } finally { setDealsBusy(false) }
  }
  const deleteDeal = async (id: number) => {
    if (dealsBusy || !window.confirm('هل تريد حذف الصفقة نهائيًا من PostgreSQL؟ المهام المرتبطة بالصفقة ستبقى، لكن سيُزال ارتباطها بها.')) return
    setDealsBusy(true)
    setDealsError('')
    try {
      const response = await fetch(`${DEALS_API}/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await readDeals()
    } catch (error) {
      console.error('Deleting deal failed:', error)
      setDealsError('فشل حذف الصفقة من قاعدة البيانات. حاول مجددًا.')
    } finally { setDealsBusy(false) }
  }
  const openTask = (t?: Task) => {
    setEditingTask(t?.id ?? null)
    setTaskForm(t ? { title: t.title, description: t.description, employeeId: t.employeeId, customerId: t.customerId, dealId: t.dealId, dueDate: t.dueDate, priority: t.priority, status: t.status } : emptyTask(employees[0]?.id ?? 0))
    setTaskModal(true)
  }
  const saveTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (tasksBusy || !taskForm.title.trim() || !taskForm.dueDate || !employees.some(emp => emp.id === taskForm.employeeId)) return
    if (taskForm.customerId !== null && !customers.some(c => c.id === taskForm.customerId)) return
    if (taskForm.dealId !== null && !deals.some(d => d.id === taskForm.dealId)) return
    setTasksBusy(true)
    setTasksError('')
    try {
      const response = await fetch(editingTask !== null ? `${TASKS_API}/${editingTask}` : TASKS_API, {
        method: editingTask !== null ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm),
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => null)
        throw new Error(typeof detail?.message === 'string' ? detail.message : `HTTP ${response.status}`)
      }
      await readTasks()
      setTaskModal(false)
    } catch (error) {
      console.error('Saving task failed:', error)
      setTasksError(`فشل حفظ المهمة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`)
    } finally { setTasksBusy(false) }
  }
  const deleteTask = async (id: number) => {
    if (tasksBusy || !window.confirm('هل تريد حذف المهمة نهائيًا من PostgreSQL؟')) return
    setTasksBusy(true)
    setTasksError('')
    try {
      const response = await fetch(`${TASKS_API}/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await readTasks()
    } catch (error) {
      console.error('Deleting task failed:', error)
      setTasksError('فشل حذف المهمة من PostgreSQL. حاول مجددًا.')
    } finally { setTasksBusy(false) }
  }
  const filteredCustomers = customers.filter(c => `${c.name} ${c.company} ${c.phone} ${c.status}`.toLowerCase().includes(search.toLowerCase()))
  const filteredDeals = deals.filter(d => `${d.title} ${customerName(d.customerId)}`.toLowerCase().includes(dealSearch.toLowerCase()) && (dealFilter === 'الكل' || d.stage === dealFilter))
  const filteredEmployees = employees.filter(emp => `${emp.name} ${emp.role} ${emp.department} ${emp.email} ${emp.phone}`.toLowerCase().includes(employeeSearch.toLowerCase()))
  const filteredTasks = tasks.filter(t => `${t.title} ${employeeName(t.employeeId)} ${customerName(t.customerId)} ${dealName(t.dealId)}`.toLowerCase().includes(taskSearch.toLowerCase()) && (taskFilter === 'الكل' || t.status === taskFilter))
  const activeDeals = deals.filter(d => d.stage !== 'مكتملة' && d.stage !== 'خاسرة').length
  const totalSales = deals.filter(d => d.stage === 'مكتملة').reduce((sum, d) => sum + d.value, 0)
  const pendingTasks = tasks.filter(t => t.status !== 'مكتملة').length
  const completedTasks = tasks.filter(t => t.status === 'مكتملة').length
  const today = new Date().toLocaleDateString('en-CA')
  const overdueTasks = tasks.filter(t => t.status !== 'مكتملة' && t.dueDate < today).length

  return (
    <div className="crm" dir="rtl">
      <aside className="sidebar">
        <div className="brand"><div className="brand-symbol">M</div><div><h2>MADAR</h2><p>Business Solutions</p></div></div>
        <div className="sidebar-caption">نظام إدارة علاقات العملاء</div>
        <nav>{menu.map(item => <button key={item.label} className={page === item.label ? 'active' : ''} onClick={() => setPage(item.label)}><span className="menu-icon">{item.icon}</span>{item.label}</button>)}</nav>
        <div className="sidebar-footer"><strong>{company.name}</strong><span>الإصدار التجريبي 1.0</span></div>
      </aside>
      <main className="main">
        <header className="topbar"><div><div className="breadcrumb">{company.name} / {page}</div><h1>{page}</h1><p>مرحبًا بك في نظام إدارة أعمال {company.name}</p></div><span className="avatar">M</span></header>
        {page === 'لوحة التحكم' && <>
          <section className="welcome-banner"><div><span>مرحبًا بعودتك</span><h2>نظرة شاملة على أداء شركتك</h2><p>تابع العملاء والصفقات والمهام من مكان واحد.</p></div><button onClick={() => setPage('المهام')}>عرض المهام</button></section>
          <section className="stats">
            <article><span>إجمالي العملاء</span><strong>{customers.length}</strong><small>العملاء المسجلون</small></article>
            <article><span>الصفقات النشطة</span><strong>{activeDeals}</strong><small>صفقات قيد المتابعة</small></article>
            <article><span>المهام غير المكتملة</span><strong>{pendingTasks}</strong><small>مهام تحتاج متابعة</small></article>
            <article><span>إجمالي المبيعات</span><strong>{formatMoney(totalSales)}</strong><small>قيمة الصفقات المكتملة</small></article>
          </section>
          <section className="panel"><div className="customers-header"><h2>أحدث المهام</h2><button className="secondary-btn" onClick={() => setPage('المهام')}>عرض الكل</button></div><div className="table-container"><table><thead><tr><th>المهمة</th><th>المسؤول</th><th>الاستحقاق</th><th>الحالة</th></tr></thead><tbody>{tasks.slice(-5).reverse().map(t => <tr key={t.id}><td>{t.title}</td><td>{employeeName(t.employeeId)}</td><td>{t.dueDate}</td><td><span className="status-badge">{t.status}</span></td></tr>)}</tbody></table>{tasks.length === 0 && <p>لا توجد مهام بعد.</p>}</div></section>
        </>}
        {page === 'إدارة العملاء' && <section className="panel"><div className="customers-header"><div><h2>قاعدة بيانات العملاء</h2><p>إدارة معلومات العملاء والتواصل معهم</p></div><button className="primary-btn" onClick={() => openCustomer()} disabled={customersBusy || customersLoading || !!customersError}>+ إضافة عميل جديد</button></div><p style={{ color: '#475569', marginBottom: 12 }}>هذه الصفحة متصلة بقاعدة بيانات PostgreSQL. الصفقات أيضًا متصلة بالقاعدة، بينما المهام أيضًا متصلة بـ PostgreSQL، لكن البيانات القديمة لم تُرحّل بعد.</p>{customersError && <p role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{customersError} <button className="secondary-btn" type="button" onClick={() => void readCustomers()}>إعادة المحاولة</button></p>}{customersLoading && <p role="status">جارٍ تحميل العملاء من قاعدة البيانات...</p>}<input className="search-input" placeholder="ابحث باسم العميل أو الشركة أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} /><div className="table-container"><table><thead><tr><th>العميل</th><th>الشركة</th><th>الهاتف</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{filteredCustomers.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.company}</td><td>{c.phone}</td><td><span className="status-badge">{c.status}</span></td><td><div className="action-buttons"><button className="edit-btn" onClick={() => openCustomer(c)} disabled={customersBusy}>تعديل</button><button className="delete-btn" onClick={() => void deleteCustomer(c.id)} disabled={customersBusy}>حذف</button></div></td></tr>)}</tbody></table>{!customersLoading && !customersError && filteredCustomers.length === 0 && <p>لا توجد نتائج.</p>}</div></section>}
        {page === 'الصفقات والمبيعات' && <>
          <section className="stats"><article><span>إجمالي الصفقات</span><strong>{deals.length}</strong></article><article><span>الصفقات النشطة</span><strong>{activeDeals}</strong></article><article><span>الصفقات المكتملة</span><strong>{deals.filter(d => d.stage === 'مكتملة').length}</strong></article><article><span>قيمة المبيعات</span><strong>{formatMoney(totalSales)}</strong></article></section>
          <section className="panel"><div className="customers-header"><div><h2>إدارة الصفقات</h2><p>متابعة الفرص التجارية ومراحل البيع</p></div><button className="primary-btn" onClick={() => openDeal()} disabled={dealsBusy || dealsLoading || !!dealsError || customersLoading || !!customersError || customers.length === 0}>+ إضافة صفقة جديدة</button></div><p style={{ color: '#475569', marginBottom: 12 }}>الصفقات متصلة الآن بـ PostgreSQL. الصفقات القديمة في المتصفح لم تُرحّل، والمهام متصلة بـ PostgreSQL.</p>{dealsError && <p role="alert" style={{ color: '#b91c1c' }}>{dealsError} <button className="secondary-btn" type="button" onClick={() => void readDeals()}>إعادة المحاولة</button></p>}{dealsLoading && <p role="status">جارٍ تحميل الصفقات...</p>}<input className="search-input" placeholder="ابحث عن صفقة أو اسم عميل..." value={dealSearch} onChange={e => setDealSearch(e.target.value)} /><select className="search-input" value={dealFilter} onChange={e => setDealFilter(e.target.value)}><option value="الكل">جميع المراحل</option>{stages.map(s => <option key={s}>{s}</option>)}</select><div className="table-container"><table><thead><tr><th>عنوان الصفقة</th><th>العميل</th><th>القيمة</th><th>المرحلة</th><th>التاريخ</th><th>الإجراءات</th></tr></thead><tbody>{filteredDeals.map(d => <tr key={d.id}><td>{d.title}</td><td>{customerName(d.customerId)}</td><td>{formatMoney(d.value)}</td><td><span className="status-badge">{d.stage}</span></td><td>{d.date}</td><td><div className="action-buttons"><button className="edit-btn" onClick={() => openDeal(d)} disabled={dealsBusy || d.customerId === 0}>تعديل</button><button className="delete-btn" onClick={() => void deleteDeal(d.id)} disabled={dealsBusy}>حذف</button></div></td></tr>)}</tbody></table>{!dealsLoading && !dealsError && filteredDeals.length === 0 && <p>لا توجد صفقات مطابقة.</p>}</div></section>
        </>}
        {page === 'المهام' && <>
          <section className="stats"><article><span>إجمالي المهام</span><strong>{tasks.length}</strong></article><article><span>غير مكتملة</span><strong>{pendingTasks}</strong></article><article><span>مكتملة</span><strong>{completedTasks}</strong></article><article><span>متأخرة</span><strong>{overdueTasks}</strong></article></section>
          <section className="panel"><div className="customers-header"><div><h2>إدارة المهام</h2><p>المهام متصلة بقاعدة بيانات PostgreSQL. المهام القديمة في المتصفح لم تُرحّل تلقائيًا.</p></div><button className="primary-btn" onClick={() => openTask()} disabled={tasksBusy || tasksLoading || !!tasksError || employeesLoading || !!employeesError || employees.length === 0}>+ إضافة مهمة جديدة</button></div>
            {tasksError && <p role="alert" style={{ color: "#b91c1c" }}>{tasksError} <button className="secondary-btn" type="button" onClick={() => void readTasks()}>إعادة المحاولة</button></p>}
            {tasksLoading && <p role="status">جارٍ تحميل المهام من PostgreSQL...</p>}
            <input className="search-input" placeholder="ابحث عن مهمة أو موظف أو عميل أو صفقة..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)} />
            <select className="search-input" value={taskFilter} onChange={e => setTaskFilter(e.target.value)}><option value="الكل">جميع الحالات</option>{statuses.map(s => <option key={s}>{s}</option>)}</select>
            <div className="table-container"><table><thead><tr><th>المهمة</th><th>الموظف</th><th>العميل</th><th>الصفقة</th><th>الاستحقاق</th><th>الأولوية</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{filteredTasks.map(t => <tr key={t.id}><td><strong>{t.title}</strong>{t.description && <div className="task-description">{t.description}</div>}</td><td>{employeeName(t.employeeId)}</td><td>{customerName(t.customerId)}</td><td>{dealName(t.dealId)}</td><td>{t.dueDate}</td><td><span className="status-badge">{t.priority}</span></td><td><span className="status-badge">{t.status}</span></td><td><div className="action-buttons"><button className="edit-btn" onClick={() => openTask(t)} disabled={tasksBusy || t.employeeId === 0}>تعديل</button><button className="delete-btn" onClick={() => void deleteTask(t.id)} disabled={tasksBusy}>حذف</button></div></td></tr>)}</tbody></table>{!tasksLoading && !tasksError && filteredTasks.length === 0 && <p>لا توجد مهام مطابقة.</p>}</div>
          </section>
        </>}
        {page === 'الموظفون' && <>
          <section className="stats">
            <article><span>إجمالي الموظفين</span><strong>{employees.length}</strong></article>
            <article><span>الموظفون النشطون</span><strong>{employees.filter(e => e.status === 'نشط').length}</strong></article>
            <article><span>في إجازة</span><strong>{employees.filter(e => e.status === 'إجازة').length}</strong></article>
            <article><span>المهام غير المكتملة</span><strong>{pendingTasks}</strong></article>
          </section>
          <section className="panel">
            <div className="customers-header"><div><h2>إدارة الموظفين</h2><p>إضافة الموظفين وتحديث بياناتهم وتوزيع المهام عليهم</p></div><button className="primary-btn" onClick={() => openEmployee()} disabled={employeesLoading || employeesBusy || !!employeesError}>+ إضافة موظف جديد</button></div>
            <p style={{ color: '#475569', marginBottom: 12 }}>الموظفون متصلون بـ PostgreSQL. المهام القديمة ما زالت محلية ولم تُرحّل روابط الموظفين بعد.</p>
            {employeesError && <p role="alert" style={{ color: '#b91c1c' }}>{employeesError} <button className="secondary-btn" type="button" onClick={() => void readEmployees()}>إعادة المحاولة</button></p>}
            {employeesLoading && <p role="status">جارٍ تحميل الموظفين...</p>}
            <input className="search-input" placeholder="ابحث عن موظف أو وظيفة أو قسم..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} />
            <div className="table-container"><table><thead><tr><th>الموظف</th><th>الوظيفة</th><th>القسم</th><th>الهاتف</th><th>البريد الإلكتروني</th><th>الحالة</th><th>المهام</th><th>الإجراءات</th></tr></thead><tbody>{filteredEmployees.map(emp => <tr key={emp.id}><td>{emp.name}</td><td>{emp.role}</td><td>{emp.department}</td><td>{emp.phone || '—'}</td><td>{emp.email || '—'}</td><td><span className="status-badge">{emp.status}</span></td><td>{tasks.filter(t => t.employeeId === emp.id).length}</td><td><div className="action-buttons"><button className="edit-btn" onClick={() => openEmployee(emp)} disabled={employeesBusy}>تعديل</button><button className="delete-btn" onClick={() => void deleteEmployee(emp.id)} disabled={employeesBusy}>حذف</button></div></td></tr>)}</tbody></table>{!employeesLoading && !employeesError && filteredEmployees.length === 0 && <p>لا يوجد موظفون مطابقون.</p>}</div>
          </section>
        </>}
        {page === 'التقارير' && <>
          <section className="stats">
            <article><span>إجمالي العملاء</span><strong>{customers.length}</strong><small>عميل مسجل</small></article>
            <article><span>قيمة المبيعات المكتملة</span><strong>{formatMoney(totalSales)}</strong><small>صفقات ناجحة</small></article>
            <article><span>معدل إغلاق الصفقات</span><strong>{deals.length ? Math.round(deals.filter(d => d.stage === 'مكتملة').length / deals.length * 100) : 0}%</strong><small>من إجمالي الصفقات</small></article>
            <article><span>المهام المنجزة</span><strong>{completedTasks} / {tasks.length}</strong><small>متأخرة: {overdueTasks}</small></article>
          </section>
          <section className="panel" style={{ marginBottom: 24 }}>
            <div className="customers-header"><div><h2>تقرير أداء المبيعات</h2><p>البيانات محسوبة مباشرة من الصفقات المسجلة داخل النظام</p></div><button className="secondary-btn" onClick={() => window.print()}>طباعة التقرير</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 28 }}>
              <div>
                <h3>الصفقات حسب المرحلة</h3>
                {stages.map((stage) => {
                  const count = deals.filter(d => d.stage === stage).length
                  const percent = deals.length ? count / deals.length * 100 : 0
                  return <div key={stage} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}><span>{stage}</span><strong>{count}</strong></div>
                    <div style={{ background: '#e9eff8', borderRadius: 20, height: 12, overflow: 'hidden' }}><div style={{ background: stage === 'مكتملة' ? '#16a34a' : stage === 'خاسرة' ? '#dc2626' : '#2e63d3', width: `${percent}%`, height: '100%', borderRadius: 20 }} /></div>
                  </div>
                })}
              </div>
              <div>
                <h3>قيمة الصفقات حسب المرحلة</h3>
                {stages.map((stage) => {
                  const amount = deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0)
                  const maxAmount = Math.max(1, ...stages.map(st => deals.filter(d => d.stage === st).reduce((sum, d) => sum + d.value, 0)))
                  return <div key={stage} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}><span>{stage}</span><strong>{formatMoney(amount)}</strong></div>
                    <div style={{ background: '#e9eff8', borderRadius: 20, height: 12, overflow: 'hidden' }}><div style={{ background: '#0891b2', width: `${amount / maxAmount * 100}%`, height: '100%', borderRadius: 20 }} /></div>
                  </div>
                })}
              </div>
            </div>
          </section>
          <section className="panel" style={{ marginBottom: 24 }}>
            <h2>تقرير المهام</h2>
            <p>توزيع المهام حسب الحالة والأولوية</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18 }}>
              {statuses.map(status => <article key={status} style={{ padding: 18, background: '#f4f7fb', borderRadius: 12 }}><span>{status}</span><h2 style={{ margin: '12px 0 0' }}>{tasks.filter(t => t.status === status).length}</h2></article>)}
              {priorities.map(priority => <article key={priority} style={{ padding: 18, background: '#f4f7fb', borderRadius: 12 }}><span>أولوية {priority}</span><h2 style={{ margin: '12px 0 0' }}>{tasks.filter(t => t.priority === priority).length}</h2></article>)}
            </div>
          </section>
          <section className="panel">
            <h2>أداء فريق العمل</h2><p>عدد المهام المسندة والمنجزة لكل موظف</p>
            <div className="table-container"><table><thead><tr><th>الموظف</th><th>القسم</th><th>إجمالي المهام</th><th>المكتملة</th><th>قيد المتابعة</th></tr></thead><tbody>
              {employees.map(emp => { const assigned = tasks.filter(t => t.employeeId === emp.id); const done = assigned.filter(t => t.status === 'مكتملة').length; return <tr key={emp.id}><td>{emp.name}</td><td>{emp.department}</td><td>{assigned.length}</td><td>{done}</td><td>{assigned.length - done}</td></tr> })}
            </tbody></table>{employees.length === 0 && <p>لا يوجد موظفون.</p>}</div>
          </section>
        </>}
        {page === 'الإعدادات' && <div style={{ display: 'grid', gap: 24 }}>
          <section className="panel">
            <h2>إعدادات الشركة</h2>
            <p>تعديل بيانات الشركة الافتراضية المستخدمة في النسخة التجريبية.</p>
            <form onSubmit={saveCompany} style={{ display: 'grid', gap: 14, maxWidth: 600 }}>
              <label htmlFor="settings-name">اسم الشركة</label>
              <input id="settings-name" className="search-input" required value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
              <label htmlFor="settings-email">البريد الإلكتروني</label>
              <input id="settings-email" className="search-input" type="email" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} />
              <label htmlFor="settings-phone">رقم الهاتف</label>
              <input id="settings-phone" className="search-input" type="tel" value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} />
              <label htmlFor="settings-address">العنوان</label>
              <input id="settings-address" className="search-input" value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />
              <div><button className="primary-btn" type="submit">حفظ إعدادات الشركة</button></div>
            </form>
          </section>
          <section className="panel">
            <h2>النسخ الاحتياطي والاستعادة</h2>
            <p>احفظ نسخة JSON من العملاء والصفقات والمهام والموظفين وإعدادات الشركة. احتفظ بها في مكان آمن لأنها قد تحتوي على بيانات شخصية.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
              <button type="button" className="primary-btn" onClick={exportBackup}>تنزيل نسخة احتياطية</button>
              <label htmlFor="backup-file" className="secondary-btn" style={{ cursor: 'pointer' }}>استعادة من ملف JSON (موقوفة مؤقتًا)</label>
              <input id="backup-file" type="file" accept=".json,application/json" onChange={importBackup} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </div>
            <p>تنبيه: تصدير JSON للتوثيق فقط، والاستعادة معطّلة مؤقتًا. بيانات العملاء والصفقات والموظفين والمهام تأتي من PostgreSQL، وإعدادات الشركة فقط من المتصفح؛ لا تستخدم نسخة JSON لتغيير بيانات قاعدة البيانات.</p>
            {settingsMessage && <p role="status" style={{ color: '#245bc3', fontWeight: 600 }}>{settingsMessage}</p>}
          </section>
          <section className="panel"><h2>حالة النظام</h2><p>النسخة: 1.0 تجريبية — العملاء والصفقات والموظفون والمهام: PostgreSQL عبر API — إعدادات الشركة فقط: localStorage. البيانات القديمة في المتصفح لم تُرحّل بعد.</p></section>
        </div>}
      </main>
      {employeeModal && <div className="modal-overlay"><div className="modal"><h2>{editingEmployee !== null ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h2><form onSubmit={saveEmployee}>
        <label htmlFor="emp-name">اسم الموظف</label><input id="emp-name" required value={employeeForm.name} onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}/>
        <label htmlFor="emp-role">المسمى الوظيفي</label><input id="emp-role" required value={employeeForm.role} onChange={e => setEmployeeForm({ ...employeeForm, role: e.target.value })}/>
        <label htmlFor="emp-dept">القسم</label><input id="emp-dept" required value={employeeForm.department} onChange={e => setEmployeeForm({ ...employeeForm, department: e.target.value })}/>
        <label htmlFor="emp-phone">رقم الهاتف</label><input id="emp-phone" type="tel" value={employeeForm.phone} onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })}/>
        <label htmlFor="emp-email">البريد الإلكتروني</label><input id="emp-email" type="email" value={employeeForm.email} onChange={e => setEmployeeForm({ ...employeeForm, email: e.target.value })}/>
        <label htmlFor="emp-status">حالة الموظف</label><select id="emp-status" value={employeeForm.status} onChange={e => setEmployeeForm({ ...employeeForm, status: e.target.value as Employee['status'] })}><option>نشط</option><option>إجازة</option><option>غير نشط</option></select>
        {employeesError && <p role="alert" style={{ color: "#b91c1c" }}>{employeesError}</p>}<div className="modal-actions"><button className="primary-btn" type="submit" disabled={employeesBusy}>{employeesBusy ? "جارٍ الحفظ..." : "حفظ الموظف"}</button><button className="cancel-btn" type="button" onClick={() => setEmployeeModal(false)}>إلغاء</button></div>
      </form></div></div>}
      {customerModal && <div className="modal-overlay"><div className="modal"><h2>{editingCustomer !== null ? 'تعديل العميل' : 'إضافة عميل جديد'}</h2><form onSubmit={saveCustomer}><label htmlFor="customer-name">اسم العميل</label><input id="customer-name" required value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}/><label htmlFor="customer-company">اسم الشركة</label><input id="customer-company" value={customerForm.company} onChange={e => setCustomerForm({ ...customerForm, company: e.target.value })}/><label htmlFor="customer-phone">رقم الهاتف</label><input id="customer-phone" required type="tel" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })}/><label htmlFor="customer-status">حالة العميل</label><select id="customer-status" value={customerForm.status} onChange={e => setCustomerForm({ ...customerForm, status: e.target.value as Customer['status'] })}><option>جديد</option><option>نشط</option><option>غير نشط</option></select>{customersError && <p role="alert" style={{ color: '#b91c1c' }}>{customersError}</p>}<div className="modal-actions"><button className="primary-btn" type="submit" disabled={customersBusy}>{customersBusy ? "جارٍ الحفظ..." : "حفظ"}</button><button className="cancel-btn" type="button" onClick={() => setCustomerModal(false)}>إلغاء</button></div></form></div></div>}
      {dealModal && <div className="modal-overlay"><div className="modal"><h2>{editingDeal !== null ? 'تعديل الصفقة' : 'إضافة صفقة جديدة'}</h2><form onSubmit={saveDeal}><label htmlFor="deal-title">عنوان الصفقة</label><input id="deal-title" required value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })}/><label htmlFor="deal-customer">العميل</label><select id="deal-customer" required value={dealForm.customerId} onChange={e => setDealForm({ ...dealForm, customerId: Number(e.target.value) })}>{customers.length === 0 && <option value={0}>لا يوجد عملاء</option>}{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><label htmlFor="deal-value">قيمة الصفقة (دينار أردني)</label><input id="deal-value" required type="number" min="0" step="0.01" value={dealForm.value} onChange={e => setDealForm({ ...dealForm, value: Number(e.target.value) })}/><label htmlFor="deal-stage">مرحلة الصفقة</label><select id="deal-stage" value={dealForm.stage} onChange={e => setDealForm({ ...dealForm, stage: e.target.value as DealStage })}>{stages.map(s => <option key={s}>{s}</option>)}</select><label htmlFor="deal-date">التاريخ</label><input id="deal-date" type="date" required value={dealForm.date} onChange={e => setDealForm({ ...dealForm, date: e.target.value })}/><div className="modal-actions"><button className="primary-btn" type="submit" disabled={dealsBusy}>{dealsBusy ? "جارٍ الحفظ..." : "حفظ الصفقة"}</button><button className="cancel-btn" type="button" onClick={() => setDealModal(false)}>إلغاء</button></div></form></div></div>}
      {taskModal && <div className="modal-overlay"><div className="modal"><h2>{editingTask !== null ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h2><form onSubmit={saveTask}><label htmlFor="task-title">عنوان المهمة</label><input id="task-title" required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}/><label htmlFor="task-description">الوصف</label><textarea id="task-description" rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}/><label htmlFor="task-employee">الموظف المسؤول</label><select id="task-employee" required value={taskForm.employeeId} onChange={e => setTaskForm({ ...taskForm, employeeId: Number(e.target.value) })}>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}</select><label htmlFor="task-customer">العميل المرتبط (اختياري)</label><select id="task-customer" value={taskForm.customerId ?? ''} onChange={e => setTaskForm({ ...taskForm, customerId: e.target.value === '' ? null : Number(e.target.value), dealId: null })}><option value="">بدون عميل</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><label htmlFor="task-deal">الصفقة المرتبطة (اختياري)</label><select id="task-deal" value={taskForm.dealId ?? ''} onChange={e => setTaskForm({ ...taskForm, dealId: e.target.value === '' ? null : Number(e.target.value) })}><option value="">بدون صفقة</option>{deals.filter(d => taskForm.customerId === null || d.customerId === taskForm.customerId).map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select><label htmlFor="task-date">تاريخ الاستحقاق</label><input id="task-date" type="date" required value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}/><label htmlFor="task-priority">الأولوية</label><select id="task-priority" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}>{priorities.map(p => <option key={p}>{p}</option>)}</select><label htmlFor="task-status">الحالة</label><select id="task-status" value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}>{statuses.map(s => <option key={s}>{s}</option>)}</select>{tasksError && <p role="alert" style={{ color: "#b91c1c" }}>{tasksError}</p>}<div className="modal-actions"><button className="primary-btn" type="submit" disabled={tasksBusy}>{tasksBusy ? "جارٍ الحفظ..." : "حفظ المهمة"}</button><button className="cancel-btn" type="button" onClick={() => setTaskModal(false)}>إلغاء</button></div></form></div></div>}
    </div>
  )
}
export default App
