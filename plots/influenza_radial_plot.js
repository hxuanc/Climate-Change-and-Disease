function renderRadialFlu(containerN, containerS, data) {
  const container = document.querySelector(containerN);
  const containerWidth = container.clientWidth;
  const margin = { top: 30, right: 30, bottom: 40, left: 30 };
  const width = 500;
  const height = 700 - margin.top - margin.bottom;
  const innerRadius = 100;
  const outerRadius = Math.min(width, height) / 2 - 10;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Pastel season color mapping
  const seasonColors = {
    winter: "#7da5cf",   // pastel blue
    spring: "#afe2a0",   // pastel green
    summer: "#f6c881",   // pastel peach
    autumn: "#f79c9c"    // pastel reddish-pink
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
      .domain(d3.range(12));

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

    // Tooltip
    let tooltip = d3.select(container).select(".radial-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select(container)
        .append("div")
        .attr("class", "radial-tooltip")
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
        svg.selectAll("path").attr("opacity", 0.2);
        d3.select(this).attr("opacity", 1)
          .attr("stroke", "#000")
          .attr("stroke-width", 1.5);

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
        svg.selectAll("path")
          .attr("opacity", 0.8)
          .attr("stroke", null)
          .attr("stroke-width", null);
        tooltip.style("display", "none");
      });

    // Add month labels
    const labelRadius = outerRadius - 315;
    svg.selectAll("text.month-label")
      .data(d3.range(12))
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

    // Add season legend
    const legendData = [
      { season: "Winter", color: seasonColors.winter },
      { season: "Spring", color: seasonColors.spring },
      { season: "Summer", color: seasonColors.summer },
      { season: "Autumn", color: seasonColors.autumn }
    ];

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(-${width / 2 }, -${height / 2 - 200})`);

    legend.selectAll("rect")
      .data(legendData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", d => d.color);

    legend.selectAll("text")
      .data(legendData)
      .enter()
      .append("text")
      .attr("x", 20)
      .attr("y", (d, i) => i * 20 + 11)
      .text(d => d.season)
      .attr("font-size", "12px")
      .attr("fill", "#333");
  }

  // Global update function
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
