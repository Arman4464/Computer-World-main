'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import DarkModeToggle from '@/components/DarkModeToggle'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState([])
  const [stats, setStats] = useState({})
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [cancelling, setCancelling] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    getUserAndData()
    setupRealtimeSubscriptions()
  }, [])

  const getUserAndData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.replace('/login')
        return
      }

      setUser(session.user)
      await fetchAppointments(session.user.id)
    } catch (error) {
      console.error('Error:', error)
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchAppointments = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setAppointments(data || [])
      
      // Calculate stats
      const pending = data?.filter(apt => apt.status === 'pending').length || 0
      const completed = data?.filter(apt => apt.status === 'completed').length || 0
      const inProgress = data?.filter(apt => apt.status === 'in-progress').length || 0
      const cancelled = data?.filter(apt => apt.status === 'cancelled').length || 0
      
      setStats({
        total: data?.length || 0,
        pending,
        completed,
        inProgress,
        cancelled
      })

    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Error loading appointments')
    }
  }

  const setupRealtimeSubscriptions = () => {
    const appointmentsSubscription = supabase
      .channel('user-appointments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' }, 
        (payload) => {
          if (payload.new?.user_id === user?.id || payload.old?.user_id === user?.id) {
            if (payload.eventType === 'UPDATE') {
              toast.success('Appointment status updated!', {
                description: `Status changed to: ${payload.new.status}`
              })
            }
            fetchAppointments(user.id)
          }
        }
      )
      .subscribe()

    return () => {
      appointmentsSubscription.unsubscribe()
    }
  }

  const cancelAppointment = async (appointmentId, appointmentPhone) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    setCancelling(appointmentId)

    try {
      // Update appointment status
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (error) throw error

      // Send WhatsApp notification to owner
      try {
        await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `❌ *Appointment Cancelled*\n\nBooking ID: ${appointmentId}\nCustomer: ${user.email}\nPhone: +91-${appointmentPhone}\n\nCancelled by customer.`,
            phoneNumber: '919316256101'
          })
        })
      } catch (notifError) {
        console.log('Notification failed (non-critical):', notifError)
      }

      toast.success('Appointment cancelled successfully')
      fetchAppointments(user.id)
      
    } catch (error) {
      console.error('Cancel error:', error)
      toast.error('Failed to cancel appointment')
    } finally {
      setCancelling('')
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully!')
      router.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error logging out')
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white dark:bg-dark-card shadow-sm border-b border-gray-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-yellow-500 dark:bg-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CW</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-dark-text">COMPUTER WORLD</h1>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 -mt-1">User Dashboard</p>
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <Link href="/book-appointment" className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                Book Service
              </Link>
              <Link href="/" className="text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                Home
              </Link>
              <span className="text-sm text-gray-600 dark:text-dark-text">
                Hello, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Appointments', value: stats.total, icon: '📋', color: 'blue' },
            { title: 'Pending', value: stats.pending, icon: '⏳', color: 'yellow' },
            { title: 'In Progress', value: stats.inProgress, icon: '🔧', color: 'blue' },
            { title: 'Completed', value: stats.completed, icon: '✅', color: 'green' }
          ].map((stat, index) => (
            <div key={index} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">{stat.value}</p>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border mb-8">
          <div className="border-b border-gray-200 dark:border-dark-border">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'appointments', name: 'My Appointments', icon: '📋' },
                { id: 'profile', name: 'Profile', icon: '👤' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-4">Welcome back!</h2>
                  <p className="text-gray-600 dark:text-gray-300">Here's a summary of your computer repair services with Computer World.</p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    href="/book-appointment"
                    className="block p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                  >
                    <div className="text-3xl mb-2">🔧</div>
                    <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-1">Book New Service</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Schedule a new computer repair appointment</p>
                  </Link>

                  <a
                    href="tel:+919316256101"
                    className="block p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <div className="text-3xl mb-2">📞</div>
                    <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-1">Call Support</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Direct call to our technicians</p>
                  </a>

                  <a
                    href="https://wa.me/919316256101"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <div className="text-3xl mb-2">💬</div>
                    <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-1">WhatsApp Us</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Quick support via WhatsApp</p>
                  </a>
                </div>

                {/* Recent Appointments */}
                {appointments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Recent Appointments</h3>
                    <div className="space-y-4">
                      {appointments.slice(0, 3).map(appointment => (
                        <div key={appointment.id} className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-dark-text">{appointment.service_type}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(appointment.preferred_date)} • {appointment.preferred_time}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">My Appointments</h2>
                  <Link
                    href="/book-appointment"
                    className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Book New Appointment
                  </Link>
                </div>

                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔧</div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">No appointments yet</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Book your first computer repair service with us!</p>
                    <Link
                      href="/book-appointment"
                      className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-6 py-3 rounded-lg transition-colors"
                    >
                      Book Appointment
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {appointments.map(appointment => (
                      <div key={appointment.id} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">{appointment.service_type}</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-2">{appointment.description}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Date & Time</p>
                            <p className="font-medium text-gray-900 dark:text-dark-text">{formatDate(appointment.preferred_date)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{appointment.preferred_time}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                            <p className="font-medium text-gray-900 dark:text-dark-text">{appointment.city}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{appointment.pincode}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                            <p className="font-medium text-gray-900 dark:text-dark-text">+91-{appointment.phone}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Verified ✓</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 flex-wrap">
                          <button
                            onClick={() => setSelectedAppointment(appointment)}
                            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium text-sm"
                          >
                            View Details
                          </button>
                          
                          {/* Cancel Button */}
                          {appointment.status === 'pending' && (
                            <button
                              onClick={() => cancelAppointment(appointment.id, appointment.phone)}
                              disabled={cancelling === appointment.id}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {cancelling === appointment.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                          
                          {appointment.status === 'pending' && (
                            <a
                              href={`tel:+919316256101`}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium text-sm"
                            >
                              Call Support
                            </a>
                          )}
                          
                          <a
                            href={`https://wa.me/919316256101?text=Hi, regarding my appointment ${appointment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                          >
                            WhatsApp Support
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Profile Information</h2>
                
                <div className="bg-gray-50 dark:bg-dark-bg p-6 rounded-xl">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-16 h-16 bg-yellow-500 dark:bg-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
                        {user?.user_metadata?.full_name || 'No Name Set'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                      <p className="font-medium text-gray-900 dark:text-dark-text">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Member Since</p>
                      <p className="font-medium text-gray-900 dark:text-dark-text">
                        {formatDate(user?.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Appointments</p>
                      <p className="font-medium text-gray-900 dark:text-dark-text">{stats.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Services Completed</p>
                      <p className="font-medium text-gray-900 dark:text-dark-text">{stats.completed}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">Need Help?</h3>
                  <p className="text-blue-600 dark:text-blue-400 text-sm mb-4">
                    Contact our support team for account assistance or technical support.
                  </p>
                  <div className="flex space-x-4">
                    <a
                      href="tel:+919316256101"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Call Support
                    </a>
                    <a
                      href="https://wa.me/919316256101?text=Hi, I need help with my account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      WhatsApp Support
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Appointment Details</h2>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text">{selectedAppointment.service_type}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Problem Description</p>
                <p className="text-gray-900 dark:text-dark-text">{selectedAppointment.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Scheduled Date</p>
                  <p className="font-medium text-gray-900 dark:text-dark-text">{formatDate(selectedAppointment.preferred_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Time Slot</p>
                  <p className="font-medium text-gray-900 dark:text-dark-text">{selectedAppointment.preferred_time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contact Number</p>
                  <p className="font-medium text-gray-900 dark:text-dark-text">+91-{selectedAppointment.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Booking Date</p>
                  <p className="font-medium text-gray-900 dark:text-dark-text">{formatDate(selectedAppointment.created_at)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Service Address</p>
                <p className="text-gray-900 dark:text-dark-text">
                  {selectedAppointment.address}<br />
                  {selectedAppointment.city} - {selectedAppointment.pincode}
                </p>
              </div>

              {selectedAppointment.technician_notes && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Technician Notes</p>
                  <p className="text-gray-900 dark:text-dark-text bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    {selectedAppointment.technician_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              {selectedAppointment.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setSelectedAppointment(null)
                      cancelAppointment(selectedAppointment.id, selectedAppointment.phone)
                    }}
                    disabled={cancelling === selectedAppointment.id}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    {cancelling === selectedAppointment.id ? 'Cancelling...' : 'Cancel Appointment'}
                  </button>
                  <a
                    href={`tel:+919316256101`}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Call Support
                  </a>
                </>
              )}
              <a
                href={`https://wa.me/919316256101?text=Hi, regarding my appointment ${selectedAppointment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                WhatsApp Support
              </a>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text px-6 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
