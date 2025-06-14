function renderClimateChart(containerSelector, csvPath) {
  const container = document.querySelector(containerSelector);
  const containerWidth = container.clientWidth;
  const margin = { top: 30, right: 30, bottom: 60, left: 30 };
  const width = containerWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const tooltip = d3.select(containerSelector)
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "rgba(255, 255, 255, 0.95)")
    .style("border", "1px solid #ccc")
    .style("padding", "10px")
    .style("border-radius", "6px")
    .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("max-width", "200px");

  d3.csv(csvPath).then(data => {
    data.forEach(d => {
      d.Precipitation = +d.Precipitation;
      d.MinTemp = +d['Average Minimum Surface Air Temperature'];
      d.MeanTemp = +d['Average Mean Surface Air Temperature'];
      d.MaxTemp = +d['Average Maximum Surface Air Temperature'];
    });

    const monthMap = {
      Jan: "January", Feb: "February", Mar: "March",
      Apr: "April", May: "May", Jun: "June",
      Jul: "July", Aug: "August", Sep: "September",
      Oct: "October", Nov: "November", Dec: "December"
    };

    data.forEach(d => {
      d.MonthFull = monthMap[d.Month];
    });

    const monthOrder = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    data.sort((a, b) => monthOrder.indexOf(a.MonthFull) - monthOrder.indexOf(b.MonthFull));
    const months = data.map(d => d.MonthFull);

    const x = d3.scaleBand()
      .domain(months)
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const yLeft = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Precipitation)]).nice()
      .range([height - margin.bottom, margin.top]);

    const yRight = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.MaxTemp)]).nice()
      .range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end")
      .attr("dx", "-0.6em")
      .attr("dy", "0.25em");

    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yLeft))
      .append("text")
      .attr("x", -30)
      .attr("y", margin.top - 20)
      .attr("fill", "black")
      .attr("text-anchor", "start")
      .text("Precipitation (mm)");

    svg.append("g")
      .attr("transform", `translate(${width - margin.right}, 0)`)
      .call(d3.axisRight(yRight))
      .append("text")
      .attr("x", 30)
      .attr("y", margin.top - 20)
      .attr("fill", "black")
      .attr("text-anchor", "end")
      .text("Temperature (°C)");

    svg.selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.MonthFull))
      .attr("y", d => yLeft(d.Precipitation))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - yLeft(d.Precipitation))
      .attr("fill", "#c7e9b4")
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("opacity", 0.6);
        tooltip.style("visibility", "visible")
          .html(`
            <strong>${d.MonthFull}</strong><br>
            <b>Precipitation</b>: ${d.Precipitation} mm<br>
            <b>Min Temperature</b>: ${d.MinTemp} °C<br>
            <b>Mean Temperature</b>: ${d.MeanTemp} °C<br>
            <b>Max Temperature</b>: ${d.MaxTemp} °C
          `);
      })
      .on("mousemove", event => {
        tooltip
          .style("top", `${event.pageY - 70}px`)
          .style("left", `${event.pageX + 15}px`);
      })
      .on("mouseout", event => {
        d3.select(event.currentTarget).attr("opacity", 1);
        tooltip.style("visibility", "hidden");
      });

    const line = key => d3.line()
      .x(d => x(d.MonthFull) + x.bandwidth() / 2)
      .y(d => yRight(d[key]));

    const tempLines = [
      { key: "MinTemp", color: "#cb5b5b", label: "Min Temperature" },
      { key: "MeanTemp", color: "#f6b252", label: "Mean Temperature" },
      { key: "MaxTemp", color: "#3c87b9", label: "Max Temperature" }
    ];

    tempLines.forEach(temp => {
      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", temp.color)
        .attr("stroke-width", 2)
        .attr("d", line(temp.key));

      svg.selectAll(`.dot-${temp.key}`)
        .data(data)
        .join("circle")
        .attr("class", `dot-${temp.key}`)
        .attr("cx", d => x(d.MonthFull) + x.bandwidth() / 2)
        .attr("cy", d => yRight(d[temp.key]))
        .attr("r", 4)
        .attr("fill", temp.color)
        .on("mouseover", (event, d) => {
          d3.select(event.currentTarget).attr("opacity", 0.6);
          tooltip.style("visibility", "visible")
            .html(`
              <strong>${d.MonthFull}</strong><br>
              <b>Precipitation</b>: ${d.Precipitation} mm<br>
              <b>Min Temperature</b>: ${d.MinTemp} °C<br>
              <b>Mean Temperature</b>: ${d.MeanTemp} °C<br>
              <b>Max Temperature</b>: ${d.MaxTemp} °C
            `);
        })
        .on("mousemove", event => {
          tooltip
            .style("top", `${event.pageY - 70}px`)
            .style("left", `${event.pageX + 15}px`);
        })
        .on("mouseout", (event) => {
          d3.select(event.currentTarget).attr("opacity", 1);
          tooltip.style("visibility", "hidden");
        });
    });

    const legend = svg.selectAll(".legend")
      .data(tempLines)
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(5, ${margin.top + i * 14})`);

    legend.append("line")
      .attr("x1", width - 150)
      .attr("x2", width - 130)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", d => d.color)
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", width - 125)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .text(d => d.label);
  });
}
