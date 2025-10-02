'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      setUser(session.user)
      
      // Check if user is owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      setIsOwner(profile?.role === 'owner')
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setIsOwner(false)
    router.push('/')
  }

  if (loading) return <div className="h-16 bg-white shadow-lg animate-pulse"></div>

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <Image 
              src="/CW-LOGO.jpg" 
              alt="Computer World" 
              width={40} 
              height={40}
              className="rounded-lg"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">COMPUTER WORLD</h1>
              <p className="text-xs text-yellow-600">YOUR IT PARTNER</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-yellow-600 font-medium">
                  Dashboard
                </Link>
                <Link href="/book-appointment" className="text-gray-700 hover:text-yellow-600 font-medium">
                  Book Service
                </Link>
                {isOwner && (
                  <Link href="/admin" className="text-gray-700 hover:text-yellow-600 font-medium">
                    Admin Panel
                  </Link>
                )}
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-red-600 font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="#services" className="text-gray-700 hover:text-yellow-600 font-medium">
                  Services
                </Link>
                <Link href="#contact" className="text-gray-700 hover:text-yellow-600 font-medium">
                  Contact
                </Link>
                <Link href="/login" className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-semibold">
                  Book Appointment
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-yellow-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <Link href="/dashboard" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md">
                  Dashboard
                </Link>
                <Link href="/book-appointment" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md">
                  Book Service
                </Link>
                {isOwner && (
                  <Link href="/admin" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md">
                    Admin Panel
                  </Link>
                )}
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center px-3 py-2">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-gray-50 rounded-md"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="#services" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md">
                  Services
                </Link>
                <Link href="#contact" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md">
                  Contact
                </Link>
                <Link href="/login" className="block mx-3 my-2 bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-semibold text-center">
                  Book Appointment
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
