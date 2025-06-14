function renderDengueBarChart(containerSelector, csvPath) {
  d3.csv(csvPath, d3.autoType).then(data => {
    // Sort data descending by Total
    data.sort((a, b) => d3.descending(a.Total, b.Total));

    const margin = { top: 20, right: 30, bottom: 40, left: 180 };
    const width = 800 - margin.left - margin.right;
    const height = data.length * 35;

    const svg = d3.select(containerSelector)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale
    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Total)])
      .range([0, width]);

    // Y scale
    const y = d3.scaleBand()
      .domain(data.map(d => d.Country))
      .range([0, height])
      .padding(0.2);

    // X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")));

    // Y axis
    svg.append("g")
      .call(d3.axisLeft(y));

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "6px 12px")
      .style("background", "rgba(0,0,0,0.75)")
      .style("color", "#fff")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Bars
    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", d => y(d.Country))
      .attr("width", d => x(d.Total))
      .attr("height", y.bandwidth())
      .attr("fill", "#69b3a2")
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d.Country}</strong><br/>Total: ${d3.format(",")(d.Total)}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
        d3.select(this).attr("fill", "#40a389");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(300).style("opacity", 0);
        d3.select(this).attr("fill", "#69b3a2");
      });
  });
}
