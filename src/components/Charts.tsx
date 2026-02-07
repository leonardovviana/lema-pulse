import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface ChartData {
  name: string;
  value: number;
}

interface DailyData {
  date: string;
  completed: number;
  target: number;
}

const COLORS = ['#90205D', '#FF9F00', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

interface PieChartCardProps {
  title: string;
  data: ChartData[];
}

export function PieChartCard({ title, data }: PieChartCardProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card-elevated p-6">
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} respostas`, 'Total']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-2">
        Total: {total} respostas
      </p>
    </div>
  );
}

interface BarChartCardProps {
  title: string;
  data: DailyData[];
}

export function BarChartCard({ title, data }: BarChartCardProps) {
  const formattedData = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
  }));

  return (
    <div className="card-elevated p-6">
      <h3 className="font-semibold text-lg mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar 
              dataKey="completed" 
              name="Realizadas" 
              fill="#90205D" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="target" 
              name="Meta" 
              fill="#FF9F00" 
              radius={[4, 4, 0, 0]}
              opacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
