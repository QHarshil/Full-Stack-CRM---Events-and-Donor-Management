import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/formatters.js';

export function CityPerformanceCard({ cities = [] }) {
  const data = (cities ?? []).map(city => ({
    name: city.city,
    donors: city.count,
    total: city.totalDonations,
  }));
  const hasData = data.length > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Performing Cities</CardTitle>
        <CardDescription>Donor concentration and total lifetime value by primary city.</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis
                type="number"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#374151' }}
                width={110}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, key) => {
                  if (key === 'total') {
                    return [formatCurrency(value), 'Lifetime Giving'];
                  }
                  return [value, 'Active Donors'];
                }}
                contentStyle={{ borderRadius: 8, borderColor: '#e5e7eb' }}
              />
              <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
            <div>
              <p className="font-medium text-gray-600">No geographic trends available yet.</p>
              <p className="text-xs text-gray-500">
                Invite donors or record contributions to surface top performing regions.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CityPerformanceCard;
