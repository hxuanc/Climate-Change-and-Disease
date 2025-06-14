function renderDengueProportionalMap(containerSelector, geoJsonPath, dataPath) {
  const width = 1200, height = 700;
  const maxTotal = 530000; // fixed max value across all time for consistency

  const svg = d3.select(containerSelector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoNaturalEarth1()
    .scale(180)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);
  const color = d3.scaleSequential()
    .domain([0, maxTotal])
    .interpolator(d3.interpolateOrRd);

  const radius = d3.scaleSqrt()
    .domain([0, maxTotal])
    .range([0, 30]); // consistent size scaling

  const monthMap = {
    January: "January", February: "February", March: "March", April: "Apri;",
    May: "May", June: "June", July: "July", August: "August",
    September: "September", October: "October", November: "November", December: "December"
  };

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

  Promise.all([
    d3.json(geoJsonPath),
    d3.csv(dataPath, d => ({
      Country: d.Country.toUpperCase(),
      Year: +d.Year,
      Month: d.Month,
      MonthYear: `${monthMap[d.Month]} ${d.Year}`,
      Total: +d.Total
    }))
  ]).then(([geoData, caseData]) => {
    const monthYearList = [];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (let year = 2009; year <= 2022; year++) {
      for (let month of months) {
        monthYearList.push(`${month} ${year}`);
      }
    }

    const slider = d3.select("#monthYearSlider");
    const label = d3.select("#monthYearLabel");

    slider.attr("max", monthYearList.length - 1).attr("value", 0);
    label.text(monthYearList[0]);

    slider.on("input", function () {
      const index = +this.value;
      const selectedMonthYear = monthYearList[index];
      label.text(selectedMonthYear);
      updateMap(selectedMonthYear);
    });

    const mapLayer = svg.append("g").attr("id", "mapLayer");
    const bubbleLayer = svg.append("g").attr("id", "bubbleLayer");

    const countryPaths = mapLayer
      .selectAll("path")
      .data(geoData.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "#f8f9fa")
      .attr("stroke", "#ced4da")
      .attr("stroke-width", 0.5);

    // Color legend
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "colorGradient")
      .attr("x1", "0%")
      .attr("x2", "100%");

    linearGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", d3.interpolateOrRd(0));

    linearGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", d3.interpolateOrRd(1));

    const legendGroup = svg.append("g")
      .attr("transform", `translate(${width - 250}, 40)`);

    legendGroup.append("rect")
      .attr("width", 100)
      .attr("height", 10)
      .style("fill", "url(#colorGradient)")
      .style("stroke", "#333")
      .style("stroke-width", 0.5);

    const legendScale = d3.scaleLinear()
      .domain([0, maxTotal])
      .range([0, 100]);

    const axisGroup = legendGroup.append("g")
      .attr("transform", "translate(0, 12)");

    axisGroup.call(
      d3.axisBottom(legendScale)
        .ticks(3)
        .tickFormat(d3.format(".2s"))
        .tickSize(0)
    )
      .call(g => g.selectAll("text").style("font-size", "10px"))
      .call(g => g.select(".domain").remove());

    legendGroup.append("text")
      .attr("y", -6)
      .attr("x", 0)
      .text("Total Cases")
      .style("font-size", "12px")
      .style("font-weight", "bold");

    function updateMap(selectedMonthYear) {
      const filtered = caseData.filter(d => d.MonthYear === selectedMonthYear);
      const countryMap = new Map(filtered.map(d => [d.Country, d.Total]));

      const countries = geoData.features
        .map(d => {
          const key = d.properties.name.toUpperCase();
          const total = countryMap.get(key);
          if (total !== undefined) {
            d.total = total;
            return d;
          }
          return null;
        })
        .filter(d => d !== null);

      const circles = bubbleLayer.selectAll("circle")
        .data(countries, d => d.properties.name);

      circles.join(
        enter => enter.append("circle")
          .attr("cx", d => projection(d3.geoCentroid(d))[0])
          .attr("cy", d => projection(d3.geoCentroid(d))[1])
          .attr("r", 0)
          .attr("fill", d => color(d.total))
          .attr("opacity", 0.75)
          .attr("stroke", "#000")
          .attr("stroke-width",0.5)
          .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.properties.name}</strong><br>Total: ${d.total.toLocaleString()}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");

            d3.select(this)
              .attr("stroke", "#000")
              .attr("stroke-width", 1)
              .attr("opacity", 1);
          })
          .on("mouseout", function () {
            tooltip.transition().duration(300).style("opacity", 0);
            d3.select(this)
              .attr("stroke", "#000")
              .attr("stroke-width", 0.5)
              .attr("opacity", 0.75);
          })
          .transition().duration(500)
          .attr("r", d => radius(d.total)),

        update => update
          .transition().duration(500)
          .attr("r", d => radius(d.total))
          .attr("fill", d => color(d.total))
          .attr("opacity", 0.75)
      );
    }

    updateMap(monthYearList[0]);
  });
}
