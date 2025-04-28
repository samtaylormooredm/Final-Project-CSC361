// Map dimensions
var width = 960;
var height = 600;
// Define color scale range (light blue to dark navy)
var lowColor = '#f0f8ff';
var highColor = '#000068';

var svg = d3.select("#map");

// Define geographic projection for the US map
var projection = d3.geoAlbersUsa()
  .translate([width / 2, height / 2])
  .scale([1000]);

var path = d3.geoPath().projection(projection);
var tooltip = d3.select("#tooltip");

// Load CSV data for climate concern percentages
d3.csv("climate_worried_by_state.csv", function(dataRaw) {
  var years = d3.keys(dataRaw[0]).filter(k => k !== "state");
  var dataByYear = {};
  // Restructure data: {year -> {state -> value}}
  years.forEach(year => {
    dataByYear[year] = {};
    dataRaw.forEach(row => {
      dataByYear[year][row.state] = +row[year];
    });
  });

  var allValues = Object.values(dataByYear).flatMap(d => Object.values(d));
  // var minVal = d3.min(allValues);
  // var maxVal = d3.max(allValues);
  var ramp = d3.scaleLinear().domain([35, 80]).range([lowColor, highColor]);

  // Load GeoJSON data for US states
  d3.json("us-states.json", function(json) {
    var mapGroup = svg.append("g");

    function updateMap(year) {
      json.features.forEach(d => {
        d.properties.value = dataByYear[year][d.properties.name];
      });

      var states = mapGroup.selectAll("path")
        .data(json.features);

      // Enter + update states
      states.enter()
        .append("path")
        .merge(states)
        .attr("d", path)
        .style("stroke", "#fff")
        .style("stroke-width", "1")
        .style("fill", d => ramp(d.properties.value))
        .on("mouseover", function(d) {
            // Highlight state on hover and apply glow
            d3.select(this)
              .raise()  // <--- Brings this element to front
              .style("stroke", "#FFFFC5") // or any blue you like
              .style("stroke-width", 2)
              .style("filter", "url(#glow)");
          
            tooltip.style("visibility", "visible")
                   .text(`${d.properties.name}: ${d.properties.value.toFixed(1)}%`);
          })
        .on("mousemove", function() {
          tooltip.style("top", (d3.event.pageY - 10) + "px")
                 .style("left", (d3.event.pageX + 10) + "px");
        })
        // Reset styling and hide tooltip when not hovering
        .on("mouseout", function(d) {
            d3.select(this)
            .style("stroke", "#fff")
            .style("stroke-width", 1)
            .style("filter", null); // Remove glow effect

  tooltip.style("visibility", "hidden");
})

      states.exit().remove();
    }

    // Render the initial map with the first year of data
    updateMap(years[0]);

    // Slider setup
    var slider = d3.select("#year-slider")
      .attr("min", 0)
      .attr("max", years.length - 1)
      .attr("value", 0)
      .on("input", function() {
        var year = years[this.value];
        updateMap(year);
        d3.select("#year-label").text(`Year: ${year}`);
      });

    // Label update
    d3.select("#year-label").text(`Year: ${years[0]}`);

    // Play button
    var playing = false;
    var interval;
    d3.select("#play-button")
      .on("click", function() {
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
    var legendWidth = 140, legendHeight = 280;
    var key = d3.select("body").append("svg")
  .attr("width", legendWidth)
  .attr("height", legendHeight + 20)
  .attr("class", "legend")
  .style("position", "absolute")
  .style("right", "800px")  // same horizontal position as before
  .style("bottom", "200px");  // move this upward to shift the whole thing


    var legend = key.append("defs")
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "100%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");

    legend.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", highColor)
      .attr("stop-opacity", 1);
    
    legend.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", lowColor)
      .attr("stop-opacity", 1);

    key.append("rect")
      .attr("width", legendWidth - 100)
      .attr("height", legendHeight)
      .style("fill", "url(#gradient)")
      .attr("transform", "translate(0,10)");

    var y = d3.scaleLinear().range([legendHeight, 0]).domain([35, 75]);
    var yAxis = d3.axisRight(y);

    key.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(41,10)")
      .call(yAxis);
  });
});