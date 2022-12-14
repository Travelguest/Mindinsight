import * as d3 from "d3";
// import "@/js/communicate-view/d3-lasso.min.js";
import * as d3Lasso from "d3-lasso";
import { Matrix } from "@/js/communicate-view/matrix.js";

export function Lasso() {
  d3.select(".lasso").remove();
  this.circles = d3.selectAll("circle");
  this.svg = d3.select("#mainsvg");
  // this.available = false;
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
      var newNodes = {},
        nodeList = [];
      selected.forEach(function (d) {
        var id = d3.select(d).attr("id");
        // if(id.replace(""))
        // newNodes[id] = 1;
        nodeList.push(id);
      });
      nodeList = nodeList.sort(
        (a, b) =>
          Number(a.replace("device", "")) - Number(b.replace("device", ""))
      );

      nodeList.forEach((n) => {
        newNodes[n] = true;
      });
      // console.log(newNodes);
      if (Object.keys(newNodes).length != 0) {
        if (Object.keys(newNodes).length < 3) {
          window.communicategraph.setMatrixSize(
            Object.keys(newNodes).length * 60
          );
        } else {
          window.communicategraph.setMatrixSize(0);
        }
        var m = new Matrix();

        window.communicategraph.renderMatrix(newNodes);
        m.create(Object.keys(newNodes));
      } else {
        // window.communicategraph.renderNet();
      }
    });
  this.svg.call(this.lasso);
};
Lasso.prototype.unbind = function () {
  d3.select(".lasso").remove();
};
