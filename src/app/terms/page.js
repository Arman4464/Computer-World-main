'use client'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'

export default function TermsOfService() {
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
                <p className="text-xs text-yellow-600 dark:text-yellow-400 -mt-1">Terms of Service</p>
              </div>
            </Link>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <Link href="/" className="text-gray-600 dark:text-dark-text hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-8">Terms of Service</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            <strong>Effective Date:</strong> September 28, 2025<br />
            <strong>Last Updated:</strong> September 28, 2025
          </p>

          <div className="space-y-8 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using Computer World's services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
              <p>
                These Terms of Service ("Terms") govern your use of our computer repair services, website, and mobile applications operated by Computer World.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">2. Service Description</h2>
              <p className="mb-4">Computer World provides professional computer repair services including but not limited to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Hardware repair and replacement</li>
                <li>Software installation and troubleshooting</li>
                <li>Virus removal and system cleaning</li>
                <li>Data recovery services</li>
                <li>Screen replacement and repairs</li>
                <li>System optimization and maintenance</li>
              </ul>
              <p className="mt-4">
                All services are provided by certified technicians with appropriate expertise and equipment.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">3. Service Area and Delivery</h2>
              <p className="mb-4">
                Computer World currently provides services in Surat, Gujarat, India (Pincodes: 395001-395023).
              </p>
              <p className="mb-4">
                <strong>Service Delivery Timeline:</strong> All repair services will be completed within <strong>1-7 business days</strong> depending on the complexity of the issue and availability of parts.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Simple software issues: 1-2 days</li>
                <li>Hardware repairs: 2-5 days</li>
                <li>Complex repairs requiring parts: 5-7 days</li>
                <li>Data recovery: 3-7 days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">4. Booking and Appointment</h2>
              <p className="mb-4">
                Appointment bookings can be made through our website, phone, or WhatsApp. All bookings are subject to technician availability and confirmation.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We will contact you within 15 minutes of booking to confirm the appointment</li>
                <li>Appointment times are estimated and may vary by ±30 minutes</li>
                <li>Customers must be present during the service appointment</li>
                <li>Rescheduling is allowed with 24-hour advance notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">5. Pricing and Payment</h2>
              <p className="mb-4">
                All prices displayed are estimates and may vary based on the actual diagnosis and repair requirements.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Final pricing will be communicated before commencing repair work</li>
                <li>Payment is due after successful completion of services</li>
                <li>We accept cash, UPI, and online payments</li>
                <li>Advance payment may be required for expensive parts (above ₹5,000)</li>
                <li>No additional charges for home visits within service area</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">6. Refund and Cancellation Policy</h2>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">NO REFUND POLICY</h3>
                <p className="text-red-700 dark:text-red-400">
                  <strong>Computer World operates under a strict NO REFUND policy.</strong> All sales are final once service is completed and payment is made.
                </p>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">Cancellation Terms:</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Appointments can be cancelled up to 2 hours before scheduled time</li>
                <li>No cancellation charges for appointments cancelled in advance</li>
                <li>Late cancellations (less than 2 hours) may incur a ₹200 service charge</li>
                <li>No-show appointments will be charged ₹500</li>
              </ul>
              
              <h4 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2 mt-4">Exceptions:</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Refunds may be considered only if service was not provided due to our fault</li>
                <li>Warranty claims are handled separately and do not constitute refunds</li>
                <li>Disputes must be raised within 24 hours of service completion</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">7. Warranty and Liability</h2>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">Warranty Coverage:</h4>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Hardware repairs: 30-day warranty on parts and labor</li>
                <li>Software services: 15-day warranty on installation and configuration</li>
                <li>Screen replacements: 6-month warranty on parts</li>
                <li>Data recovery: No warranty (service provided as-is)</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">Limitation of Liability:</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li>Computer World is not liable for data loss during repair process</li>
                <li>Customers are advised to backup data before service</li>
                <li>Maximum liability is limited to the service fee paid</li>
                <li>We are not responsible for software compatibility issues post-repair</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibent text-gray-900 dark:text-dark-text mb-4">8. Customer Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate device information and problem description</li>
                <li>Ensure device is accessible and safe to work on</li>
                <li>Remove all personal and sensitive data before service (if possible)</li>
                <li>Provide necessary passwords and access credentials</li>
                <li>Be available during scheduled appointment times</li>
                <li>Make timely payments as agreed</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">9. Data Protection and Privacy</h2>
              <p className="mb-4">
                Computer World respects customer privacy and handles personal data in accordance with our Privacy Policy.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Customer data accessed during repairs is kept confidential</li>
                <li>We do not intentionally access personal files or data</li>
                <li>Any data viewed during troubleshooting is not stored or shared</li>
                <li>Customers are responsible for backing up important data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">10. Dispute Resolution</h2>
              <p className="mb-4">
                Any disputes arising from our services will be resolved through the following process:
              </p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Direct communication with our customer service team</li>
                <li>Escalation to management for review</li>
                <li>Mediation through local consumer courts if necessary</li>
                <li>All disputes are subject to Surat, Gujarat jurisdiction</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">11. Modifications to Terms</h2>
              <p>
                Computer World reserves the right to modify these terms at any time. Customers will be notified of any changes through email or website announcements. Continued use of our services after modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">12. Contact Information</h2>
              <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                <p className="mb-2"><strong>Computer World</strong></p>
                <p className="mb-2"><strong>Phone:</strong> +91-93162 56101</p>
                <p className="mb-2"><strong>Email:</strong> computerworldsurat@gmail.com</p>
                <p className="mb-2"><strong>WhatsApp:</strong> +91-93162 56101</p>
                <p className="mb-2"><strong>Website:</strong> https://computerworld.up.railway.app</p>
                <p><strong>Service Area:</strong> Surat, Gujarat, India</p>
              </div>
            </section>
          </div>

          <div className="mt-12 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-300 text-sm">
              <strong>Important Notice:</strong> By using Computer World services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and Computer World.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link 
              href="/" 
              className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
