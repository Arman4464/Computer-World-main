import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message } = await request.json()

    // Simple rule-based responses for Computer World
    const responses = {
      // Services
      'services': "We offer:\n• Screen Replacement (₹3000-8000)\n• Virus Removal (₹500-1000)\n• Hardware Repair (₹800-5000)\n• Data Recovery (₹1500-4000)\n• Software Installation (₹300-800)\n\nAll services include doorstep service and 30-day warranty!",
      
      'screen': "Our screen replacement service costs ₹3000-8000 depending on your laptop model. We use original quality parts and provide 6-month warranty. Same-day service available!",
      
      'virus': "Virus removal costs ₹500-1000. We do complete malware removal, system optimization, and setup prevention measures. Your computer will run like new!",
      
      'hardware': "Hardware repair costs ₹800-5000 depending on the component. We repair motherboards, RAM, storage devices with component-level expertise and quality parts.",
      
      'data': "Data recovery costs ₹1500-4000. We have 90% success rate recovering files from damaged drives. No data recovered = no charge policy!",
      
      'software': "Software installation costs ₹300-800. Includes OS installation, driver setup, and system optimization. We use only licensed software.",
      
      // Policies
      'doorstep': "Yes! We provide doorstep service anywhere in Surat. Our technicians come to your location with all necessary tools. No need to carry heavy computers!",
      
      'warranty': "All repairs come with 30-day warranty. If the same issue occurs within 30 days, we fix it for free! We also provide 6-month warranty on screen replacements.",
      
      'appointment': "You can book an appointment by:\n1. Clicking 'Book Appointment' on our website\n2. Calling +91-93162 56101\n3. WhatsApp us\n\nWe'll confirm within 15 minutes!",
      
      // Contact
      'contact': "Contact Computer World:\n📞 Phone: +91-93162 56101\n📧 Email: computerworldsurat@gmail.com\n📍 Service Area: All of Surat\n🕒 Available: 9 AM - 7 PM",
      
      'price': "Our pricing:\n• Screen Replacement: ₹3000-8000\n• Virus Removal: ₹500-1000\n• Hardware Repair: ₹800-5000\n• Data Recovery: ₹1500-4000\n• Software Installation: ₹300-800\n\nTransparent pricing, no hidden charges!",
      
      // Default
      'default': "I can help you with:\n• Service information & pricing\n• Booking appointments\n• Warranty details\n• Contact information\n\nFor complex issues, please call +91-93162 56101 or book an appointment for personalized assistance!"
    }

    // Simple keyword matching
    const lowerMessage = message.toLowerCase()
    let reply = responses.default

    if (lowerMessage.includes('service') || lowerMessage.includes('offer') || lowerMessage.includes('what')) {
      reply = responses.services
    } else if (lowerMessage.includes('screen') || lowerMessage.includes('display') || lowerMessage.includes('lcd')) {
      reply = responses.screen
    } else if (lowerMessage.includes('virus') || lowerMessage.includes('malware') || lowerMessage.includes('slow')) {
      reply = responses.virus
    } else if (lowerMessage.includes('hardware') || lowerMessage.includes('motherboard') || lowerMessage.includes('ram')) {
      reply = responses.hardware
    } else if (lowerMessage.includes('data') || lowerMessage.includes('recover') || lowerMessage.includes('lost')) {
      reply = responses.data
    } else if (lowerMessage.includes('software') || lowerMessage.includes('install') || lowerMessage.includes('windows')) {
      reply = responses.software
    } else if (lowerMessage.includes('doorstep') || lowerMessage.includes('home') || lowerMessage.includes('visit')) {
      reply = responses.doorstep
    } else if (lowerMessage.includes('warranty') || lowerMessage.includes('guarantee')) {
      reply = responses.warranty
    } else if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
      reply = responses.appointment
    } else if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('call')) {
      reply = responses.contact
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('charge')) {
      reply = responses.price
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      reply = "Hello! I'm here to help with your computer repair needs. What would you like to know about our services?"
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      reply = "You're welcome! Feel free to ask if you have any other questions. We're here to help! 😊"
    }

    return NextResponse.json({
      success: true,
      reply: reply
    })

  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate response'
    }, { status: 500 })
  }
}
