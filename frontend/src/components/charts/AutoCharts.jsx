import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

const COLORS = [
  "#7c3aed",
  "#8b5cf6",
  "#a855f7",
  "#6366f1",
  "#4f46e5"
];

export default function AutoCharts({

  data = [],

  charts = []
}) {

  if (!charts.length) return null;

  return (

    <div className="charts-grid">

      {charts.map((chart, index) => (

        <div
          className="chart-card"
          key={index}
        >

          <h3>
            {chart.title}
          </h3>

          {/* BAR */}

          {chart.type === "bar" && (

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <BarChart data={data}>

                <XAxis dataKey={chart.xKey} />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey={chart.yKey}
                  fill="#7c3aed"
                />

              </BarChart>

            </ResponsiveContainer>
          )}

          {/* LINE */}

          {chart.type === "line" && (

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <LineChart data={data}>

                <XAxis dataKey={chart.xKey} />

                <YAxis />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey={chart.yKey}
                  stroke="#7c3aed"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>
          )}

          {/* PIE */}

          {chart.type === "pie" && (

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <PieChart>

                <Pie
                  data={data}
                  dataKey={chart.dataKey}
                  outerRadius={120}
                  label
                >

                  {data.map((_, idx) => (

                    <Cell
                      key={idx}
                      fill={
                        COLORS[
                          idx % COLORS.length
                        ]
                      }
                    />
                  ))}

                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>
          )}

        </div>
      ))}

    </div>
  );
}