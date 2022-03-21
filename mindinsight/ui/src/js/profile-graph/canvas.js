import * as d3 from "d3";
import { Minimap } from "@/js/profile-graph/minimap.js";
import { Store } from "@/js/profile-graph/store.js";
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
  this.viewBox = [0, 0, 0, 0];
  this.lastTransform = { k: 1, x: 0, y: 0 };
  this.store = new Store();
}

Canvas.prototype.create = function () {
  //   var layout = d3.select("#profile-graph");
  this.svgHeight =
    document.getElementsByClassName("strategy-view")[0].clientHeight -
    document.getElementById("parallel-title").clientHeight;
  this.svgWidth =
    document.getElementsByClassName("profile-graph")[0].clientWidth;
  this.width = this.svgWidth;
  this.height = this.svgHeight * 0.9;

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
  panCanvas.style("cursor", "move");

  var box = innerWrapper.select("#graph-container").node().getBBox();
  var widthScale = this.width / box.width;
  var heightScale = this.height / box.height;

  innerWrapper
    .select("#graph-container")
    .attr("transform", "translate(" + -box.x + "," + -box.y + ")");

  innerWrapper
    .select("#profile-graph")
    .attr("viewBox", "0 0 " + this.width + " " + this.height)
    .attr("height", this.height)
    .attr("width", this.width);

  this.viewBox = innerWrapper
    .select("#profile-graph")
    .attr("viewBox")
    .split(" ")
    .map((d) => Number(d));
  this.store.setViewBox(this.viewBox);

  var minimap = new Minimap(this.store);
  minimap.create();

  var innerEl = document.getElementsByClassName("wrapperInner")[0];
  innerEl.onwheel = (e) => {
    // console.log(e);
    let delta = e.wheelDelta && (e.wheelDelta > 0 ? 1 : -1);
    this.viewBox = this.store.getViewBox();
    if (delta > 0) {
      this.viewBox[2] = this.viewBox[2] / 1.1;
      this.viewBox[3] = this.viewBox[3] / 1.1;
    } else if (delta < 0) {
      this.viewBox[2] = this.viewBox[2] * 1.1;
      this.viewBox[3] = this.viewBox[3] * 1.1;
    }
    innerWrapper
      .select("#profile-graph")
      .attr("viewBox", this.viewBox.join(" "));
    this.store.changeViewBox(this.viewBox);
    // minimap.update();
  };
  var offsetX, offsetY;
  var dragging = false;
  innerEl.onmousedown = (e) => {
    dragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  };
  innerEl.onmouseup = (e) => {
    if (dragging) {
      this.viewBox = this.store.getViewBox();
      this.viewBox[0] = this.viewBox[0] - e.offsetX + offsetX;
      this.viewBox[1] = this.viewBox[1] - e.offsetY + offsetY;
      offsetX = e.offsetX;
      offsetY = e.offsetY;
      innerWrapper
        .select("#profile-graph")
        .attr("viewBox", this.viewBox.join(" "));
      dragging = false;
      this.store.changeViewBox(this.viewBox);
      // minimap.update();
    }
  };
  // innerEl.onmouseup = (e) => {
  //   dragging = false;
  // };

  // innerWrapper.call(
  //   d3
  //     .zoom()
  //     .scaleExtent([0.005, 2])
  //     .on("zoom", () => {
  //       // console.log(d3.event.transform);
  //       let transform = d3.event.transform;
  //       // let xtrans = -transform.x;
  //       // let ytrans = -transform.y;
  //       this.viewBox[0] = this.viewBox[0] + this.lastTransform.x - transform.x;
  //       this.viewBox[1] = this.viewBox[1] + this.lastTransform.y - transform.y;
  //       this.viewBox[2] =
  //         (this.viewBox[2] * this.lastTransform.k) / transform.k;
  //       this.viewBox[3] =
  //         (this.viewBox[3] * this.lastTransform.k) / transform.k;
  //       innerWrapper
  //         .select("#profile-graph")
  //         .attr("viewBox", this.viewBox.join(" "));
  //       this.lastTransform = transform;
  //       minimap.update(this.viewBox);
  //     })
  // );
  // innerWrapper.onMouseDown = function () {
  //   console.log("down");
  // };
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
    .append("rect")
    .attr("class", "background")
    .attr("width", this.width)
    .attr("height", this.svgHeight * 0.1);
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
