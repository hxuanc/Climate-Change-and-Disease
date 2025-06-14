function renderTempChoroplethMap(containerSelector, geoJsonPath, dataPath) {
  const container = document.querySelector(containerSelector);
  const width = container.clientWidth;
  const height = 400;
  const startYear = 1950;

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoNaturalEarth1()
    .scale(150)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  const tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("padding", "6px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("opacity", 0);

  const colorScale = d3.scaleDiverging()
    .domain([50, 0, -50]) // Placeholder — will update after data load
    .interpolator(d3.interpolateRdBu)
    .clamp(true);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  Promise.all([
    d3.json(geoJsonPath),
    d3.csv(dataPath)
  ]).then(([world, tempData]) => {
    const tempLookup = {};
    tempData.forEach(d => {
      const key = `${d.Country}-${d.Year}-${d.Month}`;
      tempLookup[key] = +d["Monthly Average Temperature"];
    });

    // Compute min/mid/max temps
    const temps = tempData.map(d => +d["Monthly Average Temperature"]);
    const minTemp = d3.min(temps);
    const maxTemp = d3.max(temps);
    const midTemp = (minTemp + maxTemp) / 2;

    // Update color scale with real values
    colorScale.domain([maxTemp, midTemp, minTemp]);

    const countries = world.features;
    const timelineSlider = d3.select("#choropleth-timeline");

    // Clear and build external legend
    const legendWidth = 300;
    const legendHeight = 10;

    d3.select("#temp-choropleth-legend-container").html(""); // Clear any previous

    const legendSvg = d3.select("#temp-choropleth-legend-container")
      .append("svg")
      .attr("width", legendWidth)
      .attr("height", 50);

    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");

    linearGradient.selectAll("stop")
      .data([
        { offset: "0%", color: colorScale(minTemp) },
        { offset: "50%", color: colorScale(midTemp) },
        { offset: "100%", color: colorScale(maxTemp) }
      ])
      .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    legendSvg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)")
      .style("stroke", "#ccc")
      .style("stroke-width", "1");

    const legendScale = d3.scaleLinear()
      .domain([minTemp, maxTemp])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => `${d.toFixed(1)}°C`);

    legendSvg.append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .select(".domain").remove();

    const updateMap = () => {
      const timelineIndex = +timelineSlider.property("value");
      const year = startYear + Math.floor(timelineIndex / 12);
      const monthIndex = timelineIndex % 12;
      const monthName = monthNames[monthIndex];

      d3.select("#choropleth-timeline-label").text(`${monthName} ${year}`);

      svg.selectAll("path")
        .data(countries)
        .join("path")
        .attr("class", "choropleth-country")
        .attr("d", path)
        .attr("fill", d => {
          const name = d.properties.name;
          const key = `${name}-${year}-${monthName}`;
          const temp = tempLookup[key];
          return temp !== undefined ? colorScale(temp) : "#ccc";
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
          const name = d.properties.name;
          const key = `${name}-${year}-${monthName}`;
          const temp = tempLookup[key];

          svg.selectAll(".choropleth-country").transition().duration(200).style("opacity", 0.2);
          d3.select(this).transition().duration(200).style("opacity", 1).style("stroke", "black");

          tooltip
            .html(`
              <strong>${name}</strong><br>
              ${monthName} ${year}<br>
              Temp: ${temp !== undefined ? temp.toFixed(2) + "°C" : "N/A"}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .transition()
            .duration(200)
            .style("opacity", 1);
        })
        .on("mouseout", function() {
          svg.selectAll(".choropleth-country").transition().duration(200).style("opacity", 1).style("stroke", "#333");
          tooltip.transition().duration(200).style("opacity", 0);
        });
    };

    timelineSlider.on("input", updateMap);
    updateMap(); // Initial render
  });
}
