import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'
import { formatCurrency, formatDate } from '@/lib/formatters.js'
import { Users, Calendar, MapPin, ClipboardList, Target, Trash2 } from 'lucide-react'
import {
  EVENT_STATUS_BADGE_VARIANT,
  DONOR_STATUS_LABELS,
  DONOR_STATUS_VARIANT,
} from '@/features/events/constants.js'
import DonorQuickView from '@/features/donors/components/DonorQuickView.jsx'

function EventMeta({ event }) {
  const eventTypes = useMemo(() => event?.eventType || [], [event])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm text-gray-700">
        <span className="inline-flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          {formatDate(event.date)}
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          {event.location}
        </span>
        <Badge variant={EVENT_STATUS_BADGE_VARIANT[event.status] || 'secondary'} className="capitalize">
          {event.status}
        </Badge>
      </div>
      <div className="text-sm text-gray-500">
        <span className="font-medium">Event types:</span>{' '}
        {eventTypes.length ? eventTypes.join(', ') : 'Not specified'}
      </div>
    </div>
  )
}

export function EventDetailView({
  event,
  isLoading,
  onBack,
  onRemoveDonor = () => {},
  canManageEvents = false,
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          Back to Events
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Loading event details...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          Back to Events
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Event not found</CardTitle>
            <CardDescription>
              We could not load this event. Please select another event or try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        Back to Events
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{event.name}</CardTitle>
          <CardDescription>{event.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EventMeta event={event} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <Target className="h-4 w-4 text-gray-500" />
                Fundraising
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-500">Target Amount</div>
                  <div className="font-semibold">{formatCurrency(event.targetAmount)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Actual Raised</div>
                  <div className="font-semibold">{formatCurrency(event.actualAmount)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <Users className="h-4 w-4 text-gray-500" />
                Attendance
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-500">Expected Attendees</div>
                  <div className="font-semibold">{event.expectedAttendees}</div>
                </div>
                <div>
                  <div className="text-gray-500">Actual Attendees</div>
                  <div className="font-semibold">{event.actualAttendees ?? 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <ClipboardList className="h-4 w-4 text-gray-500" />
              Notes
            </div>
            <p className="mt-3 text-sm text-gray-700">
              {event.notes?.trim() ? event.notes : 'No notes provided for this event.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invited Donors</CardTitle>
          <CardDescription>
            {event.eventDonors?.length
              ? `Tracking ${event.eventDonors.length} invitations`
              : 'No donors have been invited yet.'}
          </CardDescription>
        </CardHeader>
        {event.eventDonors?.length ? (
          <CardContent>
            <ScrollArea className="max-h-80">
              <div className="space-y-3 pr-2">
                {event.eventDonors.map((eventDonor) => (
                  <Dialog key={eventDonor.id}>
                    <div className="rounded-lg border p-3 text-sm text-gray-700">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className="w-full text-left focus:outline-none"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {eventDonor.donor?.firstName} {eventDonor.donor?.lastName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {eventDonor.donor?.email || 'Email not available'}
                                </div>
                              </div>
                              <Badge variant={DONOR_STATUS_VARIANT[eventDonor.status] || 'secondary'}>
                                {DONOR_STATUS_LABELS[eventDonor.status] || eventDonor.status}
                              </Badge>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div>
                                Match score:{' '}
                                {Math.round((eventDonor.matchScore || 0) * 100) / 100}
                              </div>
                              <div>
                                Invited: {eventDonor.invitedAt ? formatDate(eventDonor.invitedAt) : 'N/A'}
                              </div>
                              <div>
                                Responded:{' '}
                                {eventDonor.respondedAt ? formatDate(eventDonor.respondedAt) : 'Pending'}
                              </div>
                            </div>
                            {eventDonor.notes && (
                              <p className="mt-2 text-xs text-gray-600">Notes: {eventDonor.notes}</p>
                            )}
                          </button>
                        </DialogTrigger>
                        {canManageEvents && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="self-start text-red-600 hover:text-red-700"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation()
                              onRemoveDonor(event.id, eventDonor.donorId)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Donor Details</DialogTitle>
                      </DialogHeader>
                      <DonorQuickView donor={eventDonor.donor} />
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        ) : null}
      </Card>
    </div>
  )
}

export default EventDetailView
