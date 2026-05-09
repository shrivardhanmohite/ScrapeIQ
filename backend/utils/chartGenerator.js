export function generateChartSuggestions(data = []) {

  if (!Array.isArray(data) || data.length === 0) {

    return [];
  }

  const sample = data[0];

  const keys = Object.keys(sample);

  const numericKeys = [];

  const categoricalKeys = [];

  for (const key of keys) {

    const value = sample[key];

    if (
      typeof value === "number"
    ) {

      numericKeys.push(key);

    } else {

      categoricalKeys.push(key);
    }
  }

  const charts = [];

  /* =========================================
     BAR CHART
  ========================================= */

  if (
    categoricalKeys.length > 0 &&
    numericKeys.length > 0
  ) {

    charts.push({

      type: "bar",

      title:
        `${numericKeys[0]} by ${categoricalKeys[0]}`,

      xKey: categoricalKeys[0],

      yKey: numericKeys[0]
    });
  }

  /* =========================================
     PIE CHART
  ========================================= */

  if (categoricalKeys.length > 0) {

    charts.push({

      type: "pie",

      title:
        `${categoricalKeys[0]} Distribution`,

      dataKey: categoricalKeys[0]
    });
  }

  /* =========================================
     LINE CHART
  ========================================= */

  if (
    numericKeys.length >= 1
  ) {

    charts.push({

      type: "line",

      title:
        `${numericKeys[0]} Trend`,

      xKey:
        categoricalKeys[0] || "index",

      yKey: numericKeys[0]
    });
  }

  return charts;
}