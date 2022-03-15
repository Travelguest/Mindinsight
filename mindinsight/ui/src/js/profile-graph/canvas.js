import * as d3 from "d3";
export function Canvas() {
  this.width = 0;
  this.height = 0;
  this.wrapperBorder = 0;
  this.minimap = null;
  this.minimapPadding = 10;
  this.minimapScale = 0.25;
  this.svgHeight = 0;
  this.svgWidth = 0;
  this.zoom = null;
}

Canvas.prototype.create = function () {
  var layout = d3.select("#profile-graph");
  this.svgHeight =
    document.getElementsByClassName("strategy-view")[0].clientHeight -
    document.getElementById("parallel-title").clientHeight;
  this.svgWidth =
    document.getElementsByClassName("profile-graph")[0].clientWidth;
  this.width = this.svgWidth;
  this.height = this.svgHeight * 0.8;

  var svg = d3.select(".svgCanvas");
  svg
    .attr("width", this.svgWidth)
    .attr("height", this.svgHeight)
    // .attr("shape-rendering", "auto")
    .style("overflow", "hidden");

  this.generateDefs();

  var outerWrapper = d3.select(".svgCanvas").select(".wrapperOuter");
  outerWrapper.attr("transform", "translate(0," + this.minimapPadding + ")");
  outerWrapper
    .select(".background")
    .attr("width", this.width + 2 * this.wrapperBorder)
    .attr("height", this.height + 2 * this.wrapperBorder)
    .style("fill", "#000000");

  var innerWrapper = outerWrapper.select(".wrapperInner");
  innerWrapper
    .attr("clip-path", "url(#wrapperClipPath)")
    .attr(
      "transform",
      "translate(" + this.wrapperBorder + "," + this.wrapperBorder + ")"
    );

  innerWrapper
    .select(".background")
    .attr("width", this.width)
    .attr("height", this.height)
    .style("fill", "#cccccc")
    .style("cursor", "move");

  var panCanvas = innerWrapper.select(".panCanvas");
  panCanvas
    // .attr("width", this.width)
    // .attr("height", this.height)
    .attr("transform", "translate(0,0)")
    .style("cursor", "move");

  //   panCanvas
  //     .select(".background")
  //     .attr("width", this.width * 10)
  //     .attr("height", this.height)
  //     .style("fill", "#f6f6f6")
  //     .style("stroke", "#333333")
  //     .style("cursor", "move");

  this.zoom = d3.zoom().scaleExtent([0.05, 500]);
  var updateCanvasZoomExtents = () => {
    var scale = innerWrapper.property("__zoom").k;
    var targetWidth = this.svgWidth;
    var targetHeight = this.svgHeight;
    var viewportWidth = this.width;
    var viewportHeight = this.height;
    this.zoom.translateExtent([
      [-viewportWidth / scale, -viewportHeight / scale],
      [
        viewportWidth / scale + targetWidth,
        viewportHeight / scale + targetHeight,
      ],
    ]);
  };
  var zoomHandler = function () {
    // console.log(d3.event.transform);
    panCanvas.attr("transform", d3.event.transform);
    if (
      d3.event.sourceEvent instanceof MouseEvent ||
      d3.event.sourceEvent instanceof WheelEvent
    ) {
      //minimap.update(d3.event.transform)
    }
    updateCanvasZoomExtents();
  };
  this.zoom.on("zoom", zoomHandler);
  innerWrapper.call(this.zoom);

  // var background = d3.select(".panCanvas>.background").node().getBBox();
  var box = d3.select("#graph-container").node().getBBox();
  var widthScale = this.width / box.width;
  var heightScale = this.height / box.height;
  d3.select("#graph-container").attr(
    "transform",
    "scale(" +
      heightScale +
      "," +
      heightScale +
      ")" +
      "translate(" +
      -box.x +
      "," +
      -box.y +
      ")"
  );
};

Canvas.prototype.generateDefs = function () {
  var svgDefs = d3.select(".svgCanvas").select("defs");
  svgDefs
    .append("clipPath")
    .attr("id", "wrapperClipPath")
    .attr("class", "wrapper clipPath")
    .append("rect")
    .attr("class", "background")
    .attr("width", this.width)
    .attr("height", this.height);
  svgDefs
    .append("clipPath")
    .attr("id", "minimapClipPath")
    .attr("class", "minimap clipPath")
    .attr("width", this.width)
    .attr("height", this.height)
    .append("rect")
    .attr("class", "background")
    .attr("width", this.width)
    .attr("height", this.height);
  var filter = svgDefs
    .append("svg:filter")
    .attr("id", "minimapDropShadow")
    //   .attr("x", "-20%")
    //   .attr("y", "-20%")
    .attr("width", "150%")
    .attr("height", "150%");
  filter
    .append("svg:feOffset")
    .attr("result", "offOut")
    .attr("in", "SourceGraphic")
    .attr("dx", "1")
    .attr("dy", "1");
  filter
    .append("svg:feColorMatrix")
    .attr("result", "matrixOut")
    .attr("in", "offOut")
    .attr("type", "matrix")
    .attr("values", "0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.5 0");
  filter
    .append("svg:feGaussianBlur")
    .attr("result", "blurOut")
    .attr("in", "matrixOut")
    .attr("stdDeviation", "10");
  filter
    .append("svg:feBlend")
    .attr("in", "SourceGraphic")
    .attr("in2", "blurOut")
    .attr("mode", "normal");

  var minimapRadialFill = svgDefs
    .append("radialGradient")
    .attr("id", "minimapGradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("cx", "500")
    .attr("cy", "500")
    .attr("r", "400")
    .attr("fx", "500")
    .attr("fy", "500");
  minimapRadialFill
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#FFFFFF");
  minimapRadialFill
    .append("stop")
    .attr("offset", "40%")
    .attr("stop-color", "#EEEEEE");
  minimapRadialFill
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#E0E0E0");
};
