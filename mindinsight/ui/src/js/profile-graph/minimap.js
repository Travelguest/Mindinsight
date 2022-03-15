import * as d3 from "d3";

export function Minimap() {
  this.width = 0;
  this.height = 0;
  this.svgWidth = 0;
  this.svgHeight = 0;
  this.heightScale = 0;
}

Minimap.prototype.create = function () {
  console.log("create");
  this.svgHeight =
    document.getElementsByClassName("strategy-view")[0].clientHeight -
    document.getElementById("parallel-title").clientHeight;
  this.svgWidth =
    document.getElementsByClassName("profile-graph")[0].clientWidth;
  this.width = this.svgWidth;
  this.height = this.svgHeight * 0.2;

  var container = d3.select(".svgCanvas>.minimap");
  // var frame = container.select(".frame");
  container.attr(
    "transform",
    "translate(0," + (this.svgHeight - this.height) + ")"
  );

  var box = container.select("#graph-container").node().getBBox();
  var widthScale = this.width / box.width;
  this.heightScale = this.height / box.height;
  console.log(this.heightScale);
  container
    .select("#graph-container")
    .attr(
      "transform",
      "scale(" +
        this.heightScale +
        "," +
        this.heightScale +
        ")" +
        "translate(" +
        -box.x +
        "," +
        -box.y +
        ")"
    );
  // container.select("#minipanCanvas").style("overflow", "scroll");
  this.generateFrame();
};

// Minimap.prototype.render = function () {};
Minimap.prototype.generateFrame = function () {
  var frame = d3.select(".minimap>.frame");
  var window = frame.select(".background");
  // var target = d3.select(".wrapperOuter").select(".wrapperInner").select(".background");
  // var targetView = d3
  //   .select(".wrapperOuter")
  //   .select("#profile-graph")
  //   .attr("viewBox")
  //   .split(" ");
  // console.log(targetView);

  window
    .attr("width", this.width)
    .attr("height", this.svgHeight * 0.8)
    .style("stroke", "#111111")
    .style("fill-opacity", "0.1")
    .style("fill", "#000000")
    .style("fill", "url(#minimapGradient)")
    .style("filter", "url(#minimapDropShadow)")
    .style("cursor", "move")
    .attr("transform", "scale(" + this.heightScale + ")");
  frame.attr("transform", "translate(" + 0 + " " + 0 + ")scale(1)");
};

Minimap.prototype.update = function (xtrans, ytrans, scale) {
  var frame = d3.select(".minimap>.frame");
  frame.attr(
    "transform",
    "translate(" +
      xtrans * this.heightScale +
      " " +
      ytrans * this.heightScale +
      ")" +
      "scale(" +
      1 / scale +
      ")"
  );
};
