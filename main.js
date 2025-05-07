// var width = 550;
// var height = 400;
var lowColor = '#f0f8ff';
var highColor = '#000068';
var svg = d3.select("#map");
var width = 600; // shrink from 550
var height = 360; // optional to match chart scale

var projection = d3.geoAlbersUsa()
  .translate([width / 2, height / 2]) // center map more symmetrically
  .scale([800]); // scale down

var path = d3.geoPath().projection(projection);
var tooltip = d3.select("#tooltip");
let currentYear;
let selectedBins = new Set();
let hoveredBin = null;
let selectedStateName = null;
let legendHovered = false;


window.onload = function () {
  document.getElementById("welcome-modal").style.display = "block";
};

document.getElementById("start-tour-btn").addEventListener("click", function () {
  document.getElementById("welcome-modal").style.display = "none";
  
  setTimeout(() => {
    introJs().start();
  }, 200);
});

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
        .style("cursor", d => {
          const val = d.properties.value;
          const inSelected = selectedBins.size > 0 && Array.from(selectedBins).some(start => val >= start && val < start + 5);
          const inHovered = hoveredBin !== null && val >= hoveredBin && val < hoveredBin + 5;
        
          // Only show pointer cursor if state is visible (i.e., clickable)
          if ((selectedBins.size > 0 && !inSelected) || (hoveredBin !== null && selectedBins.size === 0 && !inHovered)) {
            return "default";
          } else {
            return "pointer";
          }
        })
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
        
          if (selectedBins.size > 0 && !inSelected) return;
          if (hoveredBin !== null && selectedBins.size === 0 && !inHovered) return;
        
          if (d.properties.name !== selectedStateName) {
            d3.select(this)
              .raise()
              .style("stroke", "#FFFFC5")
              .style("stroke-width", 2)
              .style("filter", "url(#hover-glow)");
          }
        
          const nationalAvg = d3.mean(Object.values(dataByYear[currentYear]));
          const diff = val - nationalAvg;
          const formattedDiff = (diff >= 0 ? "+" : "") + diff.toFixed(1);
          tooltip
            .style("visibility", "visible")
            .style("color", "black") // force black text
            .html(`${d.properties.name}: ${val.toFixed(1)}%<br>(${formattedDiff}% from National Avg)`);

        })
        
        .on("mousemove", function() {
          tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX + 10) + "px");
        })

        .on("mouseout", function(d) {
          tooltip.style("visibility", "hidden");
          if (d.properties.name === selectedStateName) return; // Don't touch selected state
          d3.select(this)
            .style("stroke", "#fff")
            .style("stroke-width", 1)
            .style("filter", null);
        })
        
        .on("click", function(d) {
          const val = d.properties.value;
          const inSelected = selectedBins.size > 0 && Array.from(selectedBins).some(start => val >= start && val < start + 5);
          const inHovered = hoveredBin !== null && val >= hoveredBin && val < hoveredBin + 5;
        
          // Prevent clicking if state is not visible under filtering
          if ((selectedBins.size > 0 && !inSelected) || (hoveredBin !== null && selectedBins.size === 0 && !inHovered)) return;
        
          if (playing) {
            // Show warning popup
            const popup = d3.select("#popup-warning");
            popup.style("display", "block");
            setTimeout(() => popup.style("display", "none"), 2500); // auto-hide after 2.5s
            return;
          }
        
          const clickedState = d.properties.name;
          if (selectedStateName === clickedState) {
            selectedStateName = null;
            drawNationalAverage();
          } else {
            selectedStateName = clickedState;
            drawLineChart(clickedState);
          }
        
          mapGroup.selectAll("path")
            .classed("selected", false)
            .style("stroke", "#fff")
            .style("stroke-width", 1)
            .style("filter", null);
        
          if (selectedStateName !== null) {
            const selected = mapGroup.selectAll("path")
              .filter(d => d.properties.name === selectedStateName)
              .classed("selected", true);
        
            selected.raise().style("filter", "url(#selected-glow)");
          }
        });        
      states.exit().remove();
    }

    updateMap(currentYear);
    drawNationalAverage();

    var slider = d3.select("#year-slider")
      .attr("min", 0)
      .attr("max", years.length - 1)
      .attr("value", 0)
      .on("input", function() {
        clearSelectedState();
        var year = years[this.value];
        currentYear = year;
        updateMap(year);
        d3.select("#year-label").text(`Year: ${year}`);
      });

    d3.select("#year-label").text(`Year: ${currentYear}`);
    var playing = false;
    var interval;
    d3.select("#play-button").on("click", function() {
      clearSelectedState();
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
  //   const tickContainer = d3.select("#slider-ticks");
  //   tickContainer.selectAll("div")
  //     .data(years)
  //     .enter()
  //     .append("div")
  //     .attr("class", "tick-mark")
  //     .style("--tick-height", (d, i) => i % 5 === 0 ? "16px" : "8px")
  // .text((d, i) => i % 2 === 0 ? d : "")
  //     .text((d, i) => {
  //       // Show fewer labels for space — e.g., every 2nd or 5th year
  //       return i % 2 === 0 ? d : ""; 
        
  //     });
    // const containerHeight = document.getElementById('map').getBoundingClientRect().height;
    // const legendHeight = Math.max(300, containerHeight * 0.85); // Scale with map, but minimum 300px
    // const legendWidth = 300;
    // const legendBins = d3.range(35, 75, 5).reverse();

//     const legendBins = d3.range(35, 80, 5); // left to right
//     const legendWidth = 300;
//     const binWidth = legendWidth / legendBins.length;
//     // const binWidth = legendWidth / legendBins.length;

//     // // Vertical Legend scaled to match map height
//     const legendHeight = 400; // Match map height
//     const binHeight = legendHeight / legendBins.length;

//     // const legendSvg = d3.select("#legend-container")
//     // .append("svg")
//     // .attr("width", legendWidth) // slightly wider
//     // .attr("height", 60); // space for top padding
//     const legendSvg = d3.select("#legend-container")
//   .append("svg")
//   .attr("width", legendWidth)
//   .attr("height", 50); // horizontal, so not tall
  

// // const legendGroup = legendSvg.append("g")
// //   .attr("transform", `translate(-15, 30)`);
// const legendGroup = legendSvg.append("g")
//   .attr("transform", `translate(0, 10)`);


//     // legendBins.forEach((start, i) => {
//     //   const end = start + 5;
//     //   const yPos = i * binHeight;
//     legendBins.forEach((start, i) => {
//       const end = start + 5;
    

//       // legendGroup.append("rect")
//       //   .attr("x", i * binWidth)
//       //   .attr("y", 10)
//       //   .attr("width", binWidth)
//       //   .attr("height", 20)
//       //   .attr("fill", ramp((start + end) / 2))
//       //   .attr("stroke", "black")
//       //   .attr("class", "legend-bin")
//       //   .attr("data-bin", start)
//       //   .on("mouseover", function() {
//       //     legendHovered = true;
//       //     hoveredBin = start;
//       legendGroup.append("rect")
//       .attr("x", i * binWidth)
//       .attr("y", 0)
//       .attr("width", binWidth)
//       .attr("height", 20)
//       .attr("fill", ramp((start + end) / 2))
//       .attr("stroke", "black")
//       .attr("class", "legend-bin")
//       .attr("data-bin", start)
//       .on("mouseover", function () { /* ... existing logic ... */ })
//       .on("mouseout", function () { /* ... existing logic ... */ })
//       .on("click", function () { /* ... existing logic ... */ });
  
        
//           // Temporarily hide selected state visuals
//           if (selectedStateName) {
//             mapGroup.selectAll("path")
//               .filter(d => d.properties.name === selectedStateName)
//               .classed("selected", false)
//               .style("stroke", "#fff")
//               .style("stroke-width", 1)
//               .style("filter", null)
//               .style("fill", "#ffffff");
//           }
//           d3.select(this).attr("stroke-width", 3);
//           updateMap(currentYear);
//         })
        
//         .on("mouseout", function() {
//           legendHovered = false;
//           const thisBin = +d3.select(this).attr("data-bin");
//           hoveredBin = null;
//           if (!selectedBins.has(thisBin)) d3.select(this).attr("stroke-width", 1);
//           updateMap(currentYear);
        
//           // Restore selected state's visuals if it exists
//           if (selectedStateName) {
//             mapGroup.selectAll("path")
//               .filter(d => d.properties.name === selectedStateName)
//               .classed("selected", true)
//               .style("stroke", "#FFFFC5")
//               .style("stroke-width", 2.5)
//               .style("filter", "url(#selected-glow)");
//           }
//         })
//         .on("click", function() {
//           clearSelectedState();
//           const thisBin = +d3.select(this).attr("data-bin");
//           if (selectedBins.has(thisBin)) {
//             selectedBins.delete(thisBin);
//             d3.select(this).classed("active", false);
//           } else {
//             selectedBins.add(thisBin);
//             d3.select(this).classed("active", true);
//           }
//           updateMap(currentYear);
//           updateClearFiltersButtonState();
//         });

//       // legendGroup.append("text")
//       //   .attr("x", i * binWidth + binWidth/2)
//       //   .attr("y", 45) // shift closer to the top edge of each bin
//       //   .attr("text-anchor", "middle")
//       //   .text(`${end}%`)     // show only the top value
//       //   .style("font-size", "14px")
//       //   .style("alignment-baseline", "hanging");
//       legendGroup.append("text")
//       .attr("x", i * binWidth + binWidth / 2)
//       .attr("y", 35)
//       .attr("text-anchor", "middle")
//       .style("font-size", "12px")
//       .text(`${end}%`);
  
      
//     });
const legendBins = d3.range(35, 80, 5); // left to right
const legendWidth = 300;
const binWidth = legendWidth / legendBins.length;

const legendSvg = d3.select("#legend-container")
  .append("svg")
  .attr("width", legendWidth)
  .attr("height", 50); // horizontal layout, short height

const legendGroup = legendSvg.append("g")
  .attr("transform", `translate(0, 10)`);

legendBins.forEach((start, i) => {
  const end = start + 5;

  // Draw bin rectangle
  legendGroup.append("rect")
    .attr("x", i * binWidth)
    .attr("y", 0)
    .attr("width", binWidth)
    .attr("height", 20)
    .attr("fill", ramp((start + end) / 2))
    .attr("stroke", "black")
    .attr("class", "legend-bin")
    .attr("data-bin", start)
    .on("mouseover", function () {
      legendHovered = true;
      hoveredBin = start;

      if (selectedStateName) {
        mapGroup.selectAll("path")
          .filter(d => d.properties.name === selectedStateName)
          .classed("selected", false)
          .style("stroke", "#fff")
          .style("stroke-width", 1)
          .style("filter", null)
          .style("fill", "#ffffff");
      }

      d3.select(this).attr("stroke-width", 3);
      updateMap(currentYear);
    })
    .on("mouseout", function () {
      legendHovered = false;
      const thisBin = +d3.select(this).attr("data-bin");
      hoveredBin = null;

      if (!selectedBins.has(thisBin)) {
        d3.select(this).attr("stroke-width", 1);
      }

      updateMap(currentYear);

      if (selectedStateName) {
        mapGroup.selectAll("path")
          .filter(d => d.properties.name === selectedStateName)
          .classed("selected", true)
          .style("stroke", "#FFFFC5")
          .style("stroke-width", 2.5)
          .style("filter", "url(#selected-glow)");
      }
    })
    .on("click", function () {
      clearSelectedState();
      const thisBin = +d3.select(this).attr("data-bin");

      if (selectedBins.has(thisBin)) {
        selectedBins.delete(thisBin);
        d3.select(this).classed("active", false);
      } else {
        selectedBins.add(thisBin);
        d3.select(this).classed("active", true);
      }

      updateMap(currentYear);
      updateClearFiltersButtonState();
    });

  // Draw bin label
  legendGroup.append("text")
    .attr("x", i * binWidth + binWidth / 2)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(`${end}%`);
});

    // Add Clear Filters button
    d3.select("#clear-filters-button")
    .on("click", () => {
      selectedBins.clear();
      d3.selectAll(".legend-bin").classed("active", false);
      const sliderValue = +d3.select("#year-slider").property("value");
      currentYear = years[sliderValue];
      updateMap(currentYear);
      d3.select("#year-label").text(`Year: ${currentYear}`);
      d3.select("#clear-filters-button")
        .attr("disabled", true)
        .style("cursor", "not-allowed");
    });

    function drawLineChart(stateName) {
      const years = Object.keys(dataByYear);
      const stateValues = years.map(y => ({ year: +y, value: dataByYear[y][stateName] }));
      const nationalAverage = getNationalAverageData();
    
      d3.select("#line-chart-container").html(""); // Clear

      // Add "Unselect State" button below the chart

      const margin = { top: 30, right: 30, bottom: 40, left: 45 };
      const width = 500 - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;
      
      const svgLine = d3.select("#line-chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right) // add extra width!
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      const x = d3.scaleLinear()
        .domain(d3.extent(stateValues, d => d.year))
        .range([0, width]);
    
      const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
      const line = d3.line().x(d => x(d.year)).y(d => y(d.value));
    
      svgLine.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .selectAll("text")
      .style("font-size", "12px")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end");
      svgLine.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "15px"); 
    
      // Blue national average line
      svgLine.append("path")
        .datum(nationalAverage)
        .attr("fill", "none")
        .attr("stroke", "#007BFF")
        .attr("stroke-width", 2)
        .attr("d", line);
            
              // First, create a quick lookup for national values by year
        const natValueByYear = {};
        nationalAverage.forEach(d => { natValueByYear[d.year] = d.value; });

        svgLine.selectAll(".dot-nat")
          .data(nationalAverage)
          .enter()
          .append("circle")
          .attr("cx", d => x(d.year))
          .attr("cy", d => y(d.value))
          .attr("r", 4)
          .attr("fill", "#007BFF")
          .style("cursor", "pointer")
          .on("mouseover", function(d) {
            d3.select(this).attr("r", 7);
            tooltip
              .style("visibility", "visible")
              .style("color", "#007BFF")
              .text(`${d.year}: ${d.value.toFixed(1)}%`);
          })
          .on("mousemove", function() {
            tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX + 10) + "px");
          })
          .on("mouseout", function() {
            d3.select(this).attr("r", 4);
            tooltip.style("visibility", "hidden");
          })
        .on("mousemove", function() {
          tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 4);
          tooltip.style("visibility", "hidden");
        });
      
    
      // Yellow selected state line
      // Create adjusted state values for line and dots
