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

const hasValidChartData = (chart, data) => {
  if (!Array.isArray(data) || data.length === 0) return false;
  const firstRow = data.find((row) => row && typeof row === "object");
  if (!firstRow) return false;

  if (chart.type === "pie") {
    if (!chart.dataKey) return false;
    return data.some((row) => {
      const value = row?.[chart.dataKey];
      return value !== undefined && value !== null && String(value).trim() !== "";
    });
  }

  if (!chart.xKey || !chart.yKey) return false;

  return data.some((row) => {
    const x = row?.[chart.xKey];
    const y = row?.[chart.yKey];
    return (
      x !== undefined && x !== null && String(x).trim() !== "" &&
      y !== undefined && y !== null && !isNaN(parseFloat(y))
    );
  });
};

export default function AutoCharts({

  data = [],

  charts = []
}) {

  const validCharts = charts.filter((chart) => hasValidChartData(chart, data));

  if (!validCharts.length) return null;

  return (

    <div className="charts-grid">

      {validCharts.map((chart, index) => (

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