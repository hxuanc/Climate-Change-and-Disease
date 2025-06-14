function renderDengueHeatmap(containerSelector, csvPath) {
    
    // Tooltip creation and styling
    if (!document.querySelector(".tooltip")) {
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        document.body.appendChild(tooltip);
    }

    if (!document.getElementById("tooltip-style")) {
        const style = document.createElement("style");
        style.id = "tooltip-style";
        style.innerHTML = `
            .tooltip {
                position: absolute;
                visibility: hidden;
                background-color: white;
                border: 1px solid #999;
                border-radius: 5px;
                padding: 8px 12px;
                font-size: 13px;
                color: #333;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                pointer-events: none;
                z-index: 1000;
                top: 100px;
                left: 100px;
            }
        `;
        document.head.appendChild(style);
    }

    const container = document.querySelector(containerSelector);
    const containerWidth = container.clientWidth;
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = 410 - margin.top - margin.bottom;


    const svg = d3.select(containerSelector)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const tooltip = d3.select(containerSelector)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none");

    d3.csv(csvPath).then(data => {
        data.forEach(d => {
            d.Year = +d.Year;
            d.Total = +d.Total;
        });

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        data = data.filter(d => monthNames.includes(d.Month));
        const years = [...new Set(data.map(d => d.Year))].sort(d3.ascending);

        const x = d3.scaleBand()
            .domain(monthNames)
            .range([0, width])
            .padding(0.05);

        const y = d3.scaleBand()
            .domain(years)
            .range([0, height])
            .padding(0.05);

        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateReds)
            .domain([0, d3.max(data, d => d.Total)]);

        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("dx", "-0.6em")
            .attr("dy", "0.25em");

        svg.append("g")
            .call(d3.axisLeft(y));

        svg.selectAll("rect")
            .data(data)
            .join("rect")
            .attr("x", d => x(d.Month))
            .attr("y", d => y(d.Year))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("fill", d => colorScale(d.Total))
            .style("opacity", 1)
            .on("mouseover", function (event, d) {
                tooltip
                    .style("visibility", "visible")
                    .html(`<strong>${d.Month} ${d.Year}</strong><br>Cases: ${d.Total}`);

                svg.selectAll("rect")
                    .transition()
                    .duration(200)
                    .style("opacity", 0.3);

                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("opacity", 1)
                    .attr("stroke", "#000")
                    .attr("stroke-width", 1.5);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("top", `${Math.max(event.pageY - 40, 0)}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden");

                svg.selectAll("rect")
                    .transition()
                    .duration(200)
                    .style("opacity", 1)
                    .attr("stroke", null)
                    .attr("stroke-width", null);
            });
    });
}
