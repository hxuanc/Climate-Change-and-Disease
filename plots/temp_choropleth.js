function renderTempChoroplethMap(containerSelector, geoJsonPath, dataPath) {
  const width = 960;
  const height = 500;
  const startYear = 1950;

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoNaturalEarth1().scale(160).translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("padding", "6px")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none");

  const colorScale = d3.scaleDiverging()
    .domain([50, 0, -50]) // Adjust this based on your data range
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

    const countries = world.features;
    const timelineSlider = d3.select("#choropleth-timeline");

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

    // Attach listener OUTSIDE updateMap, and call it once
    timelineSlider.on("input", updateMap);
    updateMap(); // Initial render
  });
}
