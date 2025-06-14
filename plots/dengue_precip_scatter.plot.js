function renderDenguePrecipScatterPlot(containerSelector, csvPath) {
  const width = 700;
  const height = 400;
  const margin = { top: 50, right: 30, bottom: 60, left: 160 }; // Increased left margin

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  d3.csv(csvPath).then(data => {
    data.forEach(d => {
      d.AnnualPrecipitation = +d['Annual.precipitation'];
      d.Total = +d.Total;
    });

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.Total)).nice()
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d.AnnualPrecipitation)).nice()
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleSequential(d3.interpolateYlGnBu)
      .domain(d3.extent(data, d => d.AnnualPrecipitation));

    // X Axis
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5)) // 5 evenly spaced ticks
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("Total Dengue Cases");

    // Y Axis
    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -50)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("Annual Precipitation (mm)");

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "6px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("opacity", 0);

    // Circles
    svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => x(d.Total))
      .attr("cy", d => y(d.AnnualPrecipitation))
      .attr("r", 5)
      .attr("fill", d => color(d.AnnualPrecipitation))
      .attr("opacity", 0.7)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("stroke", "black")
          .attr("stroke-width", 1.5)
          .attr("opacity", 1);

        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(`<strong>${d.Country}</strong><br>
                      <b>Year</b>: ${d.Year}<br>
                      <b>Total Cases:</b> ${d.Total.toLocaleString()}<br>
                      <b>Precipitation:</b> ${d.AnnualPrecipitation.toLocaleString()} mm`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("stroke", "none")
          .attr("opacity", 0.7);

        tooltip.transition().duration(300).style("opacity", 0);
      });

    // Color Legend (next to y-axis)
    const legendHeight = 200;
    const legendWidth = 15;

    const legendScale = d3.scaleLinear()
      .domain(color.domain())
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .ticks(6);

    const legendX = margin.left - 120;
    const legendY = margin.top+50;

    const legendDefs = svg.append("defs");

    const gradientId = "precip-gradient";
    const gradient = legendDefs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    d3.range(0, 1.01, 0.1).forEach(t => {
      gradient.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", color(color.domain()[0] + t * (color.domain()[1] - color.domain()[0])));
    });

    const legendGroup = svg.append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    legendGroup.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", `url(#${gradientId})`);

    legendGroup.append("g")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis);

    legendGroup.append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .text("Precipitation (mm)")
      .attr("font-size", "10px");
  });
}
