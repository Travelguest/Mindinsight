import * as d3 from "d3";
export function Paths() {
  this.data = [];
  this.num = 0;
  this.created = false;
}

Paths.prototype.outDist = 20;

Paths.prototype.create = function (originData) {
  this.created = true;
  this.data = [];
  this.num = 0;
  var _this = this;
  this.locallayer = d3.select("#path");
  this.originData = originData;
};

Paths.prototype.updateData = function () {
  this.data.forEach(function (d) {
    var matrix;
    var num;
    for (var i in window.matrix_list) {
      // console.log(window.matrix_list[i].nodes);
      if (window.matrix_list[i].nodes.indexOf(d.matrix_id) >= 0) {
        matrix = window.matrix_list[i];
        num = matrix.nodes.indexOf(d.matrix_id);
        break;
      }
    }
    d.x = matrix.x;
    d.y = matrix.y;
    d.pos0.x = matrix.x + num * matrix.unitsize + matrix.unitsize / 2;
    d.pos0.y = matrix.y;
    d.pos1.x = matrix.x;
    d.pos1.y = matrix.y + num * matrix.unitsize + matrix.unitsize / 2;
    d.pos2.x = matrix.x + matrix.num_nodes * matrix.unitsize;
    d.pos2.y = matrix.y + num * matrix.unitsize + matrix.unitsize / 2;
    d.pos3.x = matrix.x + num * matrix.unitsize + matrix.unitsize / 2;
    d.pos3.y = matrix.y + matrix.num_nodes * matrix.unitsize;
  });
};

Paths.prototype.push = function (id) {
  this.updateData();
  var _this = this;
  var matrix;
  var num;
  for (var i in window.matrix_list) {
    if (window.matrix_list[i].nodes.indexOf(id) >= 0) {
      matrix = window.matrix_list[i];
      num = window.matrix_list[i].nodes.indexOf(id);
      break;
    }
  }
  // console.log(this.originData);
  this.originData.forEach(function (d) {
    var in_matrix, in_force;
    // console.log(d);
    if (d.source.id == id) {
      in_matrix = id;
      in_force = d.target.id;
    } else if (d.target.id == id) {
      in_matrix = id;
      in_force = d.source.id;
    } else return;
    var node = d3.select("#" + in_force);
    if (node.empty()) return;
    _this.data.push({
      r: node.attr("r"),
      x: matrix.x,
      y: matrix.y,
      matrix_id: in_matrix,
      force_id: in_force,
      center: {
        x: matrix.x + num * matrix.unitsize + matrix.unitsize / 2,
        y: matrix.y + num * matrix.unitsize + matrix.unitsize / 2,
      },
      pos0: {
        x: matrix.x + num * matrix.unitsize + matrix.unitsize / 2,
        y: matrix.y,
      },
      pos1: {
        x: matrix.x,
        y: matrix.y + num * matrix.unitsize + matrix.unitsize / 2,
      },
      pos2: {
        x: matrix.x + matrix.num_nodes * matrix.unitsize,
        y: matrix.y + num * matrix.unitsize + matrix.unitsize / 2,
      },
      pos3: {
        x: matrix.x + num * matrix.unitsize + matrix.unitsize / 2,
        y: matrix.y + matrix.num_nodes * matrix.unitsize,
      },
      pos_end: { x: 0, y: 0 },
    });
    _this.num++;
  });
  // console.log(this.data);
  // this.render();
};

Paths.prototype.generate = function (d) {
  var _this = this;
  var result = [];
  result.push([d.pos_end.x, d.pos_end.y]);
  var xx = d.pos2.x;
  var yy = d.pos3.y;
  //decide the point to use
  //console.log(_this.x)
  if (d.pos_end.x <= d.x && d.pos_end.y <= yy) {
    //left
    //console.log(1);
    result.push([d.pos1.x - _this.outDist, d.pos1.y]);
    result.push([d.pos1.x, d.pos1.y]);
  } else if (d.pos_end.x >= xx && d.pos_end.y >= d.y) {
    //right
    //console.log(2);
    result.push([d.pos2.x + _this.outDist, d.pos2.y]);
    result.push([d.pos2.x, d.pos2.y]);
  } else if (d.pos_end.x >= d.x && d.pos_end.y <= d.y) {
    //up
    //console.log(3);
    result.push([d.pos0.x, d.pos0.y - _this.outDist]);
    result.push([d.pos0.x, d.pos0.y]);
  } else if (d.pos_end.x <= xx && d.pos_end.y >= yy) {
    //down
    //console.log(4);
    result.push([d.pos3.x, d.pos3.y + _this.outDist]);
    result.push([d.pos3.x, d.pos3.y]);
  }
  if (result.length < 3) {
    //console.log(d);
    return result;
  }
  //console.log(result[1]);
  //console.log(d);
  var dis = Math.sqrt(
    (result[0][0] - result[1][0]) * (result[0][0] - result[1][0]) +
      (result[0][1] - result[1][1]) * (result[0][1] - result[1][1])
  );
  result[0][0] =
    result[0][0] + ((d.r * 1.1) / dis) * (result[1][0] - result[0][0]);
  result[0][1] =
    result[0][1] + ((d.r * 1.1) / dis) * (result[1][1] - result[0][1]);

  // console.log(result);
  return result;
};

Paths.prototype.render = function () {
  d3.selectAll("#mainsvg>#path>*").remove();
  var _this = this;
  var line = d3
    .line()
    .x(function (d) {
      return d[0];
    })
    .y(function (d) {
      return d[1];
    })
    .curve(d3.curveBasis);
  this.locallayer
    .selectAll("path")
    .data(_this.data)
    .enter()
    .append("path")
    .attr("class", function (d) {
      return "path" + d.matrix_id;
    })
    .attr("d", function (d) {
      // console.log(d);
      // console.log("path");
      return line(_this.generate(d));
    })
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("fill", "none")
    .attr("stroke-opacity", 0.2);
};
