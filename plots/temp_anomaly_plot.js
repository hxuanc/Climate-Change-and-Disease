function renderTempAnomalyChart(containerSelector, csvPath) {
  const margin = { top: 30, right: 30, bottom: 70, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

  const container = document.querySelector(containerSelector);
  // container.innerHTML = ''; // Clear previous content

  // Create chart and controls wrapper
  const chartWrapper = document.createElement("div");
  chartWrapper.style.display = "flex";
  chartWrapper.style.flexDirection = "column";
  chartWrapper.style.alignItems = "center";
  chartWrapper.style.gap = "20px";
  container.appendChild(chartWrapper);

  // Create SVG container
  const svgContainer = document.createElement("div");
  svgContainer.id = "temp-svg-container";
  chartWrapper.appendChild(svgContainer);

  // Create controls wrapper
  const controls = document.createElement("div");
  controls.className = "controls";
  controls.style.display = "flex";
  controls.style.justifyContent = "center";
  controls.style.gap = "10px";
  chartWrapper.appendChild(controls);

  // Dropdown label
  const label = document.createElement("label");
  label.setAttribute("for", "entity-select");
  label.textContent = "Choose a country/region:";
  controls.appendChild(label);

  // Dropdown
  const select = document.createElement("select");
  select.id = "entity-select";
  controls.appendChild(select);

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset to World";
  controls.appendChild(resetBtn);

  // Tooltip
  const tooltip = document.createElement("div");
  tooltip.className = "custom-tooltip";
  document.body.appendChild(tooltip);

  resetBtn.addEventListener("click", () => {
    select.value = "World";
    renderChart("World");
  });

  d3.csv(csvPath).then(data => {
    const entities = Array.from(new Set(data.map(d => d.Entity)));
    entities.sort();
    if (!entities.includes("World")) entities.unshift("World");

    // Populate dropdown
    entities.forEach(entity => {
      const option = document.createElement("option");
      option.value = entity;
      option.textContent = entity;
      select.appendChild(option);
    });

    select.value = "World";
    renderChart("World");

    select.addEventListener("change", () => {
      renderChart(select.value);
    });

    function renderChart(entity) {
      d3.select("#temp-svg-container").selectAll("*").remove();

      const svg = d3.select("#temp-svg-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const filtered = data.filter(d => d.Entity === entity);
      filtered.forEach(d => {
        d.Year = +d.Year;
        d.TemperatureAnomaly = +d["Temperature.anomaly"];
        d.MovingAverage = +d["Moving.Average"];
      });

      const x = d3.scaleBand()
        .range([0, width])
        .domain(filtered.map(d => d.Year))
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([
          d3.min(filtered, d => Math.min(d.TemperatureAnomaly, d.MovingAverage)),
          d3.max(filtered, d => Math.max(d.TemperatureAnomaly, d.MovingAverage))
        ])
        .nice()
        .range([height, 0]);

      // X Axis
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => !(i % 10))))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

      // Y Axis
      svg.append("g").call(d3.axisLeft(y));

      // Bars with tooltip
      svg.selectAll("rect")
        .data(filtered)
        .enter()
        .append("rect")
        .attr("x", d => x(d.Year))
        .attr("y", d => d.TemperatureAnomaly >= 0 ? y(d.TemperatureAnomaly) : y(0))
        .attr("width", x.bandwidth())
        .attr("height", d => Math.abs(y(d.TemperatureAnomaly) - y(0)))
        .attr("fill", d => d.TemperatureAnomaly >= 0 ? "#1f77b4" : "#d62728")
        .on("mouseover", function (event, d){
          d3.select(this)
            .attr("stroke", "black")
            .attr("stroke-width", 2);

          tooltip.style.opacity = 1;
          tooltip.innerHTML = `
            <strong>Year:</strong> ${d.Year}<br>
            <strong>Annual Temperature Anomaly:</strong> ${d.TemperatureAnomaly.toFixed(2)}°C`;
          tooltip.style.opacity = 1;
        })
        .on("mousemove", function (event) {
          tooltip.style.left = (event.pageX + 10) + "px";
          tooltip.style.top = (event.pageY - 28) + "px";
        })
        .on("mouseout",function () {
          d3.select(this)
            .attr("stroke", "none");

          tooltip.style.opacity = 0;
        });

      // Line generator
      const line = d3.line()
        .x(d => x(d.Year) + x.bandwidth() / 2)
        .y(d => y(d.MovingAverage));

      // Draw line segments
      for (let i = 1; i < filtered.length; i++) {
        svg.append("path")
          .datum([filtered[i - 1], filtered[i]])
          .attr("fill", "none")
          .attr("stroke", d => d[1].MovingAverage >= 0 ? "#1f77b4" : "#d62728")
          .attr("stroke-width", 2)
          .attr("d", line);
      }

      // Add invisible circles for tooltip on line points
      svg.selectAll(".ma-point")
        .data(filtered)
        .enter()
        .append("circle")
        .attr("class", "ma-point")
        .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
        .attr("cy", d => y(d.MovingAverage))
        .attr("r", 5)
        .attr("fill", d => d.MovingAverage >= 0 ? "#1f77b4" : "#d62728") // match line color
        .attr("fill-opacity", 0) // make initially transparent
        .attr("pointer-events", "all")
        .on("mouseover",  function (event, d) {
          d3.select(this)
            .attr("fill-opacity", 1)
            .attr("r", 6)
            .attr("stroke", "black")
            .attr("stroke-width", 2);

          tooltip.style.opacity = 1;
          tooltip.innerHTML = `
            <strong>Year:</strong> ${d.Year}<br>
            <strong>Moving Average:</strong> ${d.MovingAverage.toFixed(2)}°C
          `;
        })
        .on("mousemove",  function (event) {
          tooltip.style.left = (event.pageX + 10) + "px";
          tooltip.style.top = (event.pageY - 28) + "px";
        })
        .on("mouseout", function () {
          d3.select(this)
            .attr("r", 4)
            .attr("stroke", "none")
            .attr("fill-opacity", 0); // revert to invisible

          tooltip.style.opacity = 0;
        });
    }
  }).catch(error => {
    console.error("Error loading the CSV file:", error);
    container.innerHTML += "<p>Failed to load data.</p>";
  });
}
