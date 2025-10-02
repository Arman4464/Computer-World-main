import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, phoneNumber } = await request.json()
    
    console.log('WhatsApp API Request:', { message, phoneNumber })
    console.log('Environment check:', {
      hasToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      hasPhoneId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      tokenLength: process.env.WHATSAPP_ACCESS_TOKEN?.length,
      phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID
    })

    // Validate inputs
    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
    }

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

    // Clean phone number - ensure it starts with country code
    let cleanPhone = phoneNumber.toString().replace(/\D/g, '')
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      // Already has country code
    } else if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone // Add India country code
    } else {
      return NextResponse.json({ success: false, error: 'Invalid phone number format' }, { status: 400 })
    }

    const requestBody = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: { body: message }
    }

    console.log('Sending to WhatsApp API:', requestBody)

    const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    const result = await response.json()
    console.log('WhatsApp API Response:', { status: response.status, result })

    if (response.ok) {
      return NextResponse.json({ success: true, data: result })
    } else {
      console.error('WhatsApp API error:', result)
      
      // Handle specific error cases
      let errorMessage = 'Failed to send WhatsApp message'
      
      if (result.error) {
        if (result.error.code === 131056) {
          errorMessage = 'Phone number not registered on WhatsApp'
        } else if (result.error.code === 131051) {
          errorMessage = 'Invalid phone number format'
        } else if (result.error.code === 190) {
          errorMessage = 'WhatsApp token expired - contact admin'
        } else {
          errorMessage = result.error.message || errorMessage
        }
      }
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        details: result 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('WhatsApp route error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 })
  }
}
