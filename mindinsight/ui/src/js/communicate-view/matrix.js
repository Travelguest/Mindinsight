import * as d3 from "d3";
import { Main } from "element-ui";
export function Matrix(x, y) {
  this.id = window.matrix_list.length;
  this.x = x;
  this.y = y;
  this.locallayer = d3
    .select("#matrix")
    .append("g")
    .attr("id", "mat" + this.id);
  this.nodes = [];
  this.edges = [];
  this.adj_matrix = [];
  this.num_nodes = 0;
}

Matrix.prototype.type = "matrix";
Matrix.prototype.unitsize = 10;
Matrix.prototype.fontsize = 10;

Matrix.prototype.create = function (node) {
  var _this = this;
  for (var i in node) {
    this.nodes.push(node[i]);
    window.matrix_node.push(node[i]);
  }
  this.num_nodes = node.length;
  var originData = window.graph.getLinks();
  originData.forEach(function (d) {
    if (node.includes(d.source.id) && node.includes(d.target.id)) {
      _this.edges.push(d);
    }
  });

  for (var i in node) {
    this.adj_matrix.push([]);
    for (var j in node) {
      this.adj_matrix[i].push(0);
    }
  }
  for (var i in this.edges) {
    var x = this.nodes.indexOf(this.edges[i].source.id);
    var y = this.nodes.indexOf(this.edges[i].target.id);
    this.adj_matrix[x][y] = 1;
  }
  window.matrix_list.push(this);
  this.render();
  if (window.paths.created) {
    for (var i in node) {
      window.paths.push(node[i]);
    }
  }
};

Matrix.prototype.render = function () {
  d3.selectAll("#mat" + this.id + ">*").remove();
  var _this = this;
  for (var i in this.nodes) {
    for (var j in this.nodes) {
      _this.locallayer
        .append("rect")
        .data([
          {
            namei: _this.nodes[i],
            namej: _this.nodes[j],
            id: _this.id,
            i: +i,
            j: +j,
          },
        ])
        .attr("class", "matrix" + _this.id)
        .attr("width", this.unitsize - 1)
        .attr("height", this.unitsize - 1)
        .attr("x", _this.x + i * this.unitsize)
        .attr("y", _this.y + j * this.unitsize)
        .style("fill", function (d) {
          return "#cbcbcb";
        })
        .call(
          d3.drag().on("drag", function (d) {
            var matrix = matrix_list[d.id];
            var mat = d3.selectAll(".matrix" + d.id);
            matrix.x = d3.event.x - d.i * matrix.unitsize;
            matrix.y = d3.event.y - d.j * matrix.unitsize;
            matrix.render();
            window.paths.updateData();
            window.paths.render();
          })
        );
    }
  }
  for (var i in this.nodes) {
    _this.locallayer
      .append("text")
      .attr("class", "text" + _this.id)
      .text(this.nodes[i].replace("device", ""))
      .style("text-anchor", "end")
      .attr("x", this.x - 5)
      .attr("y", this.y + i * this.unitsize + 10);
  }
};
