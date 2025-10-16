import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx'
import { formatCurrency } from '@/lib/formatters.js'
import DonorQuickView from './DonorQuickView.jsx'

export function DonorSuggestionList({
  suggestions,
  searchTerm,
  activeDonorId,
  onActiveChange,
}) {
  const handleOpenChange = (donorId) => (open) => {
    onActiveChange(open ? donorId : null)
  }

  if (!searchTerm) return null

  return (
    <div className="absolute left-0 right-0 top-full mt-2 z-20 max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
      {suggestions.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-500">No donors found for "{searchTerm}"</div>
      ) : (
        suggestions.map((donor) => (
          <Popover
            key={donor.id}
            open={activeDonorId === donor.id}
            onOpenChange={handleOpenChange(donor.id)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-start justify-between px-4 py-3 text-left transition hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {donor.firstName} {donor.lastName}
                  </div>
                  {donor.email && <div className="text-xs text-gray-500">{donor.email}</div>}
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {formatCurrency(donor.totalDonations)}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <DonorQuickView donor={donor} />
            </PopoverContent>
          </Popover>
        ))
      )}
    </div>
  )
}

export default DonorSuggestionList
