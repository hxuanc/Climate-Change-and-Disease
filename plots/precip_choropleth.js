function renderYearlyChoropleth(containerSelector, geoJsonPath, dataPath) {
  const width = 960;
  const height = 500;

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoNaturalEarth1().scale(160).translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);

  const tooltip = d3.select(containerSelector).append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("z-index", 9999);

  const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateBlues)
    .clamp(true);

  Promise.all([
    d3.json(geoJsonPath),
    d3.csv(dataPath)
  ]).then(([world, data]) => {
    const countries = world.features;

    const valueLookup = {};
    const allYears = new Set();
    const allValues = [];
    data.forEach(d => {
      const key = `${d.Country}-${d.Year}`;
      const val = +d["Annual.precipitation"];
      valueLookup[key] = val;
      allYears.add(+d.Year);
      allValues.push(val);
    });

    const yearsArray = Array.from(allYears).sort((a, b) => a - b);
    const minYear = 1950;
    const maxYear = 2024;

    const slider = d3.select("#yearly-choropleth-slider")
      .attr("min", minYear)
      .attr("max", maxYear)
      .attr("value", maxYear);

    const label = d3.select("#yearly-choropleth-label");

    colorScale.domain([d3.min(allValues), d3.max(allValues)]);

    function updateMap() {
      const year = +slider.property("value");
      label.text(year);

      svg.selectAll("path.yearly-country")
        .data(countries)
        .join("path")
          .attr("class", "yearly-country")
          .attr("d", path)
          .attr("fill", d => {
            const key = `${d.properties.name}-${year}`;
            const val = valueLookup[key];
            return val != null ? colorScale(val) : "#ccc";
          })
          .attr("stroke", "#333")
          .attr("stroke-width", d => (valueLookup[`${d.properties.name}-${year}`] != null) ? 0.5 : 0.2)
          .on("mouseover", function(event, d) {
            svg.selectAll("path.yearly-country").transition().duration(200).style("opacity", 0.2);
            d3.select(this).transition().duration(200).style("opacity", 1).style("stroke", "black");

            const val = valueLookup[`${d.properties.name}-${year}`];
            tooltip.html(
              `<strong>${d.properties.name}</strong><br>
               Year: ${year}<br>
               Precipitation: ${val != null ? val.toFixed(2) : "N/A"} mm`
            )
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .transition().duration(200).style("opacity", 1);
          })
          .on("mouseout", function() {
            svg.selectAll("path.yearly-country").transition().duration(200).style("opacity", 1).style("stroke", "#333");
            tooltip.transition().duration(200).style("opacity", 0);
          });
    }

    slider.on("input", updateMap);
    updateMap();
  }).catch(err => console.error("Choropleth load error:", err));
}
