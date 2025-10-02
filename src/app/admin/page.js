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
              user_email: userData?.user?.email || 'No email',
              user_name: userData?.user?.user_metadata?.full_name || userData?.user?.email?.split('@')[0] || 'No name'
            }
          } catch {
            // If auth.admin is not available, use placeholder data
            return {
              ...apt,
              user_email: `user-${apt.user_id.substring(0, 8)}@registered.com`,
              user_name: `Customer ${apt.phone}`
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
      // Try user_profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!profilesError && profiles && profiles.length > 0) {
        setAllUsers(profiles)
        setStats(prev => ({ ...prev, totalUsers: profiles.length }))
        return
      }

      // Fallback: Extract unique users from appointments
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
            toast.success('🔔 New appointment received!', {
              description: `Service: ${payload.new.service_type} • Phone: +91-${payload.new.phone}`,
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
              new Notification('New Computer World Appointment! 🔧', {
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
            toast.info('📝 Appointment updated', {
              description: `Status: ${payload.new.status} • Payment: ${payload.new.payment_status}`,
              duration: 4000
            })
          } else if (payload.eventType === 'DELETE') {
            toast.error('🗑️ Appointment deleted', { duration: 3000 })
          }
          
          // Refresh data after any change
          fetchAllData()
        }
      )
      .subscribe()

    // Subscribe to user profile changes
    const usersSubscription = supabase
      .channel('admin-user-profiles')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'user_profiles' }, 
        (payload) => {
          console.log('New user registered:', payload)
          toast.success('👤 New user registered!', {
            description: `Email: ${payload.new.email}`,
            duration: 5000
          })
          fetchAllData()
        }
      )
      .subscribe()

    return () => {
      appointmentsSubscription.unsubscribe()
      usersSubscription.unsubscribe()
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

      toast.success(`✅ Appointment status updated to ${newStatus}`)
      
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
            'completed': 'Your computer service has been completed successfully! ✅',
            'cancelled': 'Your appointment has been cancelled. Contact us for rescheduling.'
          }

          await fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `🔧 *Computer World Update*\n\n${statusMessages[newStatus]}\n\nService: ${appointment.service_type}\nBooking ID: ${appointmentId.substring(0, 8)}...\n\nFor queries: +91-93162 56101`,
              phoneNumber: `91${appointment.phone}`
            })
          })
          
          toast.success('📱 Customer notified via WhatsApp')
          
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

      toast.success('📝 Technician notes added successfully')
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
    if (!confirm('⚠️ Are you sure you want to DELETE this appointment?\n\nThis action CANNOT be undone and will permanently remove:\n• Appointment details\n• Payment information\n• Technician notes\n\nType "DELETE" to confirm:')) {
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

      toast.success('🗑️ Appointment permanently deleted')
      
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
        toast.success('🔔 Browser notifications enabled!')
        
        // Test notification
        setTimeout(() => {
          new Notification('Test Notification 🧪', {
            body: 'You will now receive real-time appointment notifications!',
            icon: '/favicon.ico'
          })
        }, 1000)
        
      } else {
        toast.error('❌ Browser notifications denied')
      }
    } else {
      toast.error('❌ Browser notifications not supported')
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
        'Advance Payment': apt.advance_payment || 'N/A',
        'Payment Method': apt.payment_method || 'N/A',
        'Payment Date': apt.payment_date ? new Date(apt.payment_date).toLocaleString('en-IN') : 'N/A',
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
      ].join('\n')

      // Add BOM for proper UTF-8 encoding
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `computer-world-appointments-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`📊 ${csvData.length} appointments exported to CSV`)
      
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
      
      const message = `💰 *Payment Reminder - Computer World*\n\nService: ${appointment.service_type}\nBooking ID: ${appointment.id.toString().substring(0, 8)}...\n\nTotal Amount: ₹${servicePrice}\nAdvance Payment: ₹${advanceAmount}\n\nPay online: https://computerworld.up.railway.app/dashboard\n\nCall: +91-93162 56101`

      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          phoneNumber: `91${appointment.phone}`
        })
      })

      toast.success('📱 Payment reminder sent via WhatsApp')
      
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
      appointment.id?.toLowerCase().includes(searchTerm.toLowerCase())
    
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
          <div className="text-8xl mb-6">🔒</div>
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
                🔔 Enable Alerts
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
              icon: '📋', 
              color: 'blue', 
              change: `+${stats.todayAppointments} today`,
              trend: stats.todayAppointments > 0 ? 'up' : 'neutral'
            },
            { 
              title: 'Pending', 
              value: stats.pending, 
              icon: '⏳', 
              color: 'yellow', 
              urgent: stats.pending > 5,
              change: stats.pending > 0 ? 'Needs attention' : 'All clear'
            },
            { 
              title: 'In Progress', 
              value: stats.inProgress, 
              icon: '🔧', 
              color: 'blue',
              change: 'Active services'
            },
            { 
              title: 'Completed', 
              value: stats.completed, 
              icon: '✅', 
              color: 'green',
              change: `${stats.completionRate}% completion rate`
            },
            { 
              title: 'Revenue', 
              value: formatCurrency(stats.totalRevenue), 
              icon: '💰', 
              color: 'green',
              change: `${formatCurrency(stats.thisMonthRevenue)} this month`
            },
            { 
              title: 'Users', 
              value: stats.totalUsers, 
              icon: '👥', 
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
                  ⚠️ Requires immediate attention
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
              📋 Appointments
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
              📊 Export ({filteredAppointments.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-3 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-sm font-medium"
            >
              📈 Analytics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-4 py-3 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-sm font-medium"
            >
              👥 Users ({stats.totalUsers})
            </button>
            <a
              href="tel:+919316256101"
              className="bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors text-sm font-medium text-center"
            >
              📞 Call Owner
            </a>
            <button
              onClick={fetchAllData}
              className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-sm font-medium"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-4 py-3 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-sm font-medium"
            >
              💳 Payments
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border mb-8">
          <div className="border-b border-gray-200 dark:border-dark-border">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'appointments', name: 'Appointments', icon: '📋', badge: stats.pending > 0 ? stats.pending : null },
                { id: 'users', name: 'Users', icon: '👥', count: stats.totalUsers },
                { id: 'analytics', name: 'Analytics', icon: '📈' },
                { id: 'payments', name: 'Payments', icon: '💳', count: stats.paidAppointments }
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
                        <span className="text-green-800 dark:text-green-300 font-medium">✅ Online</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-400">Real-time Updates</span>
                        <span className="text-green-800 dark:text-green-300 font-medium">✅ Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-400">Payment Gateway</span>
                        <span className="text-green-800 dark:text-green-300 font-medium">✅ InstaMojo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-400">Notifications</span>
                        <span className="text-green-800 dark:text-green-300 font-medium">✅ WhatsApp</span>
                      </div>
                    </div>
                  </div>

                  {/* Today's Summary */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-2xl">📅</span>
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
                      <span className="text-2xl">💰</span>
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
                      View All ({allAppointments.length}) →
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {recentAppointments.length === 0 ? (
                      <div className="col-span-2 text-center py-12">
                        <div className="text-6xl mb-4">📋</div>
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
                                  {appointment.user_email} • +91-{appointment.phone}
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
                                <span className="text-gray-500 dark:text-gray-400">📅 Date:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-dark-text">{appointment.preferred_date}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">⏰ Time:</span>
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
                              <div className="text-6xl mb-4">📋</div>
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
                                          📞
                                        </a>
                                        <a
                                          href={`https://wa.me/91${appointment.phone}?text=Hi, regarding your Computer World appointment ${appointment.id.toString().substring(0, 8)}...`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-xs p-1 rounded"
                                        >
                                          💬
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
                                        📝 Has notes
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
                                    {appointment.advance_payment && (
                                      <div className="text-xs text-green-600 dark:text-green-400">
                                        Advance: {formatCurrency(appointment.advance_payment)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col space-y-2">
                                    <button
                                      onClick={() => setSelectedAppointment(appointment)}
                                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium text-sm text-left"
                                    >
                                      View Details
                                    </button>
                                    
                                    {appointment.status === 'pending' && (
                                      <button
                                        onClick={() => updateAppointmentStatus(appointment.id, 'in-progress')}
                                        disabled={loadingAction === `status-${appointment.id}`}
                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm text-left disabled:opacity-50"
                                      >
                                        {loadingAction === `status-${appointment.id}` ? '⏳ Starting...' : '🔧 Start Service'}
                                      </button>
                                    )}
                                    
                                    {appointment.status === 'in-progress' && (
                                      <button
                                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                        disabled={loadingAction === `status-${appointment.id}`}
                                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 font-medium text-sm text-left disabled:opacity-50"
                                      >
                                        {loadingAction === `status-${appointment.id}` ? '⏳ Completing...' : '✅ Complete'}
                                      </button>
                                    )}
                                    
                                    {appointment.payment_status === 'pending' && (
                                      <button
                                        onClick={() => sendPaymentReminder(appointment)}
                                        disabled={loadingAction === `payment-${appointment.id}`}
                                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 font-medium text-sm text-left disabled:opacity-50"
                                      >
                                        {loadingAction === `payment-${appointment.id}` ? '⏳ Sending...' : '💳 Payment Link'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Table Footer */}
                  {filteredAppointments.length > 0 && (
                    <div className="bg-gray-50 dark:bg-dark-bg px-6 py-3 border-t border-gray-200 dark:border-dark-border">
                      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          Showing {filteredAppointments.length} of {allAppointments.length} appointments
                        </span>
                        <button
                          onClick={exportAppointments}
                          className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium"
                        >
                          📊 Export Filtered Results ({filteredAppointments.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Registered Users</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      Total: {allUsers.length} registered customers
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Average appointments per user: {stats.totalUsers > 0 ? (stats.totalAppointments / stats.totalUsers).toFixed(1) : 0}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                      <div className="text-6xl mb-4">👥</div>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">No users found</h4>
                      <p className="text-gray-500 dark:text-gray-400">Users will appear here when they register and book appointments.</p>
                    </div>
                  ) : (
                    allUsers.map(user => {
                      const userAppointments = allAppointments.filter(apt => apt.user_id === user.id)
                      const completedAppointments = userAppointments.filter(apt => apt.status === 'completed')
                      const totalSpent = user.total_spent || completedAppointments.reduce((sum, apt) => sum + (parseFloat(apt.service_price) || 0), 0)
                      const lastAppointment = userAppointments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

                      return (
                        <div key={user.id} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-md">
                              <span className="text-white font-bold text-lg">
                                {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate">
                                {user.full_name || user.user_name || 'No Name Set'}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Member Since</p>
                              <p className="font-medium text-gray-900 dark:text-dark-text">
                                {formatDate(user.created_at).split(',')[0]}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Phone</p>
                              <p className="font-medium text-gray-900 dark:text-dark-text">
                                {user.phone ? `+91-${user.phone}` : 'Not provided'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Appointments</p>
                              <div className="flex items-center space-x-1">
                                <p className="font-medium text-gray-900 dark:text-dark-text">
                                  {user.appointment_count || userAppointments.length}
                                </p>
                                <span className="text-xs text-gray-400">
                                  ({completedAppointments.length} completed)
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Total Spent</p>
                              <p className="font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(totalSpent)}
                              </p>
                            </div>
                          </div>

                          {lastAppointment && (
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Service</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                {lastAppointment.service_type}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatRelativeTime(lastAppointment.created_at)}
                              </p>
                            </div>
                          )}

                          {user.phone && (
                            <div className="flex space-x-2">
                              <a
                                href={`tel:+91${user.phone}`}
                                className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                              >
                                📞 Call
                              </a>
                              <a
                                href={`https://wa.me/91${user.phone}?text=Hi! This is Computer World. We appreciate your business and wanted to check if you need any technical support.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-medium text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Business Analytics & Insights</h2>
                
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Completion Rate</h3>
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-200 mb-2">
                      {stats.completionRate}%
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {stats.completed} of {stats.totalAppointments} appointments completed
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Average Revenue</h3>
                      <span className="text-2xl">💰</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-200 mb-2">
                      {stats.paidAppointments > 0 ? formatCurrency(stats.totalRevenue / stats.paidAppointments) : '₹0'}
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Per completed service
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Customer Retention</h3>
                      <span className="text-2xl">🔄</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-900 dark:text-purple-200 mb-2">
                      {stats.totalUsers > 0 ? Math.round((stats.totalAppointments / stats.totalUsers) * 100) / 100 : 0}x
                    </div>
                    <p className="text-sm text-purple-700 dark:text-purple-400">
                      Average appointments per user
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300">Monthly Growth</h3>
                      <span className="text-2xl">📈</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-900 dark:text-orange-200 mb-2">
                      {formatCurrency(stats.thisMonthRevenue)}
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-400">
                      This month's revenue
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Service Breakdown */}
                  <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Service Breakdown</h3>
                    <div className="space-y-4">
                      {['Screen Replacement', 'Virus Removal', 'Hardware Repair', 'Data Recovery', 'Software Installation'].map(service => {
                        const count = allAppointments.filter(apt => apt.service_type === service).length
                        const percentage = allAppointments.length > 0 ? ((count / allAppointments.length) * 100) : 0
                        const revenue = allAppointments
                          .filter(apt => apt.service_type === service && apt.status === 'completed' && apt.payment_status === 'paid')
                          .reduce((sum, apt) => sum + (parseFloat(apt.service_price) || 0), 0)

                        return (
                          <div key={service}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{service}</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-dark-text">{count}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>{percentage.toFixed(1)}% of appointments</span>
                              <span>Revenue: {formatCurrency(revenue)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Status Distribution */}
                  <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Status Distribution</h3>
                    <div className="space-y-4">
                      {[
                        { status: 'pending', label: 'Pending', count: stats.pending, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
                        { status: 'in-progress', label: 'In Progress', count: stats.inProgress, color: 'bg-blue-500', textColor: 'text-blue-600' },
                        { status: 'completed', label: 'Completed', count: stats.completed, color: 'bg-green-500', textColor: 'text-green-600' },
                        { status: 'cancelled', label: 'Cancelled', count: stats.cancelled, color: 'bg-red-500', textColor: 'text-red-600' }
                      ].map(item => {
                        const percentage = stats.totalAppointments > 0 ? ((item.count / stats.totalAppointments) * 100) : 0
                        return (
                          <div key={item.status}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                              <span className={`text-sm font-bold ${item.textColor}`}>{item.count}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                              <div
                                className={`${item.color} h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {percentage.toFixed(1)}% of total appointments
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Payment Analytics */}
                  <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Payment Analytics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Total Revenue</span>
                        <span className="text-lg font-bold text-green-800 dark:text-green-300">
                          {formatCurrency(stats.totalRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Paid Appointments</span>
                        <span className="text-lg font-bold text-blue-800 dark:text-blue-300">
                          {stats.paidAppointments}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Pending Payments</span>
                        <span className="text-lg font-bold text-orange-800 dark:text-orange-300">
                          {stats.unpaidAppointments}
                        </span>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                            {stats.totalAppointments > 0 ? Math.round((stats.paidAppointments / stats.totalAppointments) * 100) : 0}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Payment Success Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Insights */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">💡 Business Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{stats.todayAppointments}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Today's New Bookings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Service Completion Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Customers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats.paidAppointments > 0 ? Math.round((stats.totalRevenue / stats.paidAppointments)) : 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Service Value (₹)</div>
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
                      InstaMojo Gateway • Same-day payouts enabled
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-700 dark:text-green-300 font-medium">Payment Gateway Active</span>
                  </div>
                </div>

                {/* Payment Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Revenue</p>
                        <p className="text-3xl font-bold text-green-800 dark:text-green-300">
                          {formatCurrency(stats.totalRevenue)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          From {stats.paidAppointments} paid services
                        </p>
                      </div>
                      <div className="text-3xl">💰</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">This Month</p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                          {formatCurrency(stats.thisMonthRevenue)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {Math.round((stats.thisMonthRevenue / (stats.totalRevenue || 1)) * 100)}% of total
                        </p>
                      </div>
                      <div className="text-3xl">📅</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Pending Payments</p>
                        <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">{stats.unpaidAppointments}</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Awaiting payment
                        </p>
                      </div>
                      <div className="text-3xl">⏳</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Success Rate</p>
                        <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                          {stats.totalAppointments > 0 ? Math.round((stats.paidAppointments / stats.totalAppointments) * 100) : 0}%
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          Payment completion
                        </p>
                      </div>
                      <div className="text-3xl">📊</div>
                    </div>
                  </div>
                </div>

                {/* Payment Transactions Table */}
                <div className="bg-white dark:bg-dark-card rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-dark-border">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Recent Payment Transactions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                      <thead className="bg-gray-50 dark:bg-dark-bg">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appointment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                        {allAppointments.filter(apt => apt.service_price || apt.payment_status !== 'pending').slice(0, 20).map(appointment => (
                          <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                  {appointment.service_type}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  ID: {appointment.id.toString().substring(0, 8)}...
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-dark-text">
                                {appointment.user_email || 'No email'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                +91-{appointment.phone}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                {appointment.service_price ? formatCurrency(appointment.service_price) : 'Not set'}
                              </div>
                              {appointment.advance_payment && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  Advance: {formatCurrency(appointment.advance_payment)}
                                </div>
                              )}
                              {appointment.payment_method && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Via: {appointment.payment_method}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(appointment.payment_status)}`}>
                                {appointment.payment_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                              {appointment.payment_date 
                                ? formatDate(appointment.payment_date)
                                : appointment.created_at ? formatDate(appointment.created_at) : 'N/A'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-y-1">
                              <button
                                onClick={() => setSelectedAppointment(appointment)}
                                className="block text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium"
                              >
                                View Details
                              </button>
                              {appointment.payment_status === 'pending' && (
                                <button
                                  onClick={() => sendPaymentReminder(appointment)}
                                  disabled={loadingAction === `payment-${appointment.id}`}
                                  className="block text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium disabled:opacity-50"
                                >
                                  {loadingAction === `payment-${appointment.id}` ? 'Sending...' : 'Send Payment Link'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {allAppointments.filter(apt => apt.service_price || apt.payment_status !== 'pending').length === 0 && (
                          <tr>
                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                              <div className="text-4xl mb-2">💳</div>
                              <p>No payment transactions yet</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && !showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Appointment Details</h2>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Service Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Service Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Service:</span>
                    <span className="text-gray-900 dark:text-dark-text font-semibold">{selectedAppointment.service_type}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Payment Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(selectedAppointment.payment_status)}`}>
                      {selectedAppointment.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Scheduled Date:</span>
                    <span className="text-gray-900 dark:text-dark-text font-semibold">{selectedAppointment.preferred_date}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Time Slot:</span>
                    <span className="text-gray-900 dark:text-dark-text font-semibold">{selectedAppointment.preferred_time}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Booking Date:</span>
                    <span className="text-gray-900 dark:text-dark-text">{formatDate(selectedAppointment.created_at)}</span>
                  </div>
                  {selectedAppointment.service_price && (
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="font-medium text-green-600 dark:text-green-400">Service Price:</span>
                      <span className="text-green-800 dark:text-green-300 font-bold text-lg">
                        {formatCurrency(selectedAppointment.service_price)}
                      </span>
                    </div>
                  )}
                  {selectedAppointment.advance_payment && (
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="font-medium text-blue-600 dark:text-blue-400">Advance Paid:</span>
                      <span className="text-blue-800 dark:text-blue-300 font-bold">
                        {formatCurrency(selectedAppointment.advance_payment)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-dark-text mb-3">Problem Description</h4>
                  <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedAppointment.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Customer Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Email:</span>
                    <span className="text-gray-900 dark:text-dark-text">{selectedAppointment.user_email || 'No email'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Name:</span>
                    <span className="text-gray-900 dark:text-dark-text">{selectedAppointment.user_name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Phone:</span>
                    <span className="text-gray-900 dark:text-dark-text font-semibold">+91-{selectedAppointment.phone}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">City:</span>
                    <span className="text-gray-900 dark:text-dark-text">{selectedAppointment.city}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <span className="font-medium text-gray-600 dark:text-gray-300">Pincode:</span>
                    <span className="text-gray-900 dark:text-dark-text">{selectedAppointment.pincode}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 dark:text-dark-text mb-3">Service Address</h4>
                  <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedAppointment.address}<br />
                      {selectedAppointment.city} - {selectedAppointment.pincode}, Gujarat
                    </p>
                  </div>
                </div>

                {/* Quick Contact Actions */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <a
                    href={`tel:+91${selectedAppointment.phone}`}
                    className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-center font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800"
                  >
                    📞 Call Customer
                  </a>
                  <a
                    href={`https://wa.me/91${selectedAppointment.phone}?text=Hi! This is Computer World regarding your ${selectedAppointment.service_type} appointment (ID: ${selectedappointment.id.toString().substring(0, 8)}). How can I assist you?`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg text-center font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Technician Notes Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Technician Notes & Updates</h3>
              
              {selectedAppointment.technician_notes && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">📝 Existing Notes:</h4>
                  <p className="text-blue-700 dark:text-blue-400 text-sm leading-relaxed">{selectedAppointment.technician_notes}</p>
                </div>
              )}

              <div className="flex gap-4">
                <textarea
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="Add technician notes (diagnosis, parts needed, estimated time, customer instructions, etc.)"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                  rows="3"
                />
                <button
                  onClick={() => {
                    if (technicianNotes.trim()) {
                      addTechnicianNotes(selectedAppointment.id, technicianNotes)
                    }
                  }}
                  disabled={!technicianNotes.trim() || loadingAction === `notes-${selectedAppointment.id}`}
                  className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingAction === `notes-${selectedAppointment.id}` ? 'Adding...' : 'Add Notes'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap gap-4 justify-center border-t border-gray-200 dark:border-dark-border pt-6">
              {/* Status Update Buttons */}
              {selectedAppointment.status === 'pending' && (
                <button
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, 'in-progress')}
                  disabled={loadingAction === `status-${selectedAppointment.id}`}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingAction === `status-${selectedAppointment.id}` ? '⏳ Starting Service...' : '🔧 Start Service'}
                </button>
              )}

              {selectedAppointment.status === 'in-progress' && (
                <button
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                  disabled={loadingAction === `status-${selectedAppointment.id}`}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingAction === `status-${selectedAppointment.id}` ? '⏳ Completing...' : '✅ Mark Completed'}
                </button>
              )}

              {['pending', 'in-progress'].includes(selectedAppointment.status) && (
                <button
                  onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                  disabled={loadingAction === `status-${selectedAppointment.id}`}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingAction === `status-${selectedAppointment.id}` ? '⏳ Cancelling...' : '❌ Cancel Appointment'}
                </button>
              )}

              {/* Payment Actions */}
              {selectedAppointment.payment_status === 'pending' && (
                <button
                  onClick={() => sendPaymentReminder(selectedAppointment)}
                  disabled={loadingAction === `payment-${selectedAppointment.id}`}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingAction === `payment-${selectedAppointment.id}` ? '⏳ Sending...' : '💳 Send Payment Reminder'}
                </button>
              )}

              {/* Communication Actions */}
              <a
                href={`mailto:${selectedAppointment.user_email}?subject=Computer World - Appointment ${selectedappointment.id.toString().substring(0, 8)}&body=Hi,%0D%0A%0D%0ARegarding your ${selectedAppointment.service_type} appointment scheduled for ${selectedAppointment.preferred_date} at ${selectedAppointment.preferred_time}.%0D%0A%0D%0ABest regards,%0D%0AComputer World Team%0D%0A+91-93162 56101`}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                target="_blank"
              >
                📧 Send Email
              </a>

              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(selectedAppointment.address + ', ' + selectedAppointment.city + ', ' + selectedAppointment.pincode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                📍 Open in Maps
              </a>

              {/* Danger Zone */}
              <div className="w-full border-t border-red-200 dark:border-red-800 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-red-600 dark:text-red-400 font-medium text-sm">Danger Zone</p>
                    <p className="text-red-500 dark:text-red-400 text-xs">Permanent actions cannot be undone</p>
                  </div>
                  <button
                    onClick={() => deleteAppointment(selectedAppointment.id)}
                    disabled={loadingAction === `delete-${selectedAppointment.id}`}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loadingAction === `delete-${selectedAppointment.id}` ? '⏳ Deleting...' : '🗑️ Delete Permanently'}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="w-full flex justify-center pt-4">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Payment Management</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Appointment Summary */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Appointment Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-yellow-700 dark:text-yellow-400">Service:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.service_type}</span>
                  </div>
                  <div>
                    <span className="text-yellow-700 dark:text-yellow-400">Customer:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.user_email}</span>
                  </div>
                  <div>
                    <span className="text-yellow-700 dark:text-yellow-400">Phone:</span>
                    <span className="ml-2 font-medium">+91-{selectedAppointment.phone}</span>
                  </div>
                  <div>
                    <span className="text-yellow-700 dark:text-yellow-400">Date:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.preferred_date}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className={`p-4 rounded-lg border ${
                selectedAppointment.payment_status === 'paid' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  selectedAppointment.payment_status === 'paid'
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-orange-800 dark:text-orange-300'
                }`}>
                  Payment Status: {selectedAppointment.payment_status.toUpperCase()}
                </h3>
                
                {selectedAppointment.service_price && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                      <span className="ml-2 font-bold text-lg">{formatCurrency(selectedAppointment.service_price)}</span>
                    </div>
                    {selectedAppointment.advance_payment && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Advance Paid:</span>
                        <span className="ml-2 font-bold text-green-600">{formatCurrency(selectedAppointment.advance_payment)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {selectedAppointment.payment_date && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Paid on: {formatDate(selectedAppointment.payment_date)}
                  </p>
                )}
              </div>

              {/* Payment Actions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-dark-text">Payment Actions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => sendPaymentReminder(selectedAppointment)}
                    disabled={loadingAction === `payment-${selectedAppointment.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingAction === `payment-${selectedAppointment.id}` ? '⏳ Sending...' : '📱 Send Payment Reminder'}
                  </button>
                  
                  <a
                    href={`https://wa.me/91${selectedAppointment.phone}?text=💰 *Payment Request - Computer World*%0A%0AService: ${selectedAppointment.service_type}%0AAmount: ${selectedAppointment.service_price ? formatCurrency(selectedAppointment.service_price) : 'TBD'}%0A%0APay online: https://computerworld.up.railway.app/dashboard%0A%0ACall: +91-93162 56101`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors text-center"
                  >
                    💬 WhatsApp Payment Link
                  </a>
                </div>

                {selectedAppointment.payment_status === 'pending' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Manual Payment Update</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                      If customer has paid offline, you can manually update the payment status.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const amount = prompt('Enter the amount paid by customer:')
                            if (amount && !isNaN(amount)) {
                              await supabase
                                .from('appointments')
                                .update({
                                  payment_status: 'paid',
                                  payment_method: 'cash',
                                  service_price: parseFloat(amount),
                                  payment_date: new Date().toISOString()
                                })
                                .eq('id', selectedAppointment.id)
                              
                              toast.success('Payment status updated to paid')
                              fetchAllData()
                              setShowPaymentModal(false)
                              setSelectedAppointment(null)
                            }
                          } catch (error) {
                            toast.error('Failed to update payment status')
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        💵 Mark as Cash Paid
                      </button>
                      
                      <button
                        onClick={async () => {
                          try {
                            const amount = prompt('Enter the amount paid by customer:')
                            if (amount && !isNaN(amount)) {
                              await supabase
                                .from('appointments')
                                .update({
                                  payment_status: 'paid',
                                  payment_method: 'upi',
                                  service_price: parseFloat(amount),
                                  payment_date: new Date().toISOString()
                                })
                                .eq('id', selectedAppointment.id)
                              
                              toast.success('Payment status updated to paid')
                              fetchAllData()
                              setShowPaymentModal(false)
                              setSelectedAppointment(null)
                            }
                          } catch (error) {
                            toast.error('Failed to update payment status')
                          }
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        📱 Mark as UPI Paid
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment History */}
              {selectedAppointment.payment_date && (
                <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-dark-text mb-2">Payment History</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Payment Date:</span>
                      <span className="font-medium">{formatDate(selectedAppointment.payment_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span className="font-medium">{selectedAppointment.payment_method || 'Not specified'}</span>
                    </div>
                    {selectedAppointment.instamojo_payment_id && (
                      <div className="flex justify-between">
                        <span>Transaction ID:</span>
                        <span className="font-medium text-xs">{selectedAppointment.instamojo_payment_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Close Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Close Payment Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
              stats.pending > 0 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            } relative`}
          >
            📋
            {stats.pending > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {stats.pending}
              </span>
            )}
          </button>
          
          <button
            onClick={fetchAllData}
            className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          >
            🔄
          </button>
          
          <a
            href="tel:+919316256101"
            className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          >
            📞
          </a>
        </div>
      </div>

      {/* Loading Overlay */}
      {loadingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-900 dark:text-dark-text font-medium">Processing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

