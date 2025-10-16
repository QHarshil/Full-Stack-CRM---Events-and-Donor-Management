import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { formatCurrency, formatDate } from '@/lib/formatters.js'
import DonorQuickView from './DonorQuickView.jsx'

export function DonorList({
  donors,
  isLoading,
  searchTerm,
  activeDonorId,
  onActiveChange,
  events = [],
  inviteSelections = {},
  onInviteSelection = () => {},
  onInviteDonor = () => {},
  canInvite = false,
}) {
  const noDonorResults = searchTerm && donors.length === 0

  const handleOpenChange = (donorId) => (open) => {
    onActiveChange(open ? donorId : null)
  }

  const handleInviteSelectionChange = (donorId) => (value) => {
    onInviteSelection(donorId, value)
  }

  const handleInviteClick = (donorId) => (event) => {
    event.stopPropagation()
    onInviteDonor(donorId)
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading donors...</div>
  }

  if (noDonorResults) {
    return (
      <div className="text-sm text-gray-500">
        No donors found matching "{searchTerm}".
      </div>
    )
  }

  if (donors.length === 0) {
    return <div className="text-sm text-gray-500">No donors match the current filters.</div>
  }

  return donors.map((donor) => (
    <Popover
      key={donor.id}
      open={activeDonorId === donor.id}
      onOpenChange={handleOpenChange(donor.id)}
    >
      <div className="flex flex-col gap-4 rounded-lg border p-4 transition hover:bg-gray-50 focus-within:bg-gray-100 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full text-left focus:outline-none"
            >
              <div>
                <h3 className="font-medium">
                  {donor.firstName} {donor.lastName}
                </h3>
                {donor.email && <p className="text-sm text-gray-600">{donor.email}</p>}
                <p className="text-sm text-gray-500">
                  {donor.city}, {donor.province}
                </p>
                {donor.organization && (
                  <p className="mt-1 text-xs text-gray-500">Organization: {donor.organization}</p>
                )}
              </div>
              <div className="mt-3 text-sm text-gray-500">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(donor.totalDonations)}
                  </div>
                  <div className="text-xs text-gray-500">Total donations</div>
                  <div className="mt-2 text-xs text-gray-500">
                    Last gift: {formatCurrency(donor.lastGiftAmount)}
                    {donor.lastGiftDate ? ` (${formatDate(donor.lastGiftDate)})` : ''}
                  </div>
                </div>
                {donor.interests && donor.interests.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-end gap-1">
                    {donor.interests.slice(0, 3).map((interest, index) => (
                      <Badge key={index} variant="outline" className="text-xs capitalize">
                        {interest}
                      </Badge>
                    ))}
                    {donor.interests.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{donor.interests.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </button>
          </PopoverTrigger>
        </div>
        {canInvite && (
          <div className="flex flex-col gap-2 sm:w-60">
            <Select
              value={inviteSelections[donor.id] ?? ''}
              onValueChange={handleInviteSelectionChange(donor.id)}
              disabled={events.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={events.length ? 'Select event' : 'No events available'} />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={String(event.id)}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              disabled={events.length === 0 || !inviteSelections[donor.id]}
              onClick={handleInviteClick(donor.id)}
            >
              Invite Donor
            </Button>
          </div>
        )}
      </div>
      <PopoverContent align="end" className="w-80">
        <DonorQuickView donor={donor} />
      </PopoverContent>
    </Popover>
  ))
}

export default DonorList
