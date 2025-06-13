function renderPrecipStripChart(containerSelector, csvPath) {
  const width = 900;
  const height = 500;
  const margin = { top: 50, right: 60, bottom: 50, left: 150 };

  d3.select(containerSelector).selectAll("*").remove();

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const tooltip = d3.select(containerSelector)
    .append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "6px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("opacity", 0);

  d3.csv(csvPath).then(data => {
    // Group and aggregate data
    const grouped = d3.groups(
      data.filter(d => d.Decade === "1950" || d.Decade === "2010"),
      d => d.Entity,
      d => d.Decade
    );

    const aggregatedData = [];

    grouped.forEach(([country, decadeEntries]) => {
      decadeEntries.forEach(([decade, records]) => {
        const meanAnomaly = d3.mean(records, r => +r["Annual.precipitation.anomaly"]);
        aggregatedData.push({
          Entity: country,
          Decade: decade,
          "Annual.precipitation.anomaly": meanAnomaly,
          Region: records[0].Region
        });
      });
    });

    const regions = Array.from(new Set(aggregatedData.map(d => d.Region))).sort();
    const yScale = d3.scaleBand()
      .domain(regions)
      .range([margin.top, height - margin.bottom])
      .padding(0.4);

    const xExtent = d3.extent(aggregatedData, d => d["Annual.precipitation.anomaly"]);
    const xScale = d3.scaleLinear()
    .domain([-400, 500])
    .range([margin.left, width - margin.right]);

    const ySubScale = d3.scalePoint()
      .domain(["1950", "2010"])
      .range([0, yScale.bandwidth()])
      .padding(0.5);

    const colorMax = 300; // or another cutoff value
    const colorScale = d3.scaleDiverging()
    .domain([-colorMax, 0, colorMax])
    .interpolator(d3.interpolateRdBu);

    const anomalyByCountry2010 = {};
    aggregatedData.forEach(d => {
      if (d.Decade === "2010") {
        anomalyByCountry2010[d.Entity] = d["Annual.precipitation.anomaly"];
      }
    });

    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(8));

    svg.append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale));

    const yAxisRight = svg.append("g")
      .attr("transform", `translate(${width - margin.right + 5}, 0)`);

    regions.forEach(region => {
      ["1950", "2010"].forEach(decade => {
        yAxisRight.append("text")
          .attr("x", 0)
          .attr("y", yScale(region) + ySubScale(decade))
          .attr("dy", "0.35em")
          .style("font-size", "10px")
          .text(decade);
      });

      svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", yScale(region) + yScale.bandwidth())
        .attr("y2", yScale(region) + yScale.bandwidth())
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "2,2");
    });

    const dots = svg.selectAll(".dot")
      .data(aggregatedData)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d["Annual.precipitation.anomaly"]))
      .attr("cy", d => yScale(d.Region) + ySubScale(d.Decade))
      .attr("r", 4)
      .attr("fill", d => colorScale(anomalyByCountry2010[d.Entity]))
      .attr("stroke", "none")
      .attr("opacity", 1)
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(
          `<strong>Country:</strong> ${d.Entity}<br/>
           <strong>Decade:</strong> ${d.Decade}<br/>
           <strong>Anomaly:</strong> ${d["Annual.precipitation.anomaly"].toFixed(2)}`
        )
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);

        // Highlight same country for both decades
        dots
          .attr("stroke", dot => dot.Entity === d.Entity ? "black" : "none")
          .attr("stroke-width", dot => dot.Entity === d.Entity ? 1.5 : 0)
          .attr("opacity", dot => dot.Entity === d.Entity ? 1 : 0.2);
      })
      .on("mouseout", () => {
        tooltip.transition().duration(300).style("opacity", 0);
        dots
          .attr("stroke", "none")
          .attr("opacity", 1);
      });

    // Draw mean lines above dots
    const nested = d3.group(aggregatedData, d => d.Region, d => d.Decade);
    nested.forEach((regionGroup, region) => {
      regionGroup.forEach((entries, decade) => {
        const mean = d3.mean(entries, d => d["Annual.precipitation.anomaly"]);
        svg.append("line")
          .attr("x1", xScale(mean))
          .attr("x2", xScale(mean))
          .attr("y1", yScale(region) + ySubScale(decade) - 8)
          .attr("y2", yScale(region) + ySubScale(decade) + 8)
          .attr("stroke", "#222")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "4,2");
      });
    });
  });
}
