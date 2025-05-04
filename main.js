var width = 960;
var height = 600;
var lowColor = '#f0f8ff';
var highColor = '#000068';

var svg = d3.select("#map");
var projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale([1320]);

var path = d3.geoPath().projection(projection);
var tooltip = d3.select("#tooltip");

let currentYear;
let selectedBins = new Set();
let hoveredBin = null;

d3.csv("climate_worried_by_state.csv", function(dataRaw) {
  var years = d3.keys(dataRaw[0]).filter(k => k !== "state");
  var dataByYear = {};
  years.forEach(year => {
    dataByYear[year] = {};
    dataRaw.forEach(row => {
      dataByYear[year][row.state] = +row[year];
    });
  });

  currentYear = years[0];

  var allValues = Object.values(dataByYear).flatMap(d => Object.values(d));
  var ramp = d3.scaleLinear().domain([35, 80]).range([lowColor, highColor]);

  d3.json("us-states.json", function(json) {
    var mapGroup = svg.append("g");

    function updateMap(year) {
      json.features.forEach(d => {
        d.properties.value = dataByYear[year][d.properties.name];
      });

      const states = mapGroup.selectAll("path").data(json.features);

      states.enter()
        .append("path")
        .merge(states)
        .attr("d", path)
        .style("stroke", "#fff")
        .style("stroke-width", "1")
        .style("fill", d => {
          const val = d.properties.value;

          const matchesSelected = selectedBins.size > 0 && Array.from(selectedBins).some(start => val >= start && val < start + 5);
          const matchesHover = hoveredBin !== null && val >= hoveredBin && val < hoveredBin + 5;

          if (selectedBins.size > 0) return matchesSelected ? ramp(val) : "#ffffff";
          if (hoveredBin !== null) return matchesHover ? ramp(val) : "#ffffff";

          return ramp(val);
        })
        .on("mouseover", function(d) {
          const val = d.properties.value;
          const inSelected = selectedBins.size > 0 && Array.from(selectedBins).some(start => val >= start && val < start + 5);
          const inHovered = hoveredBin !== null && val >= hoveredBin && val < hoveredBin + 5;
        
          // If filtering is active, only respond if this state is within the active bin
          if (selectedBins.size > 0 && !inSelected) return;
          if (hoveredBin !== null && selectedBins.size === 0 && !inHovered) return;
        
          d3.select(this).raise().style("stroke", "#FFFFC5").style("stroke-width", 2).style("filter", "url(#glow)");
          tooltip.style("visibility", "visible").text(`${d.properties.name}: ${d.properties.value.toFixed(1)}%`);
        })
        
        .on("mousemove", function() {
          tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX + 10) + "px");
        })
        .on("mouseout", function(d) {
          d3.select(this).style("stroke", "#fff").style("stroke-width", 1).style("filter", null);
          tooltip.style("visibility", "hidden");
        })
        .on("click", function(d) {
          drawLineChart(d.properties.name);
        });
        

      states.exit().remove();
    }

    updateMap(currentYear);

    var slider = d3.select("#year-slider")
      .attr("min", 0)
      .attr("max", years.length - 1)
      .attr("value", 0)
      .on("input", function() {
        var year = years[this.value];
        currentYear = year;
        updateMap(year);
        d3.select("#year-label").text(`Year: ${year}`);
      });

    d3.select("#year-label").text(`Year: ${currentYear}`);
    var playing = false;
    var interval;
    d3.select("#play-button").on("click", function() {
      if (playing) {
        clearInterval(interval);
        d3.select(this).text("▶ Play");
      } else {
        let i = +slider.property("value");
        interval = setInterval(() => {
          i = (i + 1) % years.length;
          slider.property("value", i).dispatch("input");
          if (i === years.length - 1) {
            clearInterval(interval);
            d3.select("#play-button").text("▶ Play");
            playing = false;
          }
        }, 1000);
        d3.select(this).text("⏸ Pause");
      }
      playing = !playing;
    });

    // Vertical Legend scaled to match map height
    const legendBins = d3.range(35, 75, 5).reverse();
    const legendHeight = 350; // Match map height
    const binHeight = legendHeight / legendBins.length;

    const legendGroup = svg.append("g")
      .attr("id", "legend")
      .attr("transform", `translate(${width - 20}, ${height / 2 - legendHeight / 2 + 15})`);


    

    legendBins.forEach((start, i) => {
      const end = start + 5;
      const yPos = i * binHeight;

      legendGroup.append("rect")
        .attr("x", 10)
        .attr("y", yPos)
        .attr("width", 30)
        .attr("height", binHeight)
        .attr("fill", ramp((start + end) / 2))
        .attr("stroke", "black")
        .attr("class", "legend-bin")
        .attr("data-bin", start)
        .on("mouseover", function() {
          hoveredBin = start;
          d3.select(this).attr("stroke-width", 3);
          updateMap(currentYear);
        })
        .on("mouseout", function() {
          const thisBin = +d3.select(this).attr("data-bin");
          hoveredBin = null;
          if (!selectedBins.has(thisBin)) d3.select(this).attr("stroke-width", 1);
          updateMap(currentYear);
        })
        .on("click", function() {
          const thisBin = +d3.select(this).attr("data-bin");
          if (selectedBins.has(thisBin)) {
            selectedBins.delete(thisBin);
            d3.select(this).classed("active", false);
          } else {
            selectedBins.add(thisBin);
            d3.select(this).classed("active", true);
          }
          updateMap(currentYear);
        });

      legendGroup.append("text")
        .attr("x", 45)
        .attr("y", yPos) // shift closer to the top edge of each bin
        .text(`${end}%`)     // show only the top value
        .style("font-size", "12px")
        .style("alignment-baseline", "hanging");
    });

    // Add Clear Filters button
    svg.append("foreignObject")
      .attr("x", width - 50)
      .attr("y", height / 2 + legendHeight / 2 + 25) // just below the legend
      .attr("width", 130)
      .attr("height", 40)
      .append("xhtml:button")
      .text("Clear All Filters")
      .style("padding", "5px 10px")
      .style("font-size", "14px")
      .style("cursor", "pointer")
      .on("click", () => {
        selectedBins.clear();
        d3.selectAll(".legend-bin").classed("active", false);

        const sliderValue = +d3.select("#year-slider").property("value");
        currentYear = years[sliderValue];
        updateMap(currentYear);
        d3.select("#year-label").text(`Year: ${currentYear}`);
    });

    function drawLineChart(stateName) {
      const years = Object.keys(dataByYear);
      const values = years.map(y => ({ year: +y, value: dataByYear[y][stateName] }));
    
      d3.select("#line-chart-container").html(""); // clear existing chart
    
      const margin = { top: 40, right: 30, bottom: 50, left: 60 };
      const width = 650 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;
    
      const svgLine = d3.select("#line-chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
      const x = d3.scaleLinear()
        .domain(d3.extent(values, d => d.year))
        .range([0, width]);
    
      const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
    
      const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.value));
    
      svgLine.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    
      svgLine.append("g")
        .call(d3.axisLeft(y));
    
      svgLine.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", "#003366")
        .attr("stroke-width", 2)
        .attr("d", line);
    
      svgLine.selectAll(".dot")
        .data(values)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("r", 4)
        .attr("fill", "#003366");
    
      svgLine.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text(`% Worried About Global Warming in ${stateName}`);
    
      svgLine.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Year");
    
      svgLine.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("% Worried");
    }
    

  });
});
