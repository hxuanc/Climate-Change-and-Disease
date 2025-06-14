function renderCombinedFluAreaChart(selector, csvPath) {
  const container = document.querySelector(selector);
  const containerWidth = container.clientWidth;
  const margin = { top: 30, right: 30, bottom: 30, left: 60 };
  const width = containerWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;
  const chartHeight = (height - margin.top - margin.bottom) / 2 - 20;

  const subtypes = ["Ah1n12009", "Ah1", "Ah3", "Ah5", "Ah7n9", "A_no_subtype", "Bvic", "Byam", "Bnotdetermined"];

  const subtypeLabels = {
  "Ah1n12009": "A(H1N1)pdm09",
  "Ah1": "A(H1)",
  "Ah3": "A(H3)",
  "Ah5": "A(H5)",
  "Ah7n9": "A(H7N9)",
  "A_no_subtype": "A (no subtype)",
  "Bvic": "B (Victoria)",
  "Byam": "B (Yamagata)",
  "Bnotdetermined": "B (not determined)"
};
  const color = d3.scaleOrdinal(subtypes, d3.schemeSet3);

  const parseDate = d3.timeParse("%Y-%B");

  const svg = d3.select(selector)
    .html("")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  d3.csv(csvPath).then(rawData => {
    rawData.forEach(d => {
      d.date = parseDate(`${d.Year}-${d.Month}`);
      subtypes.forEach(k => d[k] = +d[k] || 0);
    });

    const hemispheres = {
      "Northern Hemisphere": [],
      "Southern Hemisphere": []
    };

    rawData.forEach(d => {
      if (hemispheres[d.Country]) {
        hemispheres[d.Country].push(d);
      }
    });

    const aggregateByDate = (data) => {
      const rolled = d3.rollups(
        data,
        v => {
          const row = { date: v[0].date };
          subtypes.forEach(k => row[k] = d3.sum(v, d => d[k]));
          return row;
        },
        d => d.date
      );
      return rolled.map(([date, values]) => values).sort((a, b) => d3.ascending(a.date, b.date));
    };

    const northData = aggregateByDate(hemispheres["Northern Hemisphere"]);
    const southData = aggregateByDate(hemispheres["Southern Hemisphere"]);

    const x = d3.scaleTime()
      .domain(d3.extent(rawData, d => d.date))
      .range([margin.left, width - margin.right]);

    const xAxis = d3.axisBottom(x)
      .ticks(d3.timeYear.every(2))
      .tickFormat(d3.timeFormat("%b %Y"));

    svg.append("g")
      .attr("transform", `translate(0, ${margin.top + 2 * chartHeight + 40})`)
      .call(xAxis);

    const drawHemisphere = (data, yOffset, label, yMax) => {
      const y = d3.scaleLinear()
        .domain([0, yMax])
        .range([yOffset + chartHeight, yOffset]);

      const stack = d3.stack().keys(subtypes);
      const stacked = stack(data);

      const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

      svg.selectAll(`.area-${label}`)
        .data(stacked)
        .enter()
        .append("path")
        .attr("class", `area-${label}`)
        .attr("fill", d => color(d.key))
        .attr("d", area);

      svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y).ticks(5));

      svg.append("text")
        .attr("x", margin.left + 5)
        .attr("y", yOffset - 5)
        .attr("font-weight", "bold")
        .text(label);
    };

    drawHemisphere(northData, margin.top, "Northern Hemisphere", 300000);
    drawHemisphere(southData, margin.top + chartHeight + 40, "Southern Hemisphere", 20000);



    // Tooltip setup
    const tooltip = d3.select(selector)
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "6px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-size", "12px")
      .style("border-radius", "4px")
      .style("line-height", "1.4em")
      .style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)")
      .style("z-index", 10);

    const hoverLine = svg.append("line")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke-dasharray", "4,2")  // ← This makes it dotted
      .style("opacity", 0);

    // Mouse overlay
    svg.append("rect")
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .attr("width", width)
      .attr("height", height)
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event);
        const hoveredDate = x.invert(mx);

        const bisect = d3.bisector(d => d.date).left;
        const ni = bisect(northData, hoveredDate);
        const si = bisect(southData, hoveredDate);
        const northDatum = northData[Math.min(ni, northData.length - 1)];
        const southDatum = southData[Math.min(si, southData.length - 1)];

        const totalNorth = d3.sum(subtypes.map(k => northDatum[k]));
        const totalSouth = d3.sum(subtypes.map(k => southDatum[k]));

        const format = d3.timeFormat("%B %Y");

        const makeSubtypeTable = (d) =>
          subtypes
          .filter(k => d[k] > 0)
          .map(k => `<span style="color:${color(k)};">●</span> ${subtypeLabels[k]}: ${d[k].toLocaleString()}`)
          .join("<br/>");

        tooltip.html(`
          <strong>${format(northDatum.date)}</strong><br/>
          <u>Northern Hemisphere</u><br/>
          ${makeSubtypeTable(northDatum)}<br/>
          // <b>Total:</b> ${totalNorth.toLocaleString()}<br/><br/>
          <u>Southern Hemisphere</u><br/>
          ${makeSubtypeTable(southDatum)}<br/>
          // <b>Total:</b> ${totalSouth.toLocaleString()}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
          .style("opacity", 1);

        hoverLine
          .attr("x1", x(northDatum.date))
          .attr("x2", x(northDatum.date))
          .style("opacity", 1);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
        hoverLine.style("opacity", 0);
      });
  });
}
