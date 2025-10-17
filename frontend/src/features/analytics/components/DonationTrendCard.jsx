import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  CartesianGrid,
  YAxis,
} from 'recharts';

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function DonationTrendCard({ data = [] }) {
  const hasData = Array.isArray(data) && data.some(point => (point?.total ?? 0) > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Rolling 12-Month Gift Velocity</CardTitle>
        <CardDescription>
          Month-over-month totals calculated from the most recent donor gift records.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="donationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                stroke="#6b7280"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => currencyFormatter.format(value)}
                cursor={{ stroke: '#2563eb', strokeDasharray: '3 3', strokeOpacity: 0.25 }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: '#e5e7eb',
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#2563eb"
                fill="url(#donationGradient)"
                strokeWidth={2}
                name="Gifts"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
            <div>
              <p className="font-medium text-gray-600">No qualifying gifts on record yet.</p>
              <p className="text-xs text-gray-500">
                Gift velocity will populate automatically once donors record gift activity with dates.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DonationTrendCard;
