function renderRadialFlu(containerN, containerS, data) {
  const margin = { top: 10, right: 40, bottom: 10, left: 40 },
    width = 1200 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;
  const innerRadius = 100;
  const outerRadius = Math.min(width, height) / 2 - 60; // add buffer to prevent clipping

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Season color mapping
  const seasonColors = {
    winter: "#4a90e2",
    spring: "#7ed957",
    summer: "#f5a623",
    autumn: "#d0021b"
  };

  function getSeason(month, hemisphere) {
    const seasons = hemisphere === "northern"
      ? ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"]
      : ["summer", "summer", "autumn", "autumn", "autumn", "winter", "winter", "winter", "spring", "spring", "spring", "summer"];
    return seasons[month];
  }

  const processedData = data.map(d => {
    const monthIndex = monthNames.indexOf(d.Month.trim());
    const influenzaA = parseFloat(d.Influenza_A) || 0;
    const influenzaB = parseFloat(d.Influenza_B) || 0;

    return {
      Year: +d.Year,
      Month: monthIndex,
      hemisphere: d.Country.includes("Northern") ? "northern" :
                 d.Country.includes("Southern") ? "southern" : null,
      Total: influenzaA + influenzaB
    };
  }).filter(d => d.hemisphere && d.Month >= 0);

  const nestedData = d3.group(processedData, d => d.hemisphere, d => d.Year);

  function drawChart(container, hemisphere, year) {
    d3.select(container).selectAll("svg").remove();

    const data = (nestedData.get(hemisphere)?.get(year)) || [];

    const svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2 + 60})`);

    const angleScale = d3.scaleBand()
        .range([0, 2 * Math.PI])
        .align(0)
        .domain(d3.range(12)); // force months from 0 to 11 in correct order


    const radiusScale = d3.scaleRadial()
      .range([innerRadius, outerRadius])
      .domain([0, d3.max(data, d => d.Total) || 1]);

    const colorScale = d3.scaleOrdinal()
      .domain(["winter", "spring", "summer", "autumn"])
      .range(Object.values(seasonColors));

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .startAngle(d => angleScale(d.Month))
        .endAngle(d => angleScale(d.Month) + angleScale.bandwidth())
        .padAngle(0.01)
        .padRadius(innerRadius);

    // Create tooltip div if it doesn't exist
    let tooltip = d3.select("#tooltip");
    if (tooltip.empty()) {
    tooltip = d3.select("body")
        .append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("display", "none")
        .style("font-size", "12px")
        .style("box-shadow", "0px 2px 8px rgba(0,0,0,0.15)");
}
    svg.selectAll("path")
      .data(data)
      .enter()
      .append("path")
      .attr("fill", d => colorScale(getSeason(d.Month, hemisphere)))
      .attr("d", d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(d => radiusScale(d.Total))
        .startAngle(d => angleScale(d.Month))
        .endAngle(d => angleScale(d.Month) + angleScale.bandwidth())
        .padAngle(0.01)
        .padRadius(innerRadius))
      .attr("opacity", 0.8)
      .on("mouseover", function (event, d) {
        d3.selectAll("path").attr("opacity", 0.2);  // Fade all
        d3.select(this).attr("opacity", 1)
            .attr("stroke", "#000")       // Add border on hover
            .attr("stroke-width", 1.5);   // Adjust thickness

        const month = monthNames[d.Month];
        const season = getSeason(d.Month, hemisphere);

        tooltip
            .style("display", "block")
            .html(`<strong>${month}</strong><br>Total: ${d.Total}<br>Season: ${season}`);
    })
    .on("mousemove", function (event) {
        tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function () {
        d3.selectAll("path")
            .attr("opacity", 0.8)
            .attr("stroke", null)         // Remove stroke
            .attr("stroke-width", null);  // Reset stroke width;  // Reset all
        tooltip.style("display", "none");
    });

    // Add internal month labels
    const labelRadius = outerRadius - 255;
    svg.selectAll("text.month-label")
        .data(d3.range(12)) // <-- use indices
        .enter()
        .append("text")
        .attr("class", "month-label")
        .attr("x", i => Math.sin(angleScale(i) + angleScale.bandwidth() / 2) * labelRadius)
        .attr("y", i => -Math.cos(angleScale(i) + angleScale.bandwidth() / 2) * labelRadius)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .text(i => monthNames[i]);
  }

  // Expose update function globally
  window.updateRadialFluCharts = function (selectedYear) {
    const hem = d3.select("#hemisphere-select").property("value");

    if (hem === "northern" || hem === "both") {
      drawChart(containerN, "northern", selectedYear);
      d3.select(containerN).style("display", "block");
    } else {
      d3.select(containerN).style("display", "none");
    }

    if (hem === "southern" || hem === "both") {
      drawChart(containerS, "southern", selectedYear);
      d3.select(containerS).style("display", "block");
    } else {
      d3.select(containerS).style("display", "none");
    }
  };
}
