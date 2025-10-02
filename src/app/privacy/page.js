'use client'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'

export default function PrivacyPolicy() {
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
                <p className="text-xs text-yellow-600 dark:text-yellow-400 -mt-1">Privacy Policy</p>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-8">Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            <strong>Effective Date:</strong> September 28, 2025<br />
            <strong>Last Updated:</strong> September 28, 2025
          </p>

          <div className="space-y-8 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">1. Introduction</h2>
              <p className="mb-4">
                Computer World ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our computer repair services, visit our website, or interact with our mobile applications.
              </p>
              <p>
                By using our services, you consent to the data practices described in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">2.1 Personal Information</h3>
              <p className="mb-4">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Full name and contact information (phone number, email address)</li>
                <li>Physical address for service delivery</li>
                <li>Device information and problem descriptions</li>
                <li>Payment information (processed securely through third-party providers)</li>
                <li>Communication records (calls, messages, emails)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">2.2 Technical Information</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Computer specifications and hardware details</li>
                <li>Software versions and configurations</li>
                <li>System logs and diagnostic information</li>
                <li>Error messages and performance data</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">2.3 Usage Data</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Website browsing patterns and interactions</li>
                <li>App usage statistics and preferences</li>
                <li>Service history and appointment details</li>
                <li>Customer feedback and reviews</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use the collected information for the following purposes:</p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">3.1 Service Delivery</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Scheduling and confirming repair appointments</li>
                <li>Diagnosing and fixing computer problems</li>
                <li>Providing customer support and technical assistance</li>
                <li>Processing payments and managing billing</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">3.2 Communication</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Sending appointment confirmations and reminders</li>
                <li>Providing service updates and status notifications</li>
                <li>Responding to customer inquiries and support requests</li>
                <li>Sending promotional offers and service announcements (with consent)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">3.3 Business Operations</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Improving our services and customer experience</li>
                <li>Analyzing usage patterns and service performance</li>
                <li>Maintaining security and preventing fraud</li>
                <li>Complying with legal obligations and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">4. Information Sharing and Disclosure</h2>
              <p className="mb-4">We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:</p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">4.1 Service Providers</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Payment processors (Razorpay, UPI providers)</li>
                <li>Cloud storage and hosting services</li>
                <li>Communication service providers (SMS, email, WhatsApp)</li>
                <li>Analytics and performance monitoring tools</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">4.2 Legal Requirements</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Compliance with legal obligations and court orders</li>
                <li>Protection of our rights and property</li>
                <li>Investigation of potential violations of our terms</li>
                <li>Protection of customer and public safety</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">4.3 Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, customer information may be transferred as part of the business transaction, with appropriate notice to affected customers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">5. Data Security</h2>
              <p className="mb-4">We implement appropriate technical and organizational measures to protect your personal information:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Secure payment processing through certified providers</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Regular security assessments and updates</li>
                <li>Employee training on data protection practices</li>
              </ul>
              <p>
                However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">6. Data Retention</h2>
              <p className="mb-4">We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Customer account information: Until account closure + 3 years</li>
                <li>Service records and warranties: 5 years from service completion</li>
                <li>Payment information: As required by financial regulations (7 years)</li>
                <li>Communication records: 2 years from last interaction</li>
                <li>Technical diagnostic data: 1 year from service completion</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">7. Your Rights and Choices</h2>
              <p className="mb-4">You have the following rights regarding your personal information:</p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">7.1 Access and Correction</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Request access to your personal information</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Update your contact preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">7.2 Communication Preferences</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Opt-out of promotional communications</li>
                <li>Choose preferred communication channels</li>
                <li>Unsubscribe from marketing emails</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-3">7.3 Data Deletion</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Request deletion of your personal information (subject to legal requirements)</li>
                <li>Close your account and remove associated data</li>
                <li>Withdraw consent for data processing (where applicable)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="mb-4">We use cookies and similar technologies to enhance your experience:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Essential cookies for website functionality</li>
                <li>Analytics cookies to understand usage patterns</li>
                <li>Preference cookies to remember your settings</li>
                <li>Marketing cookies for personalized advertisements (with consent)</li>
              </ul>
              <p>
                You can control cookie preferences through your browser settings, but disabling certain cookies may affect website functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">9. Third-Party Services</h2>
              <p className="mb-4">Our services integrate with third-party platforms:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Google Analytics:</strong> Website usage analytics</li>
                <li><strong>Razorpay:</strong> Payment processing</li>
                <li><strong>WhatsApp Business API:</strong> Customer communication</li>
                <li><strong>Supabase:</strong> Database and authentication services</li>
                <li><strong>Resend:</strong> Email delivery services</li>
              </ul>
              <p>
                These services have their own privacy policies, and we encourage you to review them to understand how your data is handled.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">10. Children's Privacy</h2>
              <p>
                Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you believe we have inadvertently collected such information, please contact us immediately so we can delete it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">11. International Data Transfers</h2>
              <p className="mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Compliance with applicable data protection laws</li>
                <li>Contractual protections with service providers</li>
                <li>Industry-standard security measures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">12. Updates to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by email or through our website. Your continued use of our services after such modifications constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-text mb-4">13. Contact Information</h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
                <p className="mb-2"><strong>Computer World - Privacy Officer</strong></p>
                <p className="mb-2"><strong>Email:</strong> computerworldsurat@gmail.com</p>
                <p className="mb-2"><strong>Phone:</strong> +91-93162 56101</p>
                <p className="mb-2"><strong>WhatsApp:</strong> +91-93162 56101</p>
                <p className="mb-2"><strong>Website:</strong> https://computerworld.up.railway.app</p>
                <p><strong>Address:</strong> Surat, Gujarat, India</p>
              </div>
            </section>
          </div>

          <div className="mt-12 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              <strong>Your Privacy Matters:</strong> We are committed to protecting your personal information and being transparent about our data practices. If you have any concerns or questions about how we handle your data, please don't hesitate to contact us.
            </p>
          </div>

          <div className="mt-8 text-center space-x-4">
            <Link 
              href="/terms" 
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              View Terms of Service
            </Link>
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
