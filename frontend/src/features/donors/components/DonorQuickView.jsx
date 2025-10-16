import { Badge } from '@/components/ui/badge.jsx'
import { formatCurrency, formatDate } from '@/lib/formatters.js'

const hasInterests = (donor) => Array.isArray(donor?.interests) && donor.interests.length > 0

export function DonorQuickView({ donor }) {
  if (!donor) return null

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-lg font-semibold text-gray-900">
          {donor.firstName} {donor.lastName}
        </h4>
        <p className="text-sm text-gray-500">{donor.email || 'Email not available'}</p>
        <p className="text-sm text-gray-500">
          {donor.city}, {donor.province}
        </p>
        {donor.organization && (
          <p className="text-xs text-gray-500 mt-1">Organization: {donor.organization}</p>
        )}
      </div>

      <div className="space-y-1 text-sm text-gray-700">
        <div className="flex justify-between">
          <span className="text-gray-500">Phone</span>
          <span>{donor.phone || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total donations</span>
          <span>{formatCurrency(donor.totalDonations)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Largest gift</span>
          <span>{formatCurrency(donor.largestGift)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Last gift</span>
          <span>
            {formatCurrency(donor.lastGiftAmount)}{' '}
            {donor.lastGiftDate ? `on ${formatDate(donor.lastGiftDate)}` : ''}
          </span>
        </div>
      </div>

      {hasInterests(donor) && (
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">Interests</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {donor.interests.map((interest, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs capitalize">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {donor.notes && (
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">Notes</div>
          <p className="mt-1 text-sm text-gray-600">{donor.notes}</p>
        </div>
      )}
    </div>
  )
}

export default DonorQuickView
