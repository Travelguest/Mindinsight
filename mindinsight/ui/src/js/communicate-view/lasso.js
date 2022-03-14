import * as d3 from "d3";
// import "@/js/communicate-view/d3-lasso.min.js";
import * as d3Lasso from "d3-lasso";
import { Matrix } from "@/js/communicate-view/matrix.js";

export function Lasso(graph) {
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
    .targetArea(this.svg)
    .on("end", function () {
      var selected = lasso.selectedItems()["_groups"][0];
      var newNodes = {};
      selected.forEach(function (d) {
        var id = d3.select(d).attr("id");
        newNodes[id] = 1;
      });
      window.graph.delete(newNodes);
    });
  this.svg.call(this.lasso);
};
