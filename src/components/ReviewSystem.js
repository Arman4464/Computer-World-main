'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'

export default function ReviewSystem({ appointment, onReviewSubmitted }) {
  const [isOpen, setIsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState({
    rating: 0,
    review_text: '',
    technician_name: '',
    service_quality: 0,
    punctuality: 0,
    would_recommend: true
  })

  const supabase = createClient()

  const handleStarClick = (field, rating) => {
    setReview(prev => ({ ...prev, [field]: rating }))
  }

  const StarRating = ({ rating, onRatingChange, label }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`w-8 h-8 ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-300 dark:text-gray-600'
            } hover:text-yellow-400 transition-colors`}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (review.rating === 0) {
      toast.error('Please provide an overall rating')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          appointment_id: appointment.id,
          user_id: appointment.user_id,
          ...review
        })

      if (error) throw error

      // Send thank you notification
      await fetch('/api/notifications/review-submitted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          rating: review.rating,
          customerPhone: appointment.phone
        })
      }).catch(console.error)

      toast.success('Thank you for your review!')
      setIsOpen(false)
      onReviewSubmitted?.()
      
    } catch (error) {
      console.error('Review submission error:', error)
      toast.error('Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (appointment.status !== 'completed') return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
      >
        ⭐ Write Review
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Rate Your Experience</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-2">{appointment.service_type}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Completed on {new Date(appointment.completion_date).toLocaleDateString()}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Overall Rating */}
              <StarRating
                rating={review.rating}
                onRatingChange={(rating) => handleStarClick('rating', rating)}
                label="Overall Experience"
              />

              {/* Service Quality */}
              <StarRating
                rating={review.service_quality}
                onRatingChange={(rating) => handleStarClick('service_quality', rating)}
                label="Service Quality"
              />

              {/* Punctuality */}
              <StarRating
                rating={review.punctuality}
                onRatingChange={(rating) => handleStarClick('punctuality', rating)}
                label="Punctuality"
              />

              {/* Technician Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Technician Name (Optional)
                </label>
                <input
                  type="text"
                  value={review.technician_name}
                  onChange={(e) => setReview(prev => ({ ...prev, technician_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                  placeholder="Name of the technician who served you"
                />
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Review (Optional)
                </label>
                <textarea
                  value={review.review_text}
                  onChange={(e) => setReview(prev => ({ ...prev, review_text: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                  placeholder="Tell us about your experience with Computer World..."
                />
              </div>

              {/* Would Recommend */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="recommend"
                  checked={review.would_recommend}
                  onChange={(e) => setReview(prev => ({ ...prev, would_recommend: e.target.checked }))}
                  className="w-4 h-4 text-yellow-600 bg-white border-gray-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor="recommend" className="text-sm text-gray-700 dark:text-gray-300">
                  I would recommend Computer World to others
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || review.rating === 0}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
