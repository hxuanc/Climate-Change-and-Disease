function renderYearlyChoropleth(containerSelector, geoJsonPath, dataPath) {
  const container = document.querySelector(containerSelector);
  const width = container.clientWidth;  // ← grabs section's actual width

  const height = 500;

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const mapGroup = svg.append("g");

  const zoom = d3.zoom()
  .scaleExtent([1, 8]) // min/max zoom
  .on("zoom", (event) => {
    mapGroup.attr("transform", event.transform);
  });

  svg.call(zoom);

  const projection = d3.geoNaturalEarth1().scale(160).translate([width / 2, height / 2]);
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

  const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateYlGnBu)
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

    // Create a color legend inside its own container
    const legendWidth = 300;
    const legendHeight = 12;

    const legendSvg = d3.select("#yearly-choropleth-legend")
      .append("svg")
      .attr("width", legendWidth)
      .attr("height", 50);  // add some padding below the gradient

    const defs = legendSvg.append("defs");

    const linearGradient = defs.append("linearGradient")
      .attr("id", "legend-gradient-centered");

    linearGradient.selectAll("stop")
      .data(d3.ticks(0, 1, 10))
      .enter()
      .append("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", d => colorScale(colorScale.domain()[0] + d * (colorScale.domain()[1] - colorScale.domain()[0])));

    legendSvg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient-centered)");

    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format(".0f"));

    legendSvg.append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", "10px");

    legendSvg.append("text")
      .attr("x", legendWidth / 2)
      .attr("y", legendHeight + 30)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Annual Precipitation (mm)");
      
    function updateMap() {
      const year = +slider.property("value");
      label.text(year);

      mapGroup.selectAll("path.yearly-country")
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
            mapGroup.selectAll("path.yearly-country").transition().duration(200).style("opacity", 0.2);
            d3.select(this).transition().duration(200).style("opacity", 1).style("stroke", "black");

            const val = valueLookup[`${d.properties.name}-${year}`];
            tooltip.html(
              `<strong>${d.properties.name}</strong><br>
               <strong>Year:</strong> ${year}<br>
               <strong>Precipitation:</strong> ${val != null ? val.toFixed(2) : "N/A"} mm`
            )
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .transition().duration(200).style("opacity", 1);
          })
          .on("mouseout", function() {
            mapGroup.selectAll("path.yearly-country").transition().duration(200).style("opacity", 1).style("stroke", "#333");
            tooltip.transition().duration(200).style("opacity", 0);
          });
    }

    slider.on("input", updateMap);
    updateMap();
  }).catch(err => console.error("Choropleth load error:", err));
}
