import * as d3 from "d3";
export function Matrix() {
  // this.id = window.matrix_list.length;
  this.x = 0;
  this.y = 0;
  d3.selectAll("#matrix > *").remove();
  this.locallayer = d3.select("#matrix");
  this.nodes = [];
  this.edges = [];
  this.adj_matrix = [];
  this.num_nodes = 0;
  this.matrix_size = window.graph.getMatrixSize();

  this.maxDuration = 0;
  this.maxTraffic = 0;
  this.nodeData = [];
  this.linkSelect = false;
  // this.matrix_size = matrix_size;
}

Matrix.prototype.type = "matrix";
Matrix.prototype.unitsize = 48;
Matrix.prototype.fontsize = 10;

Matrix.prototype.margin = 3;
Matrix.prototype.barHight = 6; //6*5+(6/2)*6=48

// Matrix.prototype.init = function (node) {
//   this.locallayer.on("contextmenu", function (d) {
//     d3.event.preventDefault();
//     console.log("deleting");
//   });
//   this.nodeData = window.graph.getNodesData(node);
//   // this.nodeData.forEach((n)=>{

//   // })
// };

Matrix.prototype.create = function (node, linkSelect = false, nodeValue = []) {
  this.linkSelect = linkSelect;
  this.locallayer.on("contextmenu", function (d) {
    d3.event.preventDefault();
    window.graph.renderNet();
    d3.selectAll("#matrix > *").remove();
  });
  this.nodeData = window.graph.getNodesData(node);

  for (var i in node) {
    this.nodes.push(node[i]);
  }

  this.num_nodes = node.length;
  var originData = window.graph.getLinks();

  originData.forEach((d) => {
    if (node.includes(d.source) && node.includes(d.target)) {
      this.edges.push(d);
    }
  });

  for (var i in node) {
    this.adj_matrix.push([]);
    for (var j in node) {
      this.adj_matrix[i].push({ exist: false });
    }
  }
  // console.log(this.edges);
  // console.log(this.nodes);
  for (var i in this.edges) {
    var x = this.nodes.indexOf(this.edges[i].source);
    var y = this.nodes.indexOf(this.edges[i].target);
    // console.log(this.edges[i].op_traffic.join());
    this.adj_matrix[x][y] = {
      exist: true,
      bandWidth: this.edges[i].bandWidth,
      communication_duration: this.edges[i].communication_duration,
      traffic: this.edges[i].traffic,
      box_bandWidth: {
        min: this.edges[i].op_bandWidth[0],
        max: this.edges[i].op_bandWidth[this.edges[i].op_bandWidth.length - 1],
        min_quartile: d3.quantile(this.edges[i].op_bandWidth, 0.25),
        mid: d3.quantile(this.edges[i].op_bandWidth, 0.5),
        max_quartile: d3.quantile(this.edges[i].op_bandWidth, 0.75),
      },
      box_duration: {
        min: this.edges[i].op_duration[0],
        max: this.edges[i].op_duration[this.edges[i].op_duration.length - 1],
        min_quartile: d3.quantile(this.edges[i].op_duration, 0.25),
        mid: d3.quantile(this.edges[i].op_duration, 0.5),
        max_quartile: d3.quantile(this.edges[i].op_duration, 0.75),
      },
      box_traffic: {
        min: this.edges[i].op_traffic[0],
        max: this.edges[i].op_traffic[this.edges[i].op_traffic.length - 1],
        min_quartile: d3.quantile(this.edges[i].op_traffic, 0.25),
        mid: d3.quantile(this.edges[i].op_traffic, 0.5),
        max_quartile: d3.quantile(this.edges[i].op_traffic, 0.75),
      },
    };
    this.maxDuration = Math.max(
      this.maxDuration,
      this.edges[i].communication_duration
    );
    this.maxTraffic = Math.max(this.maxTraffic, this.edges[i].traffic);
  }
  // console.log(this.adj_matrix);
  // window.matrix_list.push(this);
  this.render(nodeValue);
  // if (window.paths.created) {
  //   for (var i in node) {
  //     window.paths.push(node[i]);
  //   }
  // }
};

