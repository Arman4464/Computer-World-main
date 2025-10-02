'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import DarkModeToggle from '@/components/DarkModeToggle'

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    totalUsers: 0,
    todayAppointments: 0,
    paidAppointments: 0,
    unpaidAppointments: 0,
    thisMonthRevenue: 0,
    completionRate: 0
  })
  const [recentAppointments, setRecentAppointments] = useState([])
  const [allAppointments, setAllAppointments] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [technicianNotes, setTechnicianNotes] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [loadingAction, setLoadingAction] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  // Helper function to get short ID
  const getShortId = (id) => {
    return id ? id.toString().substring(0, 8) : 'N/A'
  }

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchAllData()
      setupRealtimeSubscriptions()
    }
  }, [isAdmin])

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.replace('/login')
        return
      }

      // Check if user is admin
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error || !adminUser) {
        router.replace('/')
        toast.error('Access denied. Admin privileges required.')
        return
      }

      setUser(session.user)
      setIsAdmin(true)
    } catch (error) {
      console.error('Admin check error:', error)
      router.replace('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllData = async () => {
    try {
      // Try to use the RPC function first
      const { data: appointments, error: appointmentsError } = await supabase
        .rpc('get_appointments_with_user_details')

      if (appointmentsError) {
        console.error('RPC function error, using fallback method:', appointmentsError)
        await fetchAppointmentsFallback()
        return
      }

      setAllAppointments(appointments || [])
      setRecentAppointments(appointments?.slice(0, 10) || [])
      calculateStats(appointments || [])
      
      // Fetch users
      await fetchUsers(appointments || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error loading admin data')
      await fetchAppointmentsFallback()
    }
  }

  const fetchAppointmentsFallback = async () => {
    try {
      // Fallback: Basic appointments query
      const { data: basicAppointments, error: basicError } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false })

      if (basicError) throw basicError

      // Enhance with user data manually
      const enhancedAppointments = await Promise.all(
        basicAppointments.map(async (apt) => {
          try {
            // Try to get user data from auth.users via service role (if available)
            const { data: userData } = await supabase.auth.admin.getUserById(apt.user_id)
            
            return {
              ...apt,
              user_email: userData?.user?.email || apt.user_email || 'No email',
              user_name: userData?.user?.user_metadata?.full_name || apt.user_name || userData?.user?.email?.split('@')[0] || 'No name'
            }
          } catch {
            // If auth.admin is not available, use existing data or placeholder
            return {
              ...apt,
              user_email: apt.user_email || `user-${getShortId(apt.user_id)}@registered.com`,
              user_name: apt.user_name || `Customer ${apt.phone}`
            }
          }
        })
      )

      setAllAppointments(enhancedAppointments)
      setRecentAppointments(enhancedAppointments.slice(0, 10))
      calculateStats(enhancedAppointments)
      
      await fetchUsers(enhancedAppointments)

    } catch (error) {
      console.error('Fallback fetch error:', error)
      toast.error('Error loading appointments')
    }
  }

  const fetchUsers = async (appointments) => {
    try {
      // Skip user_profiles query - use appointments data directly
      console.log('Using appointments to extract user data...')
      const uniqueUserIds = [...new Set(appointments.map(apt => apt.user_id))]
      
      const usersFromAppointments = uniqueUserIds.map(userId => {
        const userAppointments = appointments.filter(apt => apt.user_id === userId)
        const firstAppointment = userAppointments[0]
        
        return {
          id: userId.toString(),
          email: firstAppointment?.user_email || 'No email',
          full_name: firstAppointment?.user_name || 'No name',
          phone: firstAppointment?.phone || 'No phone',
          created_at: userAppointments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].created_at,
          appointment_count: userAppointments.length,
          total_spent: userAppointments
            .filter(apt => apt.status === 'completed' && apt.payment_status === 'paid')
            .reduce((sum, apt) => sum + (parseFloat(apt.service_price) || 0), 0)
        }
      })

      setAllUsers(usersFromAppointments)
      setStats(prev => ({ ...prev, totalUsers: usersFromAppointments.length }))

    } catch (error) {
      console.error('Error fetching users:', error)
      setAllUsers([])
    }
  }

  const calculateStats = (appointments) => {
    const totalAppointments = appointments.length
    const pending = appointments.filter(apt => apt.status === 'pending').length
    const inProgress = appointments.filter(apt => apt.status === 'in-progress').length
    const completed = appointments.filter(apt => apt.status === 'completed').length
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length
    
    const paidAppointments = appointments.filter(apt => apt.payment_status === 'paid').length
    const unpaidAppointments = appointments.filter(apt => apt.payment_status === 'pending').length
    
    const totalRevenue = appointments
      .filter(apt => apt.status === 'completed' && apt.payment_status === 'paid')
      .reduce((sum, apt) => sum + (parseFloat(apt.service_price) || 0), 0)

    // Today's appointments
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = appointments.filter(apt => 
      apt.created_at.split('T')[0] === today
    ).length

    // This month's revenue
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const thisMonthRevenue = appointments
      .filter(apt => {
        const aptDate = new Date(apt.created_at)
        return aptDate.getMonth() === currentMonth && 
               aptDate.getFullYear() === currentYear &&
               apt.status === 'completed' && 
               apt.payment_status === 'paid'
      })
      .reduce((sum, apt) => sum + (parseFloat(apt.service_price) || 0), 0)

    const completionRate = totalAppointments > 0 ? ((completed / totalAppointments) * 100) : 0

    setStats({
      totalAppointments,
      pending,
      inProgress,
      completed,
      cancelled,
      totalRevenue,
      todayAppointments,
      paidAppointments,
      unpaidAppointments,
      thisMonthRevenue,
      completionRate: Math.round(completionRate),
      totalUsers: 0 // Will be set by fetchUsers
    })
  }

  const setupRealtimeSubscriptions = () => {
    // Subscribe to appointments changes
    const appointmentsSubscription = supabase
      .channel('admin-appointments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' }, 
        (payload) => {
          console.log('Real-time appointment change:', payload)
          
          if (payload.eventType === 'INSERT') {
            // New appointment notification
            toast.success('ðŸ”” New appointment received!', {
              description: `Service: ${payload.new.service_type} â€¢ Phone: +91-${payload.new.phone}`,
              duration: 8000,
              action: {
                label: 'View',
                onClick: () => {
                  setActiveTab('appointments')
                  fetchAllData()
                }
              }
            })
            
            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Computer World Appointment! ðŸ”§', {
                body: `${payload.new.service_type} service requested from +91-${payload.new.phone}`,
                icon: '/favicon.ico',
                tag: 'new-appointment',
                requireInteraction: true
              })
            }
            
            // Play notification sound (optional)
            try {
              const audio = new Audio('/notification.mp3')
              audio.volume = 0.3
              audio.play().catch(e => console.log('Audio play failed:', e))
            } catch (e) {
              console.log('Audio not available:', e)
            }
            
          } else if (payload.eventType === 'UPDATE') {
            toast.info('ðŸ“ Appointment updated', {
              description: `Status: ${payload.new.status} â€¢ Payment: ${payload.new.payment_status}`,
              duration: 4000
            })
          } else if (payload.eventType === 'DELETE') {
            toast.error('ðŸ—‘ï¸ Appointment deleted', { duration: 3000 })
          }
          
          // Refresh data after any change
          fetchAllData()
        }
      )
      .subscribe()

    return () => {
      appointmentsSubscription.unsubscribe()
    }
  }

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    setLoadingAction(`status-${appointmentId}`)
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (error) throw error

      toast.success(`âœ… Appointment status updated to ${newStatus}`)
      
      // Close modal if open
      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment(null)
      }

      // Send WhatsApp notification to customer
      const appointment = allAppointments.find(apt => apt.id === appointmentId)
      if (appointment) {
        try {
          const statusMessages = {
            'in-progress': 'Our technician is now working on your computer repair.',
            'completed': 'Your computer service has been completed successfully! âœ…',
            'cancelled': 'Your appointment has been cancelled. Contact us for rescheduling.'
          }

          await fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `ðŸ”§ *Computer World Update*\\n\\n${statusMessages[newStatus]}\\n\\nService: ${appointment.service_type}\\nBooking ID: ${getShortId(appointmentId)}...\\n\\nFor queries: +91-93162 56101`,
              phoneNumber: `91${appointment.phone}`
            })
          })
          
          toast.success('ðŸ“± Customer notified via WhatsApp')
          
        } catch (notifError) {
          console.log('WhatsApp notification failed (non-critical):', notifError)
        }
      }

      fetchAllData()

    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Failed to update appointment status')
    } finally {
      setLoadingAction('')
    }
  }

  const addTechnicianNotes = async (appointmentId, notes) => {
    setLoadingAction(`notes-${appointmentId}`)
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          technician_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('ðŸ“ Technician notes added successfully')
      setTechnicianNotes('')

      // Update selected appointment if it's open
      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment(prev => ({ ...prev, technician_notes: notes }))
      }

      fetchAllData()

    } catch (error) {
      console.error('Error adding notes:', error)
      toast.error('Failed to add technician notes')
    } finally {
      setLoadingAction('')
    }
  }

  const deleteAppointment = async (appointmentId) => {
    if (!confirm('âš ï¸ Are you sure you want to DELETE this appointment?\\n\\nThis action CANNOT be undone and will permanently remove:\\nâ€¢ Appointment details\\nâ€¢ Payment information\\nâ€¢ Technician notes\\n\\nType "DELETE" to confirm:')) {
      return
    }

    const confirmText = prompt('Type "DELETE" to confirm permanent deletion:')
    if (confirmText !== 'DELETE') {
      toast.error('Deletion cancelled - incorrect confirmation')
      return
    }

    setLoadingAction(`delete-${appointmentId}`)

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('ðŸ—‘ï¸ Appointment permanently deleted')
      
      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment(null)
      }

      fetchAllData()

    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Failed to delete appointment')
    } finally {
      setLoadingAction('')
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        toast.success('ðŸ”” Browser notifications enabled!')
        
        // Test notification
        setTimeout(() => {
          new Notification('Test Notification ðŸ§ª', {
            body: 'You will now receive real-time appointment notifications!',
            icon: '/favicon.ico'
          })
        }, 1000)
        
      } else {
        toast.error('âŒ Browser notifications denied')
      }
    } else {
      toast.error('âŒ Browser notifications not supported')
    }
  }

  const exportAppointments = () => {
    try {
      const csvData = filteredAppointments.map(apt => ({
        'Booking ID': apt.id,
        'Customer Email': apt.user_email || 'N/A',
        'Customer Name': apt.user_name || 'N/A',
        'Phone': `+91-${apt.phone}`,
        'Service Type': apt.service_type,
        'Description': apt.description?.replace(/"/g, '""') || 'N/A', // Escape quotes
        'Address': `"${apt.address}, ${apt.city} - ${apt.pincode}"`,
        'Preferred Date': apt.preferred_date,
        'Preferred Time': apt.preferred_time,
        'Status': apt.status,
        'Payment Status': apt.payment_status,
        'Service Price': apt.service_price || 'N/A',
        'Created At': new Date(apt.created_at).toLocaleString('en-IN'),
        'Updated At': apt.updated_at ? new Date(apt.updated_at).toLocaleString('en-IN') : 'N/A',
        'Technician Notes': apt.technician_notes?.replace(/"/g, '""') || 'N/A'
      }))

      const headers = Object.keys(csvData[0])
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value}"` 
              : value
          ).join(',')
        )
      ].join('\\n')

      // Add BOM for proper UTF-8 encoding
      const BOM = '\\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `computer-world-appointments-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`ðŸ“Š ${csvData.length} appointments exported to CSV`)
      
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export appointments')
    }
  }

  const sendPaymentReminder = async (appointment) => {
    setLoadingAction(`payment-${appointment.id}`)
    
    try {
      const servicePrice = appointment.service_price || 1000 // Default price if not set
      const advanceAmount = Math.round(servicePrice * 0.3) // 30% advance
      
      const message = `ðŸ’° *Payment Reminder - Computer World*\\n\\nService: ${appointment.service_type}\\nBooking ID: ${getShortId(appointment.id)}...\\n\\nTotal Amount: â‚¹${servicePrice}\\nAdvance Payment: â‚¹${advanceAmount}\\n\\nPay online: https://computerworld.up.railway.app/dashboard\\n\\nCall: +91-93162 56101`

      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          phoneNumber: `91${appointment.phone}`
        })
      })

      toast.success('ðŸ“± Payment reminder sent via WhatsApp')
      
    } catch (error) {
      console.error('Payment reminder error:', error)
      toast.error('Failed to send payment reminder')
    } finally {
      setLoadingAction('')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getUrgencyIndicator = (appointment) => {
    const createdDate = new Date(appointment.created_at)
    const hoursAgo = (new Date() - createdDate) / (1000 * 60 * 60)
    
    if (appointment.status === 'pending' && hoursAgo > 24) {
      return { level: 'high', text: 'Urgent!', color: 'text-red-600' }
    } else if (appointment.status === 'pending' && hoursAgo > 4) {
      return { level: 'medium', text: 'Follow-up', color: 'text-orange-600' }
    }
    return null
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hours ago`
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return formatDate(dateString)
  }

  // Filter appointments based on status, payment, and search
  const filteredAppointments = allAppointments.filter(appointment => {
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus
    const matchesPayment = filterPayment === 'all' || appointment.payment_status === filterPayment
    const matchesSearch = !searchTerm || 
      appointment.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.phone?.includes(searchTerm) ||
      appointment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.id?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesPayment && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">Loading Admin Dashboard</h2>
          <p className="text-gray-600 dark:text-dark-text">Initializing real-time monitoring...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-8xl mb-6">ðŸ”’</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">You don't have permission to access the admin dashboard. Please contact the administrator if you believe this is an error.</p>
          <div className="space-y-4">
            <Link href="/" className="block bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg transition-colors font-medium">
              Go to Homepage
            </Link>
            <Link href="/login" className="block border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors font-medium">
              Try Different Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white dark:bg-dark-card shadow-sm border-b border-gray-200 dark:border-dark-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-yellow-500 dark:bg-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">CW</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-dark-text">COMPUTER WORLD</h1>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 -mt-1">Admin Dashboard</p>
                </div>
              </Link>
              
              {/* Live Status Indicator */}
              <div className="hidden md:flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-700 dark:text-green-300 font-medium">Live Monitoring</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={requestNotificationPermission}
                className="hidden md:block text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors text-sm bg-gray-100 dark:bg-dark-bg px-3 py-2 rounded-lg font-medium"
              >
                ðŸ”” Enable Alerts
              </button>
              <DarkModeToggle />
              <Link href="/dashboard" className="text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors hidden md:block">
                User View
              </Link>
              <Link href="/" className="text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                Homepage
              </Link>
              <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg">
                <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                  Admin: {user.email?.split('@')[0]}
                </span>
                <div className="w-6 h-6 bg-yellow-500 dark:bg-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6 mb-8">
          {[
            { 
              title: 'Total Appointments', 
              value: stats.totalAppointments, 
              icon: 'ðŸ“‹', 
              color: 'blue', 
              change: `+${stats.todayAppointments} today`,
              trend: stats.todayAppointments > 0 ? 'up' : 'neutral'
            },
            { 
              title: 'Pending', 
              value: stats.pending, 
              icon: 'â³', 
              color: 'yellow', 
              urgent: stats.pending > 5,
              change: stats.pending > 0 ? 'Needs attention' : 'All clear'
            },
            { 
              title: 'In Progress', 
              value: stats.inProgress, 
              icon: 'ðŸ”§', 
              color: 'blue',
              change: 'Active services'
            },
            { 
              title: 'Completed', 
              value: stats.completed, 
              icon: 'âœ…', 
              color: 'green',
              change: `${stats.completionRate}% completion rate`
            },
            { 
              title: 'Revenue', 
              value: formatCurrency(stats.totalRevenue), 
              icon: 'ðŸ’°', 
              color: 'green',
              change: `${formatCurrency(stats.thisMonthRevenue)} this month`
            },
            { 
              title: 'Users', 
              value: stats.totalUsers, 
              icon: 'ðŸ‘¥', 
              color: 'purple',
              change: 'Registered customers'
            }
          ].map((stat, index) => (
            <div key={index} className={`bg-white dark:bg-dark-card p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition-shadow ${stat.urgent ? 'ring-2 ring-yellow-500 ring-opacity-50 animate-pulse' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 font-medium">{stat.title}</p>
                  <p className="text-xl lg:text-3xl font-bold text-gray-900 dark:text-dark-text mt-1">{stat.value}</p>
                  {stat.change && (
                    <p className={`text-xs mt-1 ${
                      stat.trend === 'up' ? 'text-green-600 dark:text-green-400' : 
                      stat.urgent ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className="text-2xl lg:text-3xl opacity-80">{stat.icon}</div>
              </div>
              {stat.urgent && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                  âš ï¸ Requires immediate attention
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Enhanced Quick Actions */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <button
              onClick={() => setActiveTab('appointments')}
              className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium relative"
            >
              ðŸ“‹ Appointments
              {stats.pending > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {stats.pending}
                </span>
              )}
            </button>
            <button
              onClick={exportAppointments}
              className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-medium"
            >
              ðŸ“Š Export ({filteredAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-3 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-sm font-medium"
            >
              ðŸ“ˆ Analytics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-4 py-3 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-sm font-medium"
            >
              ðŸ‘¥ Users ({stats.totalUsers})
            </button>
            <a
              href="tel:+919316256101"
              className="bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors text-sm font-medium text-center"
            >
              ðŸ“ž Call Owner
            </a>
            <button
              onClick={fetchAllData}
              className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-sm font-medium"
            >
              ðŸ”„ Refresh
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-4 py-3 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-sm font-medium"
            >
              ðŸ’³ Payments
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border mb-8">
          <div className="border-b border-gray-200 dark:border-dark-border">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {[
                { id: 'overview', name: 'Overview', icon: 'ðŸ“Š' },
                { id: 'appointments', name: 'Appointments', icon: 'ðŸ“‹', badge: stats.pending > 0 ? stats.pending : null },
                { id: 'users', name: 'Users', icon: 'ðŸ‘¥', count: stats.totalUsers },
                { id: 'analytics', name: 'Analytics', icon: 'ðŸ“ˆ' },
                { id: 'payments', name: 'Payments', icon: 'ðŸ’³', count: stats.paidAppointments }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap relative transition-colors ${
                    activeTab === tab.id
                      ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                  {tab.count > 0 && (
                    <span className="text-xs text-gray-400">({tab.count})</span>
                  )}
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-4">Welcome to Admin Dashboard</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">Real-time monitoring and management for Computer World business operations.</p>
                </div>

                {/* Business Status Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* System Status */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">System Status</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-400">Database</span>
                        <span className="text-green-800 dark:text-green-300 font-medium">âœ… Online</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-400">Real-time Updates</span>
                        <span className="text-green-800 dark:text-green-300 font-medium">âœ… Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-400">Payment Gateway</span>
                        <span className="text-green-800 dark:text-green-300 font-medium">âœ… InstaMojo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-400">Notifications</span>
                        <span className="text-green-800 dark:text-green-300 font-medium">âœ… WhatsApp</span>
                      </div>
                    </div>
                  </div>

                  {/* Today's Summary */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-2xl">ðŸ“…</span>
                      <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Today's Activity</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-800 dark:text-blue-300">{stats.todayAppointments}</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">New Appointments</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-blue-800 dark:text-blue-300">{stats.pending}</div>
                          <div className="text-blue-600 dark:text-blue-400">Pending</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-blue-800 dark:text-blue-300">{stats.inProgress}</div>
                          <div className="text-blue-600 dark:text-blue-400">Active</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Overview */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-2xl">ðŸ’°</span>
                      <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Revenue</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                          {formatCurrency(stats.totalRevenue)}
                        </div>
                        <div className="text-sm text-purple-600 dark:text-purple-400">Total Earned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                          {formatCurrency(stats.thisMonthRevenue)}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">This Month</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Appointments */}
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text">Recent Appointments</h3>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium text-sm bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-lg transition-colors"
                    >
                      View All ({allAppointments.length}) â†’
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {recentAppointments.length === 0 ? (
                      <div className="col-span-2 text-center py-12">
                        <div className="text-6xl mb-4">ðŸ“‹</div>
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">No appointments yet</h4>
                        <p className="text-gray-500 dark:text-gray-400">New appointments will appear here automatically.</p>
                      </div>
                    ) : (
                      recentAppointments.slice(0, 8).map(appointment => {
                        const urgency = getUrgencyIndicator(appointment)
                        return (
                          <div key={appointment.id} className={`bg-gray-50 dark:bg-dark-bg p-6 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer border-l-4 ${
                            urgency?.level === 'high' ? 'border-red-500' :
                            urgency?.level === 'medium' ? 'border-orange-500' :
                            appointment.status === 'completed' ? 'border-green-500' :
                            appointment.status === 'in-progress' ? 'border-blue-500' :
                            'border-gray-300 dark:border-gray-600'
                          }`} onClick={() => setSelectedAppointment(appointment)}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-dark-text text-lg">{appointment.service_type}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {appointment.user_email} â€¢ +91-{appointment.phone}
                                </p>
                              </div>
                              {urgency && (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${urgency.color} bg-red-50 dark:bg-red-900/20`}>
                                  {urgency.text}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">ðŸ“… Date:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-dark-text">{appointment.preferred_date}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">â° Time:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-dark-text">{appointment.preferred_time}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                  {appointment.status}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(appointment.payment_status)}`}>
                                  {appointment.payment_status}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatRelativeTime(appointment.created_at)}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">All Appointments Management</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      Showing {filteredAppointments.length} of {allAppointments.length} appointments
                    </p>
                  </div>
                  
                  {/* Enhanced Filters */}
                  <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                    <input
                      type="text"
                      placeholder="Search by service, phone, email, city, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-yellow-500 focus:border-transparent min-w-[300px]"
                    />
                    
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending ({stats.pending})</option>
                      <option value="in-progress">In Progress ({stats.inProgress})</option>
                      <option value="completed">Completed ({stats.completed})</option>
                      <option value="cancelled">Cancelled ({stats.cancelled})</option>
                    </select>

                    <select
                      value={filterPayment}
                      onChange={(e) => setFilterPayment(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="all">All Payments</option>
                      <option value="paid">Paid ({stats.paidAppointments})</option>
                      <option value="pending">Pending ({stats.unpaidAppointments})</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                {/* Appointments Table */}
                <div className="bg-white dark:bg-dark-card rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-dark-border">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                      <thead className="bg-gray-50 dark:bg-dark-bg">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service & Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact & Location</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                        {filteredAppointments.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                              <div className="text-6xl mb-4">ðŸ“‹</div>
                              <h4 className="text-lg font-semibold mb-2">No appointments found</h4>
                              <p className="text-sm">
                                {searchTerm || filterStatus !== 'all' || filterPayment !== 'all'
                                  ? 'Try adjusting your search criteria'
                                  : 'New appointments will appear here automatically'
                                }
                              </p>
                              {(searchTerm || filterStatus !== 'all' || filterPayment !== 'all') && (
                                <button
                                  onClick={() => {
                                    setSearchTerm('')
                                    setFilterStatus('all')
                                    setFilterPayment('all')
                                  }}
                                  className="mt-4 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium text-sm bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-lg transition-colors"
                                >
                                  Clear All Filters
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          filteredAppointments.map(appointment => {
                            const urgency = getUrgencyIndicator(appointment)
                            return (
                              <tr key={appointment.id} className={`hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors ${urgency?.level === 'high' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                <td className="px-6 py-4">
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                                        <span className="text-yellow-600 dark:text-yellow-400 font-bold text-sm">
                                          {appointment.service_type?.charAt(0) || 'S'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
                                          {appointment.service_type}
                                        </p>
                                        {urgency && (
                                          <span className={`text-xs font-medium px-2 py-1 rounded ${urgency.color} bg-red-50 dark:bg-red-900/20`}>
                                            {urgency.text}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {appointment.user_email || 'No email'}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                        {appointment.description?.substring(0, 60)}...
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium text-gray-900 dark:text-dark-text">
                                        +91-{appointment.phone}
                                      </span>
                                      <div className="flex space-x-1">
                                        <a
                                          href={`tel:+91${appointment.phone}`}
                                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs p-1 rounded"
                                        >
                                          ðŸ“ž
                                        </a>
                                        <a
                                          href={`https://wa.me/91${appointment.phone}?text=Hi, regarding your Computer World appointment ${getShortId(appointment.id)}...`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs p-1 rounded"
                                        >
                                          ðŸ’¬
                                        </a>
                                      </div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                                      {appointment.city} - {appointment.pincode}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm">
                                    <p className="font-medium text-gray-900 dark:text-dark-text">
                                      {appointment.preferred_date}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400">
                                      {appointment.preferred_time}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatRelativeTime(appointment.created_at)}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col space-y-2">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                                      {appointment.status}
                                    </span>
                                    {appointment.technician_notes && (
                                      <div className="text-xs text-blue-600 dark:text-blue-400">
                                        ðŸ“ Has notes
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col space-y-2">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(appointment.payment_status)}`}>
                                      {appointment.payment_status}
                                    </span>
                                    {appointment.service_price && (
                                      <div className="text-xs font-medium text-gray-900 dark:text-dark-text">
                                        {formatCurrency(appointment.service_price)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                                                <td className="px-6 py-4">
                                  <div className="flex flex-col space-y-1">
                                    <button
                                      onClick={() => setSelectedAppointment(appointment)}
                                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded transition-colors"
                                    >
                                      ðŸ“‹ View Details
                                    </button>
                                    
                                    <div className="flex space-x-1">
                                      <select
                                        value={appointment.status}
                                        onChange={(e) => updateAppointmentStatus(appointment.id, e.target.value)}
                                        disabled={loadingAction === `status-${appointment.id}`}
                                        className="text-xs border border-gray-300 dark:border-dark-border rounded px-2 py-1 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-1 focus:ring-yellow-500"
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                      </select>
                                      
                                      {appointment.payment_status === 'pending' && (
                                        <button
                                          onClick={() => sendPaymentReminder(appointment)}
                                          disabled={loadingAction === `payment-${appointment.id}`}
                                          className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                          title="Send payment reminder"
                                        >
                                          ðŸ’°
                                        </button>
                                      )}
                                      
                                      <button
                                        onClick={() => deleteAppointment(appointment.id)}
                                        disabled={loadingAction === `delete-${appointment.id}`}
                                        className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                        title="Delete appointment"
                                      >
                                        ðŸ—‘ï¸
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Customer Management</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      {allUsers.length} registered customers
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allUsers.length === 0 ? (
                    <div className="col-span-3 text-center py-12">
                      <div className="text-6xl mb-4">ðŸ‘¥</div>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">No customers yet</h4>
                      <p className="text-gray-500 dark:text-gray-400">Customer data will appear here as appointments are created.</p>
                    </div>
                  ) : (
                    allUsers.map(user => (
                      <div key={user.id} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                              {user.full_name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">+91-{user.phone}</p>
                          </div>
                          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                            <span className="text-yellow-600 dark:text-yellow-400 font-bold">
                              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Appointments:</span>
                            <span className="ml-1 font-medium text-gray-900 dark:text-dark-text">
                              {user.appointment_count}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Total Spent:</span>
                            <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(user.total_spent)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                          Joined {formatDate(user.created_at)}
                        </div>
                        
                        <div className="mt-4 flex space-x-2">
                          <a
                            href={`tel:+91${user.phone}`}
                            className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-center py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-medium"
                          >
                            ðŸ“ž Call
                          </a>
                          <a
                            href={`https://wa.me/91${user.phone}?text=Hi ${user.full_name}, thank you for choosing Computer World!`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-center py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
                          >
                            ðŸ’¬ WhatsApp
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">Business Analytics</h2>
                  <p className="text-gray-600 dark:text-gray-300">Detailed insights and performance metrics</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Service Distribution */}
                  <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Service Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(
                        allAppointments.reduce((acc, apt) => {
                          acc[apt.service_type] = (acc[apt.service_type] || 0) + 1
                          return acc
                        }, {})
                      )
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([service, count]) => {
                          const percentage = (count / allAppointments.length * 100).toFixed(1)
                          return (
                            <div key={service} className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900 dark:text-dark-text">{service}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">{count} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-yellow-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>

                  {/* Monthly Trends */}
                  <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Monthly Performance</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div>
                          <p className="text-sm text-green-700 dark:text-green-400">Completion Rate</p>
                          <p className="text-2xl font-bold text-green-800 dark:text-green-300">{stats.completionRate}%</p>
                        </div>
                        <div className="text-3xl">âœ…</div>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div>
                          <p className="text-sm text-blue-700 dark:text-blue-400">Average Response Time</p>
                          <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">< 2 hrs</p>
                        </div>
                        <div className="text-3xl">âš¡</div>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div>
                          <p className="text-sm text-purple-700 dark:text-purple-400">Customer Retention</p>
                          <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                            {((allUsers.filter(u => u.appointment_count > 1).length / allUsers.length) * 100 || 0).toFixed(0)}%
                          </p>
                        </div>
                        <div className="text-3xl">ðŸ”„</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Payment Management</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      {stats.paidAppointments} paid, {stats.unpaidAppointments} pending
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-700 dark:text-green-400 text-sm font-medium">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                          {formatCurrency(stats.totalRevenue)}
                        </p>
                      </div>
                      <div className="text-3xl">ðŸ’°</div>
                    </div>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-700 dark:text-orange-400 text-sm font-medium">Pending Payments</p>
                        <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">
                          {stats.unpaidAppointments}
                        </p>
                      </div>
                      <div className="text-3xl">â³</div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-700 dark:text-blue-400 text-sm font-medium">This Month</p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                          {formatCurrency(stats.thisMonthRevenue)}
                        </p>
                      </div>
                      <div className="text-3xl">ðŸ“Š</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-dark-border">
                  <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Payment Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                      <thead className="bg-gray-50 dark:bg-dark-bg">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                        {allAppointments
                          .filter(apt => apt.service_price > 0 || apt.payment_status !== 'pending')
                          .map(appointment => (
                            <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                  {appointment.service_type}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  ID: {getShortId(appointment.id)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-dark-text">
                                  {appointment.user_email}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  +91-{appointment.phone}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-dark-text">
                                {appointment.service_price ? formatCurrency(appointment.service_price) : 'Not set'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(appointment.payment_status)}`}>
                                  {appointment.payment_status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(appointment.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {appointment.payment_status === 'pending' && (
                                  <button
                                    onClick={() => sendPaymentReminder(appointment)}
                                    disabled={loadingAction === `payment-${appointment.id}`}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 text-xs"
                                  >
                                    ðŸ’¬ Send Reminder
                                  </button>
                                )}
                                {appointment.payment_status === 'paid' && (
                                  <span className="text-green-600 dark:text-green-400 text-xs">âœ… Completed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                  Appointment Details
                </h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl"
                >
                  Ã—
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ID: {selectedAppointment.id} â€¢ Created {formatRelativeTime(selectedAppointment.created_at)}
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Service Information */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-2">Service Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Service Type:</span>
                    <p className="font-medium text-gray-900 dark:text-dark-text">{selectedAppointment.service_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <p className={`font-medium ${getStatusColor(selectedAppointment.status)} inline-block px-2 py-1 rounded mt-1`}>
                      {selectedAppointment.status}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-gray-600 dark:text-gray-400">Description:</span>
                  <p className="font-medium text-gray-900 dark:text-dark-text mt-1">{selectedAppointment.description}</p>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-2">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <p className="font-medium text-gray-900 dark:text-dark-text">{selectedAppointment.user_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <p className="font-medium text-gray-900 dark:text-dark-text">{selectedAppointment.user_email || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 dark:text-dark-text">+91-{selectedAppointment.phone}</p>
                      <a
                        href={`tel:+91${selectedAppointment.phone}`}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"
                      >
                        ðŸ“ž
                      </a>
                      <a
                        href={`https://wa.me/91${selectedAppointment.phone}?text=Hi, regarding your Computer World appointment ${getShortId(selectedAppointment.id)}...`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"
                      >
                        ðŸ’¬
                      </a>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Payment Status:</span>
                    <p className={`font-medium ${getPaymentStatusColor(selectedAppointment.payment_status)} inline-block px-2 py-1 rounded mt-1`}>
                      {selectedAppointment.payment_status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Schedule */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-2">Location & Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Complete Address:</span>
                    <p className="font-medium text-gray-900 dark:text-dark-text">
                      {selectedAppointment.address}, {selectedAppointment.city} - {selectedAppointment.pincode}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedAppointment.address}, ${selectedAppointment.city}, ${selectedAppointment.pincode}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg transition-colors"
                    >
                      ðŸ—ºï¸ Open in Maps
                    </a>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Preferred Date:</span>
                      <p className="font-medium text-gray-900 dark:text-dark-text">{selectedAppointment.preferred_date}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Preferred Time:</span>
                      <p className="font-medium text-gray-900 dark:text-dark-text">{selectedAppointment.preferred_time}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technician Notes */}
              <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-2">Technician Notes</h3>
                {selectedAppointment.technician_notes ? (
                  <div className="bg-white dark:bg-dark-card p-3 rounded border border-gray-200 dark:border-dark-border mb-3">
                    <p className="text-sm text-gray-900 dark:text-dark-text">{selectedAppointment.technician_notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No notes added yet.</p>
                )}
                
                <div className="flex space-x-2">
                  <textarea
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    placeholder="Add technician notes..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                    rows="3"
                  />
                  <button
                    onClick={() => addTechnicianNotes(selectedAppointment.id, technicianNotes)}
                    disabled={!technicianNotes.trim() || loadingAction === `notes-${selectedAppointment.id}`}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {loadingAction === `notes-${selectedAppointment.id}` ? '...' : 'Add Note'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedAppointment.status}
                  onChange={(e) => updateAppointmentStatus(selectedAppointment.id, e.target.value)}
                  disabled={loadingAction === `status-${selectedAppointment.id}`}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                
                {selectedAppointment.payment_status === 'pending' && (
                  <button
                    onClick={() => sendPaymentReminder(selectedAppointment)}
                    disabled={loadingAction === `payment-${selectedAppointment.id}`}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    ðŸ’° Send Payment Reminder
                  </button>
                )}
                
                <button
                  onClick={() => deleteAppointment(selectedAppointment.id)}
                  disabled={loadingAction === `delete-${selectedAppointment.id}`}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  ðŸ—‘ï¸ Delete Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
