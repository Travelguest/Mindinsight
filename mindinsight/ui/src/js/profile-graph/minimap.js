import * as d3 from "d3";

export function Minimap() {
  this.width = 0;
  this.height = 0;
  this.svgWidth = 0;
  this.svgHeight = 0;
  this.heightScale = 0;
  this.widthScale = 0;
}

Minimap.prototype.create = function () {
  var nodes = d3.select(".svgCanvas>.minimap").selectAll("circle");
  var minX = 10000,
    maxX = -10000;

  nodes._groups[0].forEach((d) => {
    minX = Math.min(minX, d.getBBox().x);
    maxX = Math.max(maxX, d.getBBox().x);
  });

  this.svgHeight =
    document.getElementsByClassName("strategy-view")[0].clientHeight -
    document.getElementById("parallel-title").clientHeight;
  this.svgWidth =
    document.getElementsByClassName("profile-graph")[0].clientWidth;
  this.width = this.svgWidth;
  this.height = this.svgHeight * 0.2;
  this.bigWidth = d3
    .select(".wrapperInner")
    .select("#profile-graph")
    .attr("width");

  var container = d3.select(".svgCanvas>.minimap");
  container.attr(
    "transform",
    "translate(0," + (this.svgHeight - this.height) + ")"
  );

  var box = container.select("#graph-container").node().getBBox();
  this.widthScale = this.width / (maxX - minX);
  this.heightScale = this.height / box.height;
  container
    .select("#graph-container")
    .attr(
      "transform",
      "scale(" +
        this.widthScale +
        ")" +
        "translate(" +
        -box.x +
        "," +
        -box.y +
        ")"
    );
  this.generateFrame();
};

Minimap.prototype.generateFrame = function () {
  var frame = d3.select(".minimap>.frame");
  var window = frame.select(".background");

  window
    .attr("width", this.width)
    .attr("height", this.svgHeight * 0.8)
    .style("stroke", "#111111")
    .style("fill-opacity", "0.1")
    .style("fill", "#000000")
    .style("fill", "url(#minimapGradient)")
    .style("filter", "url(#minimapDropShadow)")
    .style("cursor", "move")
    .attr("transform", "scale(" + this.widthScale + ")");
  frame.attr("transform", "translate(" + 0 + " " + 0 + ")scale(1)");
};

Minimap.prototype.update = function (viewBox) {
  var frame = d3.select(".minimap>.frame");
  console.log(viewBox);
  var xtrans = viewBox[0] * this.widthScale;
  var ytrans = viewBox[1] * this.widthScale;
  var s = viewBox[2] / this.bigWidth;
  frame.attr(
    "transform",
    "translate(" + xtrans + " " + ytrans + ")" + "scale(" + s + ")"
  );
};
