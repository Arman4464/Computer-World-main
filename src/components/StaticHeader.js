'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function StaticHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
              <span className="text-white font-bold text-lg">CW</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">
                COMPUTER WORLD
              </h1>
              <p className="text-xs text-yellow-600 font-medium">YOUR IT PARTNER</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/#services" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors">
              Services
            </Link>
            <Link href="/#about" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors">
              About
            </Link>
            <Link href="/#testimonials" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors">
              Reviews
            </Link>
            <Link href="/#contact" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors">
              Contact
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-700 hover:text-yellow-600 font-medium transition-colors">
                Login
              </Link>
              <Link 
                href="/register"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-2 rounded-full hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/#services" className="block px-3 py-2 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md transition-colors">
                Services
              </Link>
              <Link href="/#about" className="block px-3 py-2 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md transition-colors">
                About
              </Link>
              <Link href="/#testimonials" className="block px-3 py-2 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md transition-colors">
                Reviews
              </Link>
              <Link href="/#contact" className="block px-3 py-2 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md transition-colors">
                Contact
              </Link>
              
              <div className="border-t pt-3 mt-3">
                <Link href="/login" className="block px-3 py-2 text-gray-700 hover:text-yellow-600 hover:bg-gray-50 rounded-md transition-colors">
                  Login
                </Link>
                <Link href="/register" className="block mx-3 my-2 bg-yellow-500 text-white px-6 py-3 rounded-lg text-center font-semibold hover:bg-yellow-600 transition-colors">
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
