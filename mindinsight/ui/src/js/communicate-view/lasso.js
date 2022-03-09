import * as d3 from "d3";
// import "@/js/communicate-view/d3-lasso.min.js";
import * as d3Lasso from "d3-lasso";
export function Lasso() {
  this.circles = d3.selectAll("circle");
  this.svg = d3.select("#mainsvg");
  this.available = false;
  this.lasso = d3Lasso.lasso();
}

Lasso.prototype.bind = function () {
  var lasso = this.lasso
    .closePathSelect(true)
    .closePathDistance(100)
    .items(this.circles)
    .targetArea(this.svg);
  this.svg.call(this.lasso);
};
