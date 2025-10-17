import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { formatCurrency } from '@/lib/formatters.js';

export function SegmentPerformanceCard({ segments = [], totalDonors = 0 }) {
  const hasSegments = Array.isArray(segments) && segments.length > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Segment Performance</CardTitle>
        <CardDescription>
          Lifetime giving cohorts with average contribution and share of the donor base.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSegments ? (
          segments.map(segment => {
            const ratio = totalDonors > 0 ? (segment.count / totalDonors) * 100 : 0;
            return (
              <div
                key={segment.segment}
                className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{segment.label}</p>
                    <p className="text-xs text-gray-500">{segment.description}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">{segment.count.toLocaleString()}</p>
                    <p>{formatCurrency(segment.totalDonations)}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Progress value={ratio} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{ratio.toFixed(1)}% of portfolio</span>
                    <span>Avg gift {formatCurrency(segment.averageDonation)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
            <div>
              <p className="font-medium text-gray-600">No giving cohorts detected yet.</p>
              <p className="text-xs text-gray-500">
                Segments will activate once donors accumulate lifetime giving history.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SegmentPerformanceCard;
