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
  this.matrix_size = window.communicategraph.getMatrixSize();

  this.maxDuration = -1;
  this.maxTraffic = -1;
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
//   this.nodeData = window.communicategraph.getNodesData(node);
//   // this.nodeData.forEach((n)=>{

//   // })
// };

Matrix.prototype.create = function (node, linkSelect = null, nodeValue = []) {
  this.linkSelect = linkSelect;
  console.log(linkSelect);
  this.locallayer.on("contextmenu", function (d) {
    d3.event.preventDefault();
    window.communicategraph.renderNet();
    d3.selectAll("#matrix > *").remove();
  });
  this.nodeData = window.communicategraph.getNodesData(node);

  for (var i in node) {
    this.nodes.push(node[i]);
  }

  this.num_nodes = node.length;
  var originData = window.communicategraph.getLinks();

  originData.forEach((d) => {
    // console.log(d);
    this.maxDuration = Math.max(this.maxDuration, d.communication_duration);
    this.maxTraffic = Math.max(this.maxTraffic, d.traffic);
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
      box_bandWidth: this.edges[i].op_bandWidth,
      box_duration: this.edges[i].op_duration,
      box_traffic: this.edges[i].op_traffic,
      type: this.edges[i].link_type,
    };
    // console.log(this.adj_matrix[x][y].box_duration);
    // this.maxDuration = Math.max(
    //   this.maxDuration,
    //   this.edges[i].communication_duration
    // );
    // this.maxTraffic = Math.max(this.maxTraffic, this.edges[i].traffic);
  }
  this.render(nodeValue);
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
            edge: _this.adj_matrix[j][i],
          },
        ])
        .attr("class", "matrixBlock")
        .attr("width", this.unitsize)
        .attr("height", this.unitsize)
        .attr("x", _this.x + i * this.unitsize)
        .attr("y", _this.y + j * this.unitsize)
        .style("fill", function (d) {
          // return "#cecfd1";
          if (d.edge.exist) {
            if (d.link_type == "SDMA") {
              return "#cecfd1";
            } else {
              return "#a1a1a1";
            }
          } else {
            return "white";
          }
        })
        .style("fill-opacity", "60%")
        .attr("stroke", (d) => {
          // if (this.linkSelect) {
          //   if (j == 0 && i == 1) {
          //     return "#cb6056";
          //   }
          // } else if (
          //   nodeValue.filter((n) => n.source == j && n.target == i).length != 0
          // ) {
          //   return "#cb6056";
          // }
          return "#999999";
          // return "none";
        });
      // .call(
      //   d3.drag().on("drag", function (d) {
      //     var matrix = matrix_list[d.id];
      //     var mat = d3.selectAll(".matrix" + d.id);
      //     matrix.x = d3.event.x - d.i * matrix.unitsize;
      //     matrix.y = d3.event.y - d.j * matrix.unitsize;
      //     matrix.render();
      //     window.paths.updateData();
      //     window.paths.render();
      //   })
      // );

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
            return "#f6b59a";
            // 肉色
          })
          .attr("stroke", "#999999");

        var boxLayer = _this.locallayer
          .append("g")
          .attr("class", "box_duration");

        var xmin = _this.x + i * this.unitsize + this.margin;
        var xmax = xmin + this.unitsize - 2 * this.margin;
        var y =
          _this.y + j * this.unitsize + this.margin * 2 + this.barHight * 1.5;
        var dataSelect = null;
        nodeValue
          .filter((n) => n.source == j && n.target == i)
          .forEach((n) => {
            dataSelect = n.value[0];
          });
        this.renderBoxPlot(
          boxLayer,
          [xmin, xmax],
          y,
          _this.adj_matrix[j][i].box_duration,
          "#f6b59a",
          dataSelect
        );

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
          .style("fill", "#a8d2e5"); // 浅蓝

        boxLayer = _this.locallayer.append("g").attr("class", "box_traffic");
        xmin = _this.x + i * this.unitsize + this.margin;
        xmax = xmin + this.unitsize - 2 * this.margin;
        y = _this.y + j * this.unitsize + this.margin * 4 + this.barHight * 3.5;
        dataSelect = null;
        nodeValue
          .filter((n) => n.source == j && n.target == i)
          .forEach((n) => {
            dataSelect = n.value[1];
          });
        this.renderBoxPlot(
          boxLayer,
          [xmin, xmax],
          y,
          _this.adj_matrix[j][i].box_traffic,
          "#a8d2e5",
          dataSelect
        );

        boxLayer = _this.locallayer.append("g").attr("class", "box_bandWidth");
        xmin = _this.x + i * this.unitsize + this.margin;
        xmax = xmin + this.unitsize - 2 * this.margin;
        y = _this.y + j * this.unitsize + this.margin * 5 + this.barHight * 4.5;
        dataSelect = null;
        nodeValue
          .filter((n) => n.source == j && n.target == i)
          .forEach((n) => {
            dataSelect = n.value[2];
          });
        this.renderBoxPlot(
          boxLayer,
          [xmin, xmax],
          y,
          _this.adj_matrix[j][i].box_bandWidth,
          "#378dc0",
          dataSelect
        );
      }
    }
  }
  // console.log(this.linkSelect, this.nodes);
  for (var i in this.nodes) {
    for (var j in this.nodes) {
      console.log(this.nodes[j], this.nodes[i], this.linkSelect);
      if (
        (this.linkSelect != null &&
          this.nodes[j] == this.linkSelect[0] &&
          this.nodes[i] == this.linkSelect[1]) ||
        // (j == 0 && i == 1 && this.linkSelect) ||
        nodeValue.filter((n) => n.source == j && n.target == i).length != 0
      ) {
        // this.locallayer.select("#block_1_0").attr("stroke", "#cb6056");
        this.locallayer
          .append("rect")
          .attr("class", "matrixBlockOutline")
          .attr("width", this.unitsize)
          .attr("height", this.unitsize)
          .attr("x", _this.x + i * this.unitsize)
          .attr("y", _this.y + j * this.unitsize)
          .attr("stroke", "#cb6056")
          .attr("fill", "none");
      }
    }
  }

  var xtrans = -this.locallayer.node().getBBox().x + 15;
  var ytrans = -this.locallayer.node().getBBox().y + 15;
  var scale = (this.matrix_size - 10) / this.locallayer.node().getBBox().height;

  this.locallayer.attr(
    "transform",
    "scale(" + scale + ")" + "translate(" + xtrans + "," + ytrans + ")"
  );

  d3.select("#mainsvg > g.matrix-lable").remove();

  var labelWrapper = d3
    .select("#networkPlot > #mainsvg")
    .append("g")
    .attr("class", "matrix-lable");
  // console.log(this.matrix_size / this.nodes.length);
  this.nodes.forEach((nodename, index) => {
    var y = 10 + (index + 0.5) * (this.matrix_size / this.nodes.length);
    labelWrapper
      .append("text")
      .text(nodename.replace("device", ""))
      .attr("x", 5)
      .attr("y", y);

    labelWrapper
      .append("text")
      .text(nodename.replace("device", ""))
      .attr("x", y)
      .attr("y", 15);
  });
};

Matrix.prototype.renderBoxPlot = function (
  boxLayer,
  x,
  y,
  data,
  color,
  dataSelect = null
) {
  var rawData = [];
  data.forEach((d) => {
    rawData.push(d.value);
  });
  var value25 = d3.quantile(rawData, 0.25);
  var value50 = d3.quantile(rawData, 0.5);
  var value75 = d3.quantile(rawData, 0.75);
  var p1, p2, p3, p4, p5;
  var k, b;
  var valuemin, valuemax;
  var maximum, minimum;
  if (rawData[0] == rawData[rawData.length - 1]) {
    p1 = (x[0] + x[1]) / 2;
    p2 = p1;
    p3 = p1;
    p4 = p1;
    p5 = p1;
    k = 0;
    b = p1;
  } else {
    var iqr = value75 - value25;
    maximum = value75 + 1.5 * iqr;
    minimum = value25 - 1.5 * iqr;
    valuemin = Math.min(rawData[0], minimum);
    valuemax = Math.max(rawData[rawData.length - 1], maximum);
    // if (data[0] < minimum) {
    //   console.log(data[0], minimum);
    // }
    k = (x[1] - x[0]) / (valuemax - valuemin);
    b = (valuemax * x[0] - valuemin * x[1]) / (valuemax - valuemin);
    p1 = k * minimum + b;
    p2 = k * value25 + b;
    p3 = k * value50 + b;
    p4 = k * value75 + b;
    p5 = k * maximum + b;
  }

  boxLayer
    .append("line")
    .attr("x1", p1)
    .attr("y1", y)
    .attr("x2", p5)
    .attr("y2", y)
    .attr("stroke", "#999999");
  boxLayer
    .append("rect")
    .attr("x", p2)
    .attr("y", y - 0.5 * this.barHight)
    .attr("height", this.barHight)
    .attr("width", p4 - p2)
    .style("fill", color)
    .attr("stroke", "#999999");
  [p1, p3, p5].forEach((p) => {
    boxLayer
      .append("line")
      .attr("x1", p)
      .attr("y1", y - 0.5 * this.barHight)
      .attr("x2", p)
      .attr("y2", y + 0.5 * this.barHight)
      .attr("stroke", "#999999");
  });
  data.forEach((d) => {
    if (d.value < minimum || d.value > maximum) {
      // console.log(d.name);
      boxLayer
        .append("circle")
        .attr("cx", k * d.value + b)
        .attr("cy", y)
        .attr("r", 1)
        .style("fill", color)
        .on("mouseover", () => {
          this.locallayer
            .append("text")
            .attr("id", "hover-circle-text")
            .attr("x", k * d.value + b)
            .attr("y", y - 5)
            .attr("font-size", 5)
            .text(d.name);
        })
        .on("mouseout", () => {
          this.locallayer.select("#hover-circle-text").remove();
        })
        .on("click", () => {
          window.communicategraph.setSelectOpname(d);
          // console.log(window.communicategraph.selectOpname);
          // this.$store.emit("setInfo", val);
        });
    }
  });
  // boxLayer
  //   .data(data)
  //   .enter()
  //   .append("circle")
  //   .attr("cx", (d) => {
  //     return k * d.value + b;
  //   })
  //   .attr("cy", y)
  //   .attr("r", 1)
  //   .style("fill", color);
  if (dataSelect != null) {
    if (dataSelect < minimum || dataSelect > maximum) {
      boxLayer
        .append("circle")
        .attr("cx", k * dataSelect + b)
        .attr("cy", y)
        .attr("r", 1)
        .style("fill", "#cb6056");
    } else {
      boxLayer
        .append("line")
        .attr("x1", k * dataSelect + b)
        .attr("y1", y - 0.5 * this.barHight)
        .attr("x2", k * dataSelect + b)
        .attr("y2", y + 0.5 * this.barHight)
        .attr("stroke", "#cb6056");
    }
  }
};
