'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import DarkModeToggle from '@/components/DarkModeToggle'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  const handleServiceClick = (serviceName) => {
    if (user) {
      router.push(`/book-appointment?service=${encodeURIComponent(serviceName)}`)
    } else {
      toast.error('Please login to book an appointment', {
        action: {
          label: 'Login',
          onClick: () => router.push('/login')
        }
      })
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      toast.success('Logged out successfully!')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error logging out')
    }
  }

  const services = [
    {
      name: "Screen Replacement",
      price: "₹3000-8000",
      icon: "🖥️",
      description: "LCD/LED screen repairs for laptops and desktops with original quality parts",
      features: ["Original parts", "6-month warranty", "Same-day service", "All brands"]
    },
    {
      name: "Virus Removal", 
      price: "₹500-1000",
      icon: "🛡️",
      description: "Complete malware removal and system optimization for peak performance",
      features: ["Deep system scan", "Performance boost", "Security setup", "Data backup"]
    },
    {
      name: "Hardware Repair",
      price: "₹800-5000", 
      icon: "🔧",
      description: "Motherboard, RAM, storage, and component repairs by certified technicians",
      features: ["Component-level repair", "Quality parts", "Expert diagnosis", "Quick turnaround"]
    },
    {
      name: "Data Recovery",
      price: "₹1500-4000",
      icon: "💾", 
      description: "Recover lost files from damaged hard drives, SSDs, and storage devices",
      features: ["90% success rate", "No data = No charge", "All file types", "Secure process"]
    },
    {
      name: "Software Installation",
      price: "₹300-800",
      icon: "💿",
      description: "OS installation, software setup, and system configuration services", 
      features: ["Licensed software", "Driver setup", "System optimization", "Training included"]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-dark-card shadow-sm border-b border-gray-200 dark:border-dark-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-500 dark:bg-yellow-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">CW</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">COMPUTER WORLD</h1>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 -mt-1">Your IT Partner</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              
              {loading ? (
                <div className="w-8 h-8 border-2 border-yellow-300 border-t-yellow-600 rounded-full animate-spin"></div>
              ) : user ? (
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/dashboard"
                    className="text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <span className="text-sm text-gray-600 dark:text-dark-text">
                    Hello, {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/login"
                    className="text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-dark-bg dark:to-dark-card py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-dark-text mb-6">
              Professional <span className="text-yellow-600 dark:text-yellow-400">Computer Repair</span>
              <br />Services in Surat
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Doorstep computer repair services with 30-day warranty. Screen replacement, virus removal, 
              data recovery, and more by certified technicians.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => handleServiceClick('Quick Service')}
                className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Book Service Now
              </button>
              <a
                href="tel:+919316256101"
                className="border-2 border-yellow-500 dark:border-yellow-600 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500 hover:text-white dark:hover:bg-yellow-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                📞 Call: +91-93162 56101
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white dark:bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text mb-4">
              Our Expert Services
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Professional computer repair services with transparent pricing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="group bg-gray-50 dark:bg-dark-card hover:bg-white dark:hover:bg-dark-border rounded-2xl p-8 shadow-sm hover:shadow-xl border border-gray-100 dark:border-dark-border transition-all duration-300 transform hover:scale-105 cursor-pointer"
                onClick={() => handleServiceClick(service.name)}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-3">
                  {service.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {service.description}
                </p>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">
                  {service.price}
                </div>
                
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button className="w-full bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white py-3 rounded-lg font-semibold transition-colors group-hover:bg-yellow-600">
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text mb-4">
              Why Choose Computer World?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: "🏠", title: "Doorstep Service", desc: "We come to your home or office" },
              { icon: "⚡", title: "Same Day Repair", desc: "Quick turnaround for urgent issues" },
              { icon: "🛡️", title: "30-Day Warranty", desc: "All repairs backed by warranty" },
              { icon: "⭐", title: "500+ Happy Customers", desc: "Trusted by Surat residents" }
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 bg-white dark:bg-dark-bg rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-yellow-500 dark:bg-yellow-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Need Computer Repair? We're Here to Help!
          </h2>
          <p className="text-xl text-yellow-100 mb-8">
            Professional technicians • Transparent pricing • 30-day warranty
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => handleServiceClick('Emergency Service')}
              className="bg-white text-yellow-600 hover:bg-gray-100 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Book Emergency Service
            </button>
            <a
              href="https://wa.me/919316256101"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white hover:bg-white hover:text-yellow-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              💬 WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CW</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">COMPUTER WORLD</h3>
                  <p className="text-yellow-400 text-sm">Your IT Partner</p>
                </div>
              </div>
              <p className="text-gray-400">
                Professional computer repair services in Surat with doorstep service and warranty.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-gray-400">
                <p>📞 +91-93162 56101</p>
                <p>📧 computerworldsurat@gmail.com</p>
                <p>🌐 computerworld.up.railway.app</p>
                <p>📍 Service Area: All of Surat</p>
              </div>
            </div>


            <div>
              <h4 className="text-lg font-semibold mb-4">Business Hours</h4>
              <div className="space-y-2 text-gray-400">
                <p>Monday - Saturday</p>
                <p className="text-yellow-400">9:00 AM - 7:00 PM</p>
                <p>Sunday: Emergency only</p>
                <p className="text-sm mt-4">24/7 Emergency support available</p>
              </div>
            </div>
          </div>

              
<div className="flex space-x-4 text-sm">
  <Link href="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link>
  <Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
  <span className="text-gray-400">•</span>
  <span className="text-gray-400">© 2025 Computer World</span>
</div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Computer World. All rights reserved. Professional computer repair services in Surat.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