const adjustedStateValues = stateValues.map(d => {
  const natVal = natValueByYear[d.year];
  const isOverlap = Math.abs(d.value - natVal) < 0.4;
  const pixelOffset = isOverlap ? (d.value > natVal ? -5 : 5) : 0;
  return {
    ...d,
    yOffset: pixelOffset
  };
});

// Yellow selected state line (with adjusted offset)
svgLine.append("path")
  .datum(adjustedStateValues)
  .attr("fill", "none")
  .attr("stroke", "#FFD700")
  .attr("stroke-width", 2)
  .attr("d", d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value) + d.yOffset)
  );

      // Yellow dots
      svgLine.selectAll(".dot")
        .data(adjustedStateValues)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value) + d.yOffset)
        .attr("r", 4)
        .attr("fill", "#FFD700")
        .style("cursor", "pointer")
        .on("mouseover", function(d) {
          d3.select(this).attr("r", 7);
          tooltip
            .style("visibility", "visible")
            .style("color", "#FFD700")
            .text(`${d.year}: ${d.value.toFixed(1)}%`);
        })
        .on("mousemove", function() {
          tooltip.style("top", (d3.event.pageY - 10) + "px")
                .style("left", (d3.event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 4);
          tooltip.style("visibility", "hidden");
        })
        .on("mousemove", function() {
          tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 4); // reset to original size
          tooltip.style("visibility", "hidden");
        });
        
    
      svgLine.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(`% Worried About Global Warming: ${stateName} vs National Avg`);
    
      svgLine.append("text")
        .attr("x", width / 2)
        .attr("y", height + 48)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Year");
    
      svgLine.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .text("% Worried");
      
        // Add unselect button outside the SVG (under the chart)
        d3.select("#line-chart-container")
        .append("div")
        .attr("id", "unselect-wrapper")
        .style("text-align", "center")
        .style("margin-left", "28px")
        .style("margin-top", "0px")
        .append("button")
        .attr("id", "unselect-button")
        .text("Unselect State")
        .style("padding", "6px 14px")
        .style("font-size", "12px")
        .style("cursor", "pointer")
        .on("click", () => {
          selectedStateName = null;
          drawNationalAverage();
          updateMap(currentYear);
          mapGroup.selectAll("path")
            .classed("selected", false)
            .style("stroke", "#fff")
            .style("stroke-width", 1)
            .style("filter", null);
        });
    }
    function getNationalAverageData() {
      const years = Object.keys(dataByYear);
      return years.map(year => {
        const values = Object.values(dataByYear[year]);
        const avg = d3.mean(values);
        return { year: +year, value: avg };
      });
    }
    
    function drawNationalAverage() {
      const values = getNationalAverageData();
    
      d3.select("#line-chart-container").html(""); 
    
      const margin = { top: 30, right: 30, bottom: 40, left: 45 };
      const width = 500 - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;
        

      const svgLine = d3.select("#line-chart-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
      const x = d3.scaleLinear().domain(d3.extent(values, d => d.year)).range([0, width]);
      const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    
      const line = d3.line().x(d => x(d.year)).y(d => y(d.value));
    
      svgLine.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("font-size", "12px"); 

      svgLine.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px");
    
      svgLine.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", "#007BFF")
        .attr("stroke-width", 2)
        .attr("d", line);
    
      svgLine.selectAll(".dot")
        .data(values)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("r", 4)
        .attr("fill", "#007BFF")
        .style("cursor", "pointer")
        .on("mouseover", function(d) {
          d3.select(this).attr("r", 7); // grow on hover
          tooltip
            .style("visibility", "visible")
            .style("color", "#007BFF") // or "#" for national
            .text(`${d.year}: ${d.value.toFixed(1)}%`);
        })
        .on("mousemove", function() {
          tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 4); // reset to original size
          tooltip.style("visibility", "hidden");
        });
    
      svgLine.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("font-weight", "bold")
        .text("% Worried About Global Warming: National Avg");
    
      svgLine.append("text")
        .attr("x", width / 2)
        .attr("y", height + 48)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .text("Year");
    
      svgLine.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .text("% Worried");
      
      d3.select("#line-chart-container")
        .append("div")
        .attr("id", "unselect-wrapper")
        .style("text-align", "center")
        .style("margin-left", "28px")
        .style("margin-top", "0px")
        .append("button")
        .attr("id", "unselect-button")
        .text("Unselect State")
        .attr("disabled", true) // disable button when no state is selected
        .style("padding", "6px 14px")
        .style("font-size", "12px")
        .style("cursor", "not-allowed");
    }
    
    function clearSelectedState() {
      selectedStateName = null;
      mapGroup.selectAll("path")
        .classed("selected", false)
        .style("stroke", "#fff")
        .style("stroke-width", 1)
        .style("filter", null);
    }

    function updateClearFiltersButtonState() {
      const button = d3.select("#clear-filters-button");
      if (selectedBins.size === 0) {
        button.attr("disabled", true).style("cursor", "not-allowed");
      } else {
        button.attr("disabled", null).style("cursor", "pointer");
      }
    }
  });
});
