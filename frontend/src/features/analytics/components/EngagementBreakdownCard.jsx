import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.jsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#2563eb', '#0ea5e9', '#8b5cf6', '#cbd5f5'];

export function EngagementBreakdownCard({ breakdown }) {
  const segments = [
    {
      name: 'Omnichannel',
      value: breakdown?.omnichannelSubscribers ?? 0,
    },
    {
      name: 'Event Subscribers',
      value: breakdown?.eventSubscribers ?? 0,
    },
    {
      name: 'Newsletter Subscribers',
      value: breakdown?.newsletterSubscribers ?? 0,
    },
    {
      name: 'Unengaged',
      value: breakdown?.unengaged ?? 0,
    },
  ];

  const total = segments.reduce((sum, entry) => sum + entry.value, 0);
  const data = segments.filter(item => item.value > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Engagement Channels</CardTitle>
        <CardDescription>Breakdown of how donors opt-in to foundation communications.</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {total > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _, props) => {
                    const percent = ((value / total) * 100).toFixed(1);
                    return [`${value} donors (${percent}%)`, props?.payload?.name];
                  }}
                  contentStyle={{ borderRadius: 8, borderColor: '#e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
              {data.map((entry, index) => (
                <div key={entry.name} className="flex items-start gap-2">
                  <span
                    className="mt-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{entry.name}</p>
                    <p className="text-xs text-gray-500">
                      {entry.value} donors ({((entry.value / total) * 100).toFixed(1)}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
            <div>
              <p className="font-medium text-gray-600">No engagement data captured yet.</p>
              <p className="text-xs text-gray-500">
                As soon as donors opt-in to newsletters or events, this chart will illuminate channel
                effectiveness.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EngagementBreakdownCard;
