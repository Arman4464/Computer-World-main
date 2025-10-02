'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import DarkModeToggle from '@/components/DarkModeToggle'

export default function BookAppointment() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [successMessage, setSuccessMessage] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    serviceType: '',
    description: '',
    address: '',
    city: '',
    pincode: '',
    phone: '',
    preferredDate: '',
    preferredTime: ''
  })
  
  const [errors, setErrors] = useState({})

  const services = [
    {
      name: "Screen Replacement",
      price: "₹3000-8000",
      icon: "🖥️",
      description: "LCD/LED screen repairs for laptops and desktops with original quality parts",
      estimatedTime: "2-4 hours",
      includes: ["Screen diagnosis", "Part replacement", "Quality testing", "6-month warranty"],
      duration: 4
    },
    {
      name: "Virus Removal",
      price: "₹500-1000",
      icon: "🛡️",
      description: "Complete malware removal and system optimization for peak performance",
      estimatedTime: "1-2 hours",
      includes: ["Full system scan", "Malware removal", "System optimization", "Security setup"],
      duration: 2
    },
    {
      name: "Hardware Repair",
      price: "₹800-5000",
      icon: "🔧",
      description: "Motherboard, RAM, storage, and component repairs by certified technicians",
      estimatedTime: "3-6 hours",
      includes: ["Hardware diagnosis", "Component repair", "Performance testing", "Parts warranty"],
      duration: 6
    },
    {
      name: "Data Recovery",
      price: "₹1500-4000",
      icon: "💾",
      description: "Recover lost files from damaged hard drives, SSDs, and storage devices",
      estimatedTime: "4-8 hours",
      includes: ["Data assessment", "Recovery process", "File verification", "Backup guidance"],
      duration: 8
    },
    {
      name: "Software Installation",
      price: "₹300-800",
      icon: "💿",
      description: "OS installation, software setup, and system configuration services",
      estimatedTime: "1-3 hours",
      includes: ["OS installation", "Driver setup", "Software configuration", "System optimization"],
      duration: 3
    }
  ]

  const suratPincodes = [
    395001, 395002, 395003, 395004, 395005, 395006, 395007, 395008, 395009, 395010,
    395011, 395012, 395013, 395015, 395017, 395018, 395020, 395023
  ]

  // All possible time slots
  const allTimeSlots = [
    "09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00"
  ]

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
        } else {
          router.replace('/login')
          return
        }
      } catch (error) {
        console.error('Error:', error)
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const preSelectedService = searchParams.get('service')
    if (preSelectedService) {
      setFormData(prev => ({ ...prev, serviceType: preSelectedService }))
      setStep(2)
    }
  }, [router, searchParams])

  // Check available time slots when date is selected
  const checkAvailableSlots = async (selectedDate) => {
    if (!selectedDate) return

    try {
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('preferred_time, service_type')
        .eq('preferred_date', selectedDate)
        .in('status', ['pending', 'in-progress']) // Don't count completed/cancelled

      const bookedSlots = existingAppointments?.map(apt => apt.preferred_time) || []
      
      // Calculate available slots
      const available = allTimeSlots.filter(slot => {
        const slotCount = bookedSlots.filter(booked => booked === slot).length
        return slotCount < 2 // Allow maximum 2 appointments per slot
      })

      setAvailableSlots(available)
      
      if (available.length === 0) {
        toast.warning('All time slots are booked for this date. Please choose another date.')
      } else if (available.length <= 2) {
        toast.info(`Only ${available.length} time slots remaining for this date!`)
      }

    } catch (error) {
      console.error('Error checking slots:', error)
      toast.error('Error checking available time slots')
    }
  }

  const validateStep2 = () => {
    const newErrors = {}

    if (!formData.serviceType) {
      newErrors.serviceType = 'Please select a service'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please describe your problem'
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Please provide more details (at least 10 characters)'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Please enter your complete address'
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Please provide a complete address'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Please enter your city'
    }

    if (!formData.pincode) {
      newErrors.pincode = 'Please enter your pincode'
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode'
    } else if (!suratPincodes.includes(parseInt(formData.pincode))) {
      newErrors.pincode = 'Sorry, we currently serve only Surat area. Service not available in your region.'
    }

    const phoneRegex = /^[6-9]\d{9}$/
    if (!formData.phone) {
      newErrors.phone = 'Please enter your phone number'
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number'
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Please select your preferred date'
    } else {
      const selectedDate = new Date(formData.preferredDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        newErrors.preferredDate = 'Please select a future date'
      }
    }

    if (!formData.preferredTime) {
      newErrors.preferredTime = 'Please select your preferred time'
    } else if (!availableSlots.includes(formData.preferredTime)) {
      newErrors.preferredTime = 'Selected time slot is not available'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '')
      if (numericValue.length <= 10) {
        setFormData(prev => ({ ...prev, [name]: numericValue }))
      }
      return
    }

    if (name === 'pincode') {
      const numericValue = value.replace(/\D/g, '')
      if (numericValue.length <= 6) {
        setFormData(prev => ({ ...prev, [name]: numericValue }))
      }
      return
    }

    if (name === 'preferredDate') {
      setFormData(prev => ({ ...prev, [name]: value, preferredTime: '' }))
      checkAvailableSlots(value)
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep2()) {
      return
    }

    setIsSubmitting(true)

    try {
      const appointmentData = {
        user_id: user.id,
        service_type: formData.serviceType,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode,
        phone: formData.phone,
        preferred_date: formData.preferredDate,
        preferred_time: formData.preferredTime,
        status: 'pending',
        payment_status: 'pending'
      }

      // Save to database
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()

      if (error) throw error

      // Send notifications in parallel (don't fail if they don't work)
      const notificationPromises = []

      // Email notifications (reliable)
      notificationPromises.push(
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentData: { ...appointmentData, id: data[0].id },
            userEmail: user.email
          })
        }).catch(err => console.log('Email failed (non-critical):', err))
      )

      // WhatsApp notifications (optional - may fail due to Facebook approval)
      notificationPromises.push(
        fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🔧 *New Computer World Appointment*\n\n*Service:* ${appointmentData.service_type}\n*Customer:* ${user.email}\n*Phone:* +91-${appointmentData.phone}\n*Address:* ${appointmentData.address}, ${appointmentData.city} - ${appointmentData.pincode}\n*Date:* ${appointmentData.preferred_date}\n*Time:* ${appointmentData.preferred_time}\n*Problem:* ${appointmentData.description}\n\nBooking ID: ${data[0].id}\n\nPlease confirm via call.`,
            phoneNumber: '919316256101'
          })
        }).catch(err => console.log('WhatsApp failed (non-critical):', err))
      )

      // Customer WhatsApp confirmation (optional)
      notificationPromises.push(
        fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `✅ *Appointment Confirmed - Computer World*\n\nThank you for booking with us!\n\n*Service:* ${appointmentData.service_type}\n*Date:* ${appointmentData.preferred_date}\n*Time:* ${appointmentData.preferred_time}\n*Address:* ${appointmentData.address}\n\nWe'll contact you within 15 minutes to confirm.\n\n*Contact:* +91-93162 56101\n*Booking ID:* ${data[0].id}`,
            phoneNumber: `91${appointmentData.phone}`
          })
        }).catch(err => console.log('Customer WhatsApp failed (non-critical):', err))
      )

      // Wait for notifications (but don't block user)
      Promise.allSettled(notificationPromises).then(results => {
        console.log('Notification results:', results)
      })

      setSuccessMessage({
        id: data[0].id,
        service: formData.serviceType,
        date: formData.preferredDate,
        time: formData.preferredTime,
        phone: formData.phone
      })
      setStep(3)

    } catch (error) {
      console.error('Booking error:', error)
      setErrors({ general: 'Failed to book appointment. Please try again or contact support directly at +91-93162 56101.' })
      toast.error('Booking failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Step 3: Success Message
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full bg-white dark:bg-dark-card rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-dark-border">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-4">🎉 Appointment Booked!</h2>
            
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-green-800 dark:text-green-300">
                <p className="font-semibold">✅ Booking Confirmed</p>
                <p className="text-sm"><strong>Service:</strong> {successMessage.service}</p>
                <p className="text-sm"><strong>Date:</strong> {successMessage.date}</p>
                <p className="text-sm"><strong>Time:</strong> {successMessage.time}</p>
                <p className="text-sm"><strong>Booking ID:</strong> {successMessage.id}</p>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-blue-800 dark:text-blue-300">
                  <p className="font-semibold">📞 We'll call you within 15 minutes</p>
                  <p className="text-sm">Our technician will call +91-{successMessage.phone} to confirm the appointment and schedule the service.</p>
                </div>
              </div>
            </div>

            <div className="text-gray-600 dark:text-gray-300 text-sm mb-8">
              <p>📧 Email confirmation sent to {user.email}</p>
              <p>📱 SMS/WhatsApp confirmation (if available)</p>
            </div>
            
            <div className="space-y-4">
              <Link 
                href="/dashboard"
                className="block w-full bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white py-3 rounded-lg transition-colors text-center font-semibold"
              >
                View Dashboard
              </Link>
              <Link 
                href="/"
                className="block w-full border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-center font-semibold"
              >
                Back to Home
              </Link>
              <a
                href="tel:+919316256101"
                className="block w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg transition-colors text-center font-semibold"
              >
                Call Us: +91-93162 56101
              </a>
            </div>
          </div>
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
                <p className="text-xs text-yellow-600 dark:text-yellow-400 -mt-1">Book Appointment</p>
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <Link href="/" className="text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">Home</Link>
              <Link href="/dashboard" className="text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">Dashboard</Link>
              <span className="text-sm text-gray-600 dark:text-dark-text">Hello, {user.email?.split('@')[0]}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${step >= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Select Service</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-yellow-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Details & Schedule</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-yellow-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
            <div className={`flex items-center ${step >= 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Step 1: Service Selection */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-4">Choose Your Service</h2>
              <p className="text-gray-600 dark:text-gray-300">Select the computer repair service you need</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service, index) => (
                <div
                  key={index}
                  className={`cursor-pointer bg-white dark:bg-dark-card rounded-xl p-6 border-2 transition-all duration-300 hover:shadow-lg ${
                    formData.serviceType === service.name
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-gray-200 dark:border-dark-border hover:border-yellow-300'
                  }`}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, serviceType: service.name }))
                    setErrors(prev => ({ ...prev, serviceType: '' }))
                  }}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">{service.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">{service.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">{service.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Price Range</p>
                          <p className="font-semibold text-yellow-600 dark:text-yellow-400">{service.price}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Est. Time</p>
                          <p className="font-semibold text-gray-700 dark:text-gray-300">{service.estimatedTime}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Includes:</p>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          {service.includes.map((item, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {errors.serviceType && (
              <p className="text-red-600 text-sm mt-4 text-center">{errors.serviceType}</p>
            )}

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => {
                  if (formData.serviceType) {
                    setStep(2)
                  } else {
                    setErrors(prev => ({ ...prev, serviceType: 'Please select a service' }))
                  }
                }}
                className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
              >
                Continue to Details →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Enhanced Details Form */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-4">Appointment Details</h2>
              <p className="text-gray-600 dark:text-gray-300">Please provide your details for the service</p>
            </div>

            {/* Selected Service Summary */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {services.find(s => s.name === formData.serviceType)?.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-dark-text">{formData.serviceType}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {services.find(s => s.name === formData.serviceType)?.price} • 
                    {services.find(s => s.name === formData.serviceType)?.estimatedTime}
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 transition-colors ml-auto"
                >
                  Change Service
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-xl p-8 shadow-sm">
              {errors.general && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-300 text-sm">{errors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Problem Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Describe Your Problem *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text ${
                      errors.description ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="Please describe the issue with your computer in detail..."
                    disabled={isSubmitting}
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Complete Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text ${
                      errors.address ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="Full address with house/flat number, area, landmark..."
                    disabled={isSubmitting}
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address}</p>}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text ${
                      errors.city ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="City name"
                    disabled={isSubmitting}
                  />
                  {errors.city && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city}</p>}
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text ${
                      errors.pincode ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="6-digit pincode"
                    disabled={isSubmitting}
                    maxLength="6"
                  />
                  {errors.pincode && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pincode}</p>}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">We currently serve Surat area only (395001-395023)</p>
                </div>

                {/* Phone Number */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-500 dark:text-gray-400 rounded-l-lg">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-r-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text ${
                        errors.phone ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-gray-300 dark:border-dark-border'
                      }`}
                      placeholder="10-digit mobile number"
                      disabled={isSubmitting}
                      maxLength="10"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>}
                  
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Phone Verification</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          We'll call you within <strong>15 minutes</strong> to verify your phone number and confirm appointment details.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferred Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text ${
                      errors.preferredDate ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    disabled={isSubmitting}
                  />
                  {errors.preferredDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.preferredDate}</p>}
                </div>

                {/* Preferred Time - Smart Availability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Time * 
                    {formData.preferredDate && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        ({availableSlots.length} slots available)
                      </span>
                    )}
                  </label>
                  <select
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text ${
                      errors.preferredTime ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    disabled={isSubmitting || !formData.preferredDate}
                  >
                    <option value="">Select time slot</option>
                    {allTimeSlots.map(slot => {
                      const isAvailable = availableSlots.includes(slot)
                      return (
                        <option 
                          key={slot} 
                          value={slot} 
                          disabled={!isAvailable}
                          className={!isAvailable ? 'text-red-500' : ''}
                        >
                          {slot} {!isAvailable ? '(Fully Booked)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  {errors.preferredTime && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.preferredTime}</p>}
                  {formData.preferredDate && availableSlots.length === 0 && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">All time slots are booked for this date. Please choose another date.</p>
                  )}
                </div>
              </div>

              {/* Terms and Service Info */}
              <div className="mt-8 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-dark-text mb-2">📋 Service Information</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• We'll call you within 15 minutes to confirm the appointment</li>
                  <li>• Our technician will arrive at your doorstep with all necessary tools</li>
                  <li>• Transparent pricing with no hidden charges</li>
                  <li>• Service completion within 1-7 days depending on issue complexity</li>
                  <li>• Payment after successful service completion</li>
                  <li>• Email confirmations will be sent</li>
                </ul>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  By booking, you agree to our <Link href="/terms" className="text-yellow-600 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-yellow-600 hover:underline">Privacy Policy</Link>.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                  disabled={isSubmitting}
                >
                  ← Back to Services
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Booking Appointment...</span>
                    </div>
                  ) : (
                    'Book Appointment'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
