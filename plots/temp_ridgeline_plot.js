function renderRidgelinePlot(containerSelector, csvPath) {
  const container = document.querySelector(containerSelector);
  const containerWidth = container.clientWidth;
  const margin = { top: 50, right: 30, bottom: 40, left: 160 };
  const width = 350;

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
    data.forEach(d => {
      d.Year = +d.Year;
      d.Temperature = +d["Temperature.anomaly"];
      d.Decade = d.Decade;
      d.Region = d.Region;
      d.Entity = d.Entity;
    });



    const filteredData = data.filter(
      d => (d.Decade === "1950" || d.Decade === "2010") && d.Region !== "Other"
    );

    const nested = d3.groups(filteredData, d => d.Region, d => d.Decade);
    const regionCount = nested.length;
    const regionHeight = 70;
    const height = regionCount * regionHeight;


    const svg = d3.select(containerSelector)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([-4, 4])
      .range([0, width]);

    const color = d3.scaleDiverging()
      .interpolator(d3.interpolateRdBu)
      .domain([2, 0, -2]);

    const kde = kernelDensityEstimator(kernelEpanechnikov(0.3), x.ticks(60));
    const ridgeHeight = 20;
    let offsetY = 0;

    nested.forEach(([region, decadeGroups]) => {
      const group = svg.append("g")
        .attr("class", "region-group")
        .attr("data-region", region)
        .on("mouseover", function () {
          svg.selectAll(".region-group").attr("opacity", 0.4);
          d3.select(this).attr("opacity", 1);

          const temps = decadeGroups.reduce((acc, [dec, values]) => {
            acc[dec] = d3.mean(values, d => d.Temperature).toFixed(2);
            return acc;
          }, {});

          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(
            `<strong>${region}</strong><br>
             <strong>1950s</strong>: ${temps["1950"]}°C<br>
             <strong>2010s</strong>: ${temps["2010"]}°C`
          );
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function () {
          svg.selectAll(".region-group").attr("opacity", 1);
          tooltip.transition().duration(200).style("opacity", 0);
        });

      const regionStartY = offsetY;

      group.append("rect")
        .attr("x", -margin.left)
        .attr("y", regionStartY)
        .attr("width", width + margin.left + margin.right)
        .attr("height", 50)
        .attr("fill", "transparent");

      const decadeOrder = { "1950": 0, "2010": 1 };
      decadeGroups.sort((a, b) => decadeOrder[a[0]] - decadeOrder[b[0]]);

      decadeGroups.forEach(([decade, values], i) => {
        const yOffset = regionStartY + i * 20;

        const density = kde(values.map(d => d.Temperature));

        const line = d3.line()
          .curve(d3.curveBasis)
          .x(d => x(d[0]))
          .y(d => yOffset - d[1] * ridgeHeight);

        group.append("path")
          .datum(density)
          .attr("fill", color(d3.mean(values, d => d.Temperature)))
          .attr("stroke", "#333")
          .attr("stroke-width", 0.5)
          .attr("opacity", 0.8)
          .attr("d", line);

        group.append("text")
          .attr("x", -10)
          .attr("y", yOffset + 3)
          .attr("text-anchor", "end")
          .style("font-size", "9px")
          .text(decade);
      });

      group.append("text")
        .attr("x", -50)
        .attr("y", regionStartY + 10)
        .attr("text-anchor", "end")
        .text(region)
        .style("font-weight", "bold")
        .style("font-size", "12px");

      offsetY = regionStartY + 60;
    });

    svg.append("g")
      .attr("transform", `translate(0,${offsetY + 10})`)
      .call(d3.axisBottom(x).ticks(10));

    function kernelDensityEstimator(kernel, X) {
      return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
      };
    }

    function kernelEpanechnikov(k) {
      return function(v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
      };
    }
  });
}