Matrix.prototype.render = function (nodeValue = []) {
  // d3.selectAll("#mat" + this.id + ">*").remove();
  var _this = this;
  // var max_ccost = 0,
  //   max_wcost = 0;
  for (var i in this.nodes) {
    for (var j in this.nodes) {
      _this.locallayer
        .append("rect")
        .data([
          {
            namei: _this.nodes[i],
            namej: _this.nodes[j],
            i: +i,
            j: +j,
          },
        ])
        .attr("class", "matrixBlock")
        .attr("width", this.unitsize - 1)
        .attr("height", this.unitsize - 1)
        .attr("x", _this.x + i * this.unitsize)
        .attr("y", _this.y + j * this.unitsize)
        .style("fill", function (d) {
          return "#cecfd1";
        })
        .style("stroke", (d) => {
          if (this.linkSelect) {
            if (j == 0 && i == 1) {
              return "red";
            }
          } else if (
            nodeValue.filter((n) => n.source == j && n.target == i).length != 0
          ) {
            return "red";
          }
          return "#848484";
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
      if (_this.adj_matrix[j][i].exist == true) {
        _this.locallayer
          .append("rect")
          .attr("class", "rect_duration")
          .attr(
            "width",
            ((this.unitsize - this.margin * 2) *
              _this.adj_matrix[j][i].communication_duration) /
              this.maxDuration
          )
          .attr("height", this.barHight)
          .attr("x", _this.x + i * this.unitsize + this.margin)
          .attr("y", _this.y + j * this.unitsize + this.margin)
          .style("fill", function (d) {
            return "#e9967a";
            // 肉色
          });

        var boxLayer = _this.locallayer
          .append("g")
          .attr("class", "box_duration");
        var xmin = _this.x + i * this.unitsize + this.margin;
        var xmax = xmin + this.unitsize - 2 * this.margin;
        var y =
          _this.y + j * this.unitsize + this.margin * 2 + this.barHight * 1.5;
        var x25 = 0,
          x75 = 0,
          xmid = 0;
        var k = 0;
        if (
          _this.adj_matrix[j][i].box_duration.max ==
          _this.adj_matrix[j][i].box_duration.min
        ) {
          x25 = xmin;
          x75 = xmax;
          xmid = (xmin + xmax) / 2;
          k = 0;
        } else {
          k =
            (xmax - xmin) /
            (_this.adj_matrix[j][i].box_duration.max -
              _this.adj_matrix[j][i].box_duration.min);
          x25 =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_duration.min_quartile -
                _this.adj_matrix[j][i].box_duration.min);
          xmid =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_duration.mid -
                _this.adj_matrix[j][i].box_duration.min);
          x75 =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_duration.max_quartile -
                _this.adj_matrix[j][i].box_duration.min);
        }
        boxLayer
          .append("line")
          .attr("x1", xmin)
          .attr("y1", y)
          .attr("x2", xmax)
          .attr("y2", y)
          .attr("stroke", "#848484");
        boxLayer
          .append("rect")
          .attr("x", x25)
          .attr("y", y - 0.5 * this.barHight)
          .attr("height", this.barHight)
          .attr("width", x75 - x25)
          .style("fill", "#e9967a");

        [xmin, xmid, xmax].forEach((value) => {
          boxLayer
            .append("line")
            .attr("x1", value)
            .attr("y1", y - 0.5 * _this.barHight)
            .attr("x2", value)
            .attr("y2", y + 0.5 * _this.barHight)
            .attr("stroke", "#848484");
        });
        nodeValue
          .filter((n) => n.source == j && n.target == i)
          .forEach((n) => {
            var value = n.value[0];
            var xvalue =
              xmin + k * (value - _this.adj_matrix[j][i].box_duration.min);
            boxLayer
              .append("line")
              .attr("class", "box-node-line")
              .attr("x1", xvalue)
              .attr("y1", y - 0.5 * _this.barHight)
              .attr("x2", xvalue)
              .attr("y2", y + 0.5 * _this.barHight)
              .attr("stroke", "red");
          });

        _this.locallayer
          .append("rect")
          .attr("class", "rect_traffic")
          .attr(
            "width",
            ((this.unitsize - this.margin * 2) *
              _this.adj_matrix[j][i].traffic) /
              this.maxTraffic
          )
          .attr("height", this.barHight)
          .attr("x", _this.x + i * this.unitsize + this.margin)
          .attr(
            "y",
            _this.y + j * this.unitsize + this.margin * 3 + this.barHight * 2
          )
          .style("fill", "#8EE5EE"); // 浅蓝

        var boxLayer = _this.locallayer
          .append("g")
          .attr("class", "box_traffic");
        var xmin = _this.x + i * this.unitsize + this.margin;
        var xmax = xmin + this.unitsize - 2 * this.margin;
        var y =
          _this.y + j * this.unitsize + this.margin * 4 + this.barHight * 3.5;
        var x25 = 0,
          x75 = 0,
          xmid = 0;
        var k = 0;
        if (
          _this.adj_matrix[j][i].box_traffic.max ==
          _this.adj_matrix[j][i].box_traffic.min
        ) {
          x25 = xmin;
          x75 = xmax;
          xmid = (xmin + xmax) / 2;
          k = 0;
        } else {
          k =
            (xmax - xmin) /
            (_this.adj_matrix[j][i].box_traffic.max -
              _this.adj_matrix[j][i].box_traffic.min);
          x25 =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_traffic.min_quartile -
                _this.adj_matrix[j][i].box_traffic.min);
          xmid =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_traffic.mid -
                _this.adj_matrix[j][i].box_traffic.min);
          x75 =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_traffic.max_quartile -
                _this.adj_matrix[j][i].box_traffic.min);
        }
        boxLayer
          .append("line")
          .attr("x1", xmin)
          .attr("y1", y)
          .attr("x2", xmax)
          .attr("y2", y)
          .attr("stroke", "#848484");
        boxLayer
          .append("rect")
          .attr("x", x25)
          .attr("y", y - 0.5 * this.barHight)
          .attr("height", this.barHight)
          .attr("width", x75 - x25)
          .style("fill", "#8EE5EE"); // 浅蓝

        [xmin, xmid, xmax].forEach((value) => {
          boxLayer
            .append("line")
            .attr("x1", value)
            .attr("y1", y - 0.5 * _this.barHight)
            .attr("x2", value)
            .attr("y2", y + 0.5 * _this.barHight)
            .attr("stroke", "#848484");
        });
        nodeValue
          .filter((n) => n.source == j && n.target == i)
          .forEach((n) => {
            var value = n.value[1];
            var xvalue =
              xmin + k * (value - _this.adj_matrix[j][i].box_traffic.min);
            boxLayer
              .append("line")
              .attr("class", "box-node-line")
              .attr("x1", xvalue)
              .attr("y1", y - 0.5 * _this.barHight)
              .attr("x2", xvalue)
              .attr("y2", y + 0.5 * _this.barHight)
              .attr("stroke", "red");
          });

        var boxLayer = _this.locallayer
          .append("g")
          .attr("class", "box_bandWidth");
        var xmin = _this.x + i * this.unitsize + this.margin;
        var xmax = xmin + this.unitsize - 2 * this.margin;
        var y =
          _this.y + j * this.unitsize + this.margin * 5 + this.barHight * 4.5;
        var x25 = 0,
          x75 = 0,
          xmid = 0;
        var k = 0;
        if (
          _this.adj_matrix[j][i].box_bandWidth.max ==
          _this.adj_matrix[j][i].box_bandWidth.min
        ) {
          x25 = xmin;
          x75 = xmax;
          xmid = (xmin + xmax) / 2;
          k = 0;
        } else {
          k =
            (xmax - xmin) /
            (_this.adj_matrix[j][i].box_bandWidth.max -
              _this.adj_matrix[j][i].box_bandWidth.min);
          x25 =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_bandWidth.min_quartile -
                _this.adj_matrix[j][i].box_bandWidth.min);
          xmid =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_bandWidth.mid -
                _this.adj_matrix[j][i].box_bandWidth.min);
          x75 =
            xmin +
            k *
              (_this.adj_matrix[j][i].box_bandWidth.max_quartile -
                _this.adj_matrix[j][i].box_bandWidth.min);
        }
        boxLayer
          .append("line")
          .attr("x1", xmin)
          .attr("y1", y)
          .attr("x2", xmax)
          .attr("y2", y)
          .attr("stroke", "#848484");
        boxLayer
          .append("rect")
          .attr("x", x25)
          .attr("y", y - 0.5 * this.barHight)
          .attr("height", this.barHight)
          .attr("width", x75 - x25)
          .style("fill", "#0000FF"); // 深蓝

        [xmin, xmid, xmax].forEach((value) => {
          boxLayer
            .append("line")
            .attr("x1", value)
            .attr("y1", y - 0.5 * _this.barHight)
            .attr("x2", value)
            .attr("y2", y + 0.5 * _this.barHight)
            .attr("stroke", "#848484");
        });
        nodeValue
          .filter((n) => n.source == j && n.target == i)
          .forEach((n) => {
            var value = n.value[1];
            var xvalue =
              xmin + k * (value - _this.adj_matrix[j][i].box_duration.min);
            boxLayer
              .append("line")
              .attr("class", "box-node-line")
              .attr("x1", xvalue)
              .attr("y1", y - 0.5 * _this.barHight)
              .attr("x2", xvalue)
              .attr("y2", y + 0.5 * _this.barHight)
              .attr("stroke", "red");
          });
      }
    }
    // var c_cost = this.nodeData[this.nodes[i]].c_cost;
    // var w_cost = this.nodeData[this.nodes[i]].w_cost;
    // _this.locallayer
    //   .append("rect")
    //   .attr("class", this.nodes[i] + "-barchart")
    //   .attr("x", _this.x + this.unitsize * this.nodes.length)
    //   .attr("y", _this.y + this.unitsize * i + this.barHight)
    //   .attr("width", Math.log(c_cost))
    //   .attr("height", _this.barHight * 2)
    //   .style("fill", "#848484");
    // _this.locallayer
    //   .append("rect")
    //   .attr("class", this.nodes[i] + "-barchart")
    //   .attr("x", _this.x + this.unitsize * this.nodes.length)
    //   .attr("y", _this.y + this.unitsize * i + 5 * this.barHight)
    //   .attr("width", Math.log(w_cost))
    //   .attr("height", _this.barHight * 2)
    //   .style("fill", "#848484");
  }
  // console.log(max_ccost, max_wcost);
  for (var i in this.nodes) {
    _this.locallayer
      .append("text")
      .attr("class", "text" + _this.id)
      .text(this.nodes[i].replace("device", ""))
      .style("text-anchor", "end")
      .attr("x", this.x - 5)
      .attr("y", this.y + i * this.unitsize + 24);
    _this.locallayer
      .append("text")
      .attr("class", "text" + _this.id)
      .text(this.nodes[i].replace("device", ""))
      .style("text-anchor", "end")
      .attr("x", this.x + i * this.unitsize + 24)
      .attr("y", this.y - 5);
  }
  // this.locallayer.attr("transform", "translate(20,20)");
  var xtrans = -this.locallayer.node().getBBox().x;
  var ytrans = -this.locallayer.node().getBBox().y;
  var scale = this.matrix_size / this.locallayer.node().getBBox().height;

  this.locallayer.attr(
    "transform",
    "scale(" + scale + ")" + "translate(" + xtrans + "," + ytrans + ")"
  );
};
