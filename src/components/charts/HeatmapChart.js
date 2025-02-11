import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './HeatmapChart.css';

const HeatmapChart = ({ data, startDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)), endDate = new Date() }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data) return;

    const margin = { top: 20, right: 30, bottom: 20, left: 40 };
    const cellSize = 10;
    const cellPadding = 2;
    const width = 53 * (cellSize + cellPadding); // 53 weeks in a year
    const height = 7 * (cellSize + cellPadding); // 7 days in a week

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("opacity", 0)
      .attr("class", "heatmap-tooltip");

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 4]); // Intensity levels 0-4

    // Generate date sequence
    const dates = d3.timeDays(startDate, endDate);

    // Create cells
    svg.selectAll("rect")
      .data(dates)
      .enter()
      .append("rect")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("x", d => d3.timeWeek.count(d3.timeYear(startDate), d) * (cellSize + cellPadding))
      .attr("y", d => d.getDay() * (cellSize + cellPadding))
      .attr("fill", d => {
        const dateStr = d.toISOString().split('T')[0];
        return data[dateStr] ? colorScale(data[dateStr].intensity) : "#eee";
      })
      .attr("rx", 2)
      .attr("ry", 2)
      .on("mouseover", function(event, d) {
        const dateStr = d.toISOString().split('T')[0];
        const habitData = data[dateStr];
        
        d3.select(this)
          .attr("stroke", "#000")
          .attr("stroke-width", 1);

        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
          
        tooltip.html(`
          <div class="tooltip-date">${d.toLocaleDateString()}</div>
          <div class="tooltip-status">
            ${habitData?.completed ? '✅ Completed' : '❌ Not Completed'}
          </div>
          ${habitData?.metrics ? `
            <div class="tooltip-metrics">
              ${habitData.metrics.duration ? 
                `<div>Duration: ${habitData.metrics.duration}min</div>` : ''}
              ${habitData.metrics.quality ? 
                `<div>Quality: ${habitData.metrics.quality}/5</div>` : ''}
            </div>
          ` : ''}
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke", "none");
          
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

    // Add day labels
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    svg.selectAll(".dayLabel")
      .data(days)
      .enter()
      .append("text")
      .attr("class", "dayLabel")
      .attr("x", -margin.left + 10)
      .attr("y", (d, i) => i * (cellSize + cellPadding) + cellSize * 0.75)
      .text(d => d);

    // Add month labels
    const months = d3.timeMonths(startDate, endDate);
    svg.selectAll(".monthLabel")
      .data(months)
      .enter()
      .append("text")
      .attr("class", "monthLabel")
      .attr("x", d => {
        const weekNum = d3.timeWeek.count(d3.timeYear(startDate), d);
        return weekNum * (cellSize + cellPadding);
      })
      .attr("y", -5)
      .text(d => d3.timeFormat("%b")(d));

    // Add legend
    const legendWidth = 150;
    const legendHeight = 10;
    const legend = svg.append("g")
      .attr("transform", `translate(${width - legendWidth}, ${height + 10})`);

    const legendScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 4]);

    const legendAxis = d3.axisBottom(
      d3.scaleLinear()
        .domain([0, 4])
        .range([0, legendWidth])
    ).ticks(5);

    // Create gradient for legend
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      gradient.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", legendScale(t * 4));
    }

    // Add legend rectangle
    legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    // Add legend axis
    legend.append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .select(".domain")
      .remove();

    // Add legend title
    legend.append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Intensity");

  }, [data, startDate, endDate]);

  return (
    <div className="heatmap-container">
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="heatmap-tooltip"></div>
    </div>
  );
};

export default HeatmapChart;
