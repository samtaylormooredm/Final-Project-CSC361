# Visualizing Change: U.S. Climate Concern (2010–2024)

An interactive data visualization project exploring how concern about global warming has changed across U.S. states over time. Built using D3.js, this project combines a choropleth map, line chart, and accessible data table to support multiple ways of analyzing climate opinion trends.

---

## Final Project Write-Up

The full report detailing methodology, design decisions, accessibility considerations, and user testing can be found here:

[Final Project - Write Up](./Final Project - Write Up(1).pdf)

---

## Project Overview

This visualization presents the percentage of adults in each U.S. state who report being “somewhat or very worried about global warming” from 2010 to 2024.

The project focuses on:
- Exploring geographic patterns in climate concern
- Understanding changes over time
- Supporting multiple interaction styles (visual and tabular)

The dataset is sourced from the Yale Climate Opinion Maps and was cleaned to isolate a single, complete variable across all states and years.

---

## Features

### Interactive Choropleth Map
- Displays state-level concern using color intensity  
- Hover to view exact percentages  
- Click states to compare trends over time  

### Dynamic Line Chart
- Compare selected states with the national average  
- Highlights trends across multiple years  
- Interactive hover effects for clarity  

### Accessible Data Table
- Fully sortable by year  
- Screen-reader friendly (ARIA-compliant)  
- Enables precise value lookup  

### Time Slider and Animation
- Explore year-by-year changes  
- Animate trends from 2010 to 2024  

---

## Project Structure

```
├── index.html
├── data.html
├── main.js
├── styles.css
├── climate_worried_by_state.csv
├── us-states.json
├── package.json
├── README.md
└── Final Project - Write Up(1).pdf
```

---

## Data

- Source: Yale Program on Climate Change Communication  
- Variable used: Percentage of adults worried about global warming  
- Coverage: All 50 U.S. states (2010–2024)  
- Cleaned to remove unnecessary metadata and ensure completeness  

---

## Tasks Supported

This visualization is designed to help users:

1. Compare concern between states and the national average  
2. Identify ranges (minimum and maximum) in a given year  
3. Rank states by level of concern  

These tasks are supported through coordinated views (map, chart, and table).

---

## Accessibility

- Screen-reader compatible data table  
- ARIA roles and semantic HTML  
- Improved navigation based on WAVE evaluation feedback  
- Multiple pathways to access the same data  

---

## User Testing Insights

User testing revealed:
- Users rely on different views (map, table, and chart)  
- Interactive features must be clearly discoverable  
- Too many lines in the chart can reduce clarity  

Improvements included:
- Enhanced hover interactions  
- Better contrast and readability  
- Interaction constraints during animation  

---

## How to Run

1. Clone the repository:
   git clone https://github.com/samtaylormooredm/Final-Project-CSC361.git

2. Navigate into the project folder:
   cd Final-Project-CSC361

3. Open index.html in your browser (or use a local server for best results)

---

## Technologies Used

- D3.js (v4)  
- HTML, CSS, JavaScript  
- GeoJSON  

---

## Authors

- Samantha Taylormoore  
- Ellora Devulapally  

---

## References

- Yale Climate Opinion Maps (2024)  
- D3 Choropleth base model (GitHub)  
- WAVE Accessibility Tool  

---

## Notes

- The visualization is modular and can be adapted to any dataset with:
  - state (full state names)
  - value (numeric values)

- Color scaling can be customized via lowColor and highColor variables.
