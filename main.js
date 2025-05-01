// main.js

var width = 960;
var height = 600;
var lowColor = '#f0f8ff';
var highColor = '#000068';

var svg = d3.select("#map");
var projection = d3.geoAlbersUsa().translate([width / 2, height / 2]).scale([1000]);
var path = d3.geoPath().projection(projection);
var tooltip = d3.select("#tooltip");

let currentYear;
let selectedBins = new Set();
let hoveredBin = null;

// Load CSV data
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
          d3.select(this).raise().style("stroke", "#FFFFC5").style("stroke-width", 2).style("filter", "url(#glow)");
          tooltip.style("visibility", "visible").text(`${d.properties.name}: ${d.properties.value.toFixed(1)}%`);
        })
        .on("mousemove", function() {
          tooltip.style("top", (d3.event.pageY - 10) + "px").style("left", (d3.event.pageX + 10) + "px");
        })
        .on("mouseout", function(d) {
          d3.select(this).style("stroke", "#fff").style("stroke-width", 1).style("filter", null);
          tooltip.style("visibility", "hidden");
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

    // Legend
    const legendBins = d3.range(35, 75, 5).reverse();
    const binHeight = 20;
    const legendSvg = d3.select("body").append("svg")
      .attr("width", 100)
      .attr("height", legendBins.length * binHeight + 30)
      .style("position", "absolute")
      .style("right", "800px")
      .style("bottom", "200px");

    legendBins.forEach((start, i) => {
      const end = start + 5;
      const yPos = (legendBins.length - 1 - i) * binHeight + 10;

      legendSvg.append("rect")
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

      legendSvg.append("text")
        .attr("x", 45)
        .attr("y", yPos + 15)
        .text(`${start}%–${end}%`)
        .style("font-size", "12px");
    });

    // Add Clear Filters button
    d3.select("body").append("button")
      .text("Clear All Filters")
      .style("position", "absolute")
      .style("right", "800px")
      .style("bottom", "120px")
      .style("padding", "5px 10px")
      .on("click", () => {
        selectedBins.clear();
        d3.selectAll(".legend-bin").classed("active", false);
        updateMap(currentYear);
      });
  });
});
