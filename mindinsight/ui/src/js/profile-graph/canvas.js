import * as d3 from "d3";
import { debounce } from "@/js/profile-graph/debounce.js";
import { Minimap } from "@/js/profile-graph/minimap.js";
export function Canvas() {
  this.width = 0;
  this.height = 0;
  this.wrapperBorder = 0;
  this.minimap = null;
  this.minimapPadding = 0;
  this.minimapScale = 0.25;
  this.svgHeight = 0;
  this.svgWidth = 0;
  this.zoom = null;
}

Canvas.prototype.create = function () {
  //   var layout = d3.select("#profile-graph");
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
    .style("fill", "#ffffff");

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
    .style("fill", "#ffffff")
    .style("cursor", "move");

  var panCanvas = innerWrapper.select(".panCanvas");
  panCanvas
    // .attr("width", this.width)
    // .attr("height", this.height)
    // .attr("transform", "translate(0,0)")
    .style("cursor", "move");
  // .style("position", "fixed");

  // console.log(panCanvas.node().getBBox());
  // console.log(innerWrapper.select(".background").node().getBBox());

  var box = innerWrapper.select("#graph-container").node().getBBox();
  var widthScale = this.width / box.width;
  var heightScale = this.height / box.height;

  innerWrapper.select("#graph-container").attr(
    "transform",
    // "scale(" +
    //   heightScale +
    //   "," +
    //   heightScale +
    //   ")" +
    "translate(" + -box.x + "," + -box.y + ")"
  );
  console.log(innerWrapper.select("#graph-container").node().getBBox());
  //   box = d3.select("#graph-container").node().getBBox();
  innerWrapper
    .select("#profile-graph")
    .attr("viewBox", "0 0 " + this.width + " " + this.height)
    .attr("height", this.height)
    .attr("width", this.width);

  var minimap = new Minimap();
  minimap.create();

  innerWrapper.call(
    d3
      .zoom()
      .scaleExtent([0.005, 2])
      .on("zoom", () => {
        // console.log(d3.event.transform);
        let transform = d3.event.transform;
        let xtrans = -transform.x;
        let ytrans = -transform.y;
        innerWrapper
          .select("#profile-graph")
          .attr(
            "viewBox",
            xtrans +
              " " +
              ytrans +
              " " +
              this.width / transform.k +
              " " +
              this.height / transform.k
          );
        minimap.update(xtrans, ytrans, transform.k);
      })
  );
  // console.log(panCanvas.node.getBBox);
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
