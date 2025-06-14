function renderFluTempScatterPlot(containerSelector, csvPath) {
  const width = 600;
  const height = 400;
  const margin = { top: 50, right: 30, bottom: 60, left: 60 };

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const tooltip = d3.select(containerSelector)
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(255,255,255,0.9)")
    .style("border", "1px solid #ccc")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  d3.csv(csvPath).then(data => {
    data.forEach(d => {
      d.avg_temp = +d.avg_temp;
      d.total_cases = +d.total_cases;
    });

    // Filter for year 2022
    data = data.filter(d => d.month_year && d.month_year.startsWith("2022"));

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.total_cases)).nice()
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d.avg_temp)).nice()
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
      .domain(["Northern", "Southern"])
      .range(["#98e4c8", "#f4a44a"]);

    // X Axis
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(8))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("Total Influenza Cases");

    // Y Axis (back to left)
    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -40)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("Average Temperature (°C)");

    // Horizontal reference line at y = 0
    if (y(0) >= margin.top && y(0) <= height - margin.bottom) {
      svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("stroke", "#888")
        .attr("stroke-width", 1);
    }

    // Scatter points
    const circles = svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => x(d.total_cases))
      .attr("cy", d => y(d.avg_temp))
      .attr("r", 4)
      .attr("fill", d => color(d.hemisphere))
      .attr("opacity", 0.7)
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(
          `<strong>Country:</strong> ${d.Entity}<br/>
           <strong>Total Cases:</strong> ${d.total_cases}<br/>
           <strong>Avg Temp:</strong> ${d.avg_temp} °C`
        )
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);

        d3.select(this)
          .attr("stroke", "black")
          .attr("stroke-width", 1.5)
          .attr("r", 6);

        circles.filter(e => e !== d)
          .attr("opacity", 0.1);
      })
      .on("mouseout", function(event, d) {
        tooltip.transition().duration(300).style("opacity", 0);

        d3.select(this)
          .attr("stroke", "none")
          .attr("r", 4);

        circles.attr("opacity", 0.7);
      });

    // Legend
    const legend = svg.selectAll(".legend")
      .data(color.domain())
      .join("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0,${i * 20})`);

    legend.append("rect")
      .attr("x", width - 100)
      .attr("y", margin.top)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color);

    legend.append("text")
      .attr("x", width - 80)
      .attr("y", margin.top + 10)
      .attr("dy", ".1em")
      .style("text-anchor", "start")
      .text(d => d);
  });
}
