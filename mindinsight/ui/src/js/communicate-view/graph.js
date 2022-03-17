import * as d3 from "d3";
import { gradientColor } from "@/js/communicate-view/get-gradient-color.js";
import { Lasso } from "@/js/communicate-view/lasso.js";
import { Matrix } from "@/js/communicate-view/matrix.js";
import * as _ from "lodash";
export function Graph(w, h) {
  this.w = w;
  this.h = h;
  this.nodes = [];
  this.links = [];
  this.currNodes = [];
  this.currLinks = [];
  this.min_ratio = 1;
  this.max_ratio = 0;
  this.inputNodes = [];
  this.inputLinks = [];
  this.forceNodes = [];
  this.forceLinks = [];
  this.netNodes = [];
  this.netLinks = [];
  this.staticNodes = [];
  this.staticLinks = [];
  this.matrix_size = w * 0.5;
}
Graph.prototype.init = function (links, nodes) {
  this.nodes = nodes;
  this.links = links;
  d3.selectAll("#networklayer").remove();
  this.layer = d3.select("#force");
  this.svg = d3.select("#mainsvg");
  initDefs(this.svg);
  var minR = 1,
    maxR = 0;
  nodes.forEach((d) => {
    d.time_ratio = d.c_cost / (d.c_cost + d.w_cost);
    minR = Math.min(d.time_ratio, minR);
    maxR = Math.max(d.time_ratio, maxR);
    this.forceNodes.push(d);
  });
  this.min_ratio = minR;
  this.max_ratio = maxR;
  links.forEach((d) => {
    this.forceLinks.push(d);
  });
  var network = this.layer.append("g").attr("id", "networklayer");
  var simulation = d3
    .forceSimulation()
    .force(
      "link",
      d3
        .forceLink()
        .id(function (d) {
          return d.id;
        })
        .distance(function (d) {
          return 100;
        })
    )
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(this.w / 2, this.h / 2))
    .force("x", d3.forceX(this.w))
    .force("y", d3.forceY(this.h));

  simulation.nodes(this.forceNodes);
  simulation.force("link").links(this.forceLinks);
  simulation
    .on("tick", function () {
      console.log("communicate view forcing");
    })
    .on("end", () => {
      this.netNodes = _.cloneDeep(this.forceNodes);
      this.netLinks = _.cloneDeep(this.forceLinks);
      this.forceNodes.forEach((n) => {
        if (n.x <= this.matrix_size && n.y <= this.matrix_size) {
          if (n.x > n.y) {
            n.x = this.matrix_size + n.x * 0.5;
          } else {
            n.y = this.matrix_size + n.y * 0.5;
          }
        }
      });
      this.staticLinks = _.cloneDeep(this.forceLinks);
      this.staticNodes = _.cloneDeep(this.forceNodes);
      initLinks(this.netLinks, network);
      initNodes(this.netNodes, network, minR, maxR);
      initLabels(this.netNodes, network);
      window.lasso = new Lasso();
      window.lasso.bind();
    });
};
Graph.prototype.getMatrixSize = function () {
  return this.matrix_size;
};

Graph.prototype.renderNet = function () {
  d3.selectAll("#matrix > *").remove();
  var network = this.layer.select("#networklayer");
  initLinks(this.netLinks, network);
  initNodes(this.netNodes, network, this.min_ratio, this.max_ratio);
  initLabels(this.netNodes, network);
  window.lasso = new Lasso();
  window.lasso.bind();
};

Graph.prototype.renderMatrix = function (matrixNodes) {
  var network = this.layer.select("#networklayer");

  // var renderLinks = _.cloneDeep(this.staticLinks);
  var renderLinks = [];
  var renderNodes = [];
  this.staticNodes.forEach((n) => {
    if (Object.keys(matrixNodes).indexOf(n.id) <= -1) {
      renderNodes.push(_.cloneDeep(n));
    }
  });
  // console.log(renderNodes);
  // console.log(Object.keys(matrixNodes).length);
  // var box=d3.select("#mainsvg").select("")
  // var box = d3.select("#matrixBox").node().getBBox();
  // console.log(box);
  var matrixNodeNum = Object.keys(matrixNodes).length;
  this.staticLinks.forEach((l, index) => {
    var sourceIndex = Object.keys(matrixNodes).indexOf(l.source.id);
    var targetIndex = Object.keys(matrixNodes).indexOf(l.target.id);
    if (sourceIndex <= -1 && targetIndex <= -1) {
      renderLinks.push(_.cloneDeep(l));
    } else if (sourceIndex > -1 && targetIndex > -1) {
    } else if (sourceIndex > -1) {
      var newLink = _.cloneDeep(l);
      if (l.target.x > l.target.y) {
        newLink.source.x = this.matrix_size;
        newLink.source.y =
          (this.matrix_size / matrixNodeNum) * (sourceIndex + 0.5);
        // newLink.source.x=this.matrix_size/Object.keys(matrixNodes).length
      } else {
        newLink.source.y = this.matrix_size;
        newLink.source.x =
          (this.matrix_size / matrixNodeNum) * (sourceIndex + 0.5);
      }
      renderLinks.push(newLink);
    } else if (targetIndex > -1) {
      var newLink = _.cloneDeep(l);
      if (l.source.x > l.source.y) {
        newLink.target.x = this.matrix_size;
        newLink.target.y =
          (this.matrix_size / matrixNodeNum) * (targetIndex + 0.5);
        // newLink.source.x=this.matrix_size/Object.keys(matrixNodes).length
      } else {
        newLink.target.y = this.matrix_size;
        newLink.target.x =
          (this.matrix_size / matrixNodeNum) * (targetIndex + 0.5);
      }
      renderLinks.push(newLink);
    }
  });
  initLinks(renderLinks, network);
  initNodes(renderNodes, network, this.min_ratio, this.max_ratio);
  initLabels(renderNodes, network);
  window.lasso = new Lasso();
  window.lasso.bind();
};

function initLabels(nodesData, network) {
  // console.log(initLabels);
  network.select(".labels").remove();
  var label = network
    .append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodesData)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("id", function (d) {
      return "l" + d.id;
    })
    .text(function (d) {
      return d.label;
    })
    .attr("x", function (d) {
      return d.x + 10;
    })
    .attr("y", function (d) {
      return d.y + 3;
    });
}

function initNodes(nodesData, network, minR, maxR) {
  network.select(".nodes").remove();
  var node = network
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodesData)
    .enter()
    .append("circle")
    .attr("r", function (d) {
      return Math.log(d.c_cost + d.w_cost);
    })
    .attr("id", function (d) {
      return d.id;
    })
    .style("fill", function (d) {
      return gradientColor("#fbe7d5", "#e6882e", minR, maxR, d.time_ratio);
      //   return "#bbb";
    })
    .attr("pointer-events", "all")
    .on("mouseover", function (d) {
      d3.select(this).attr("stroke", "red");
    })
    .on("mouseout", function (d) {
      d3.select(this).attr("stroke", "none");
    })
    .attr("cx", function (d) {
      return d.x;
    })
    .attr("cy", function (d) {
      return d.y;
    });
}

function initLinks(linksData, network) {
  network.select(".links").remove();
  var link = network
    .append("g")
    .attr("class", "links")
    .attr("id", "links")
    .selectAll("path")
    .data(linksData)
    .enter()
    .append("path")
    // .attr("class", function (d) {
    //   return d.link_type;
    // })
    .style("fill", "none")
    .style("stroke", function (d) {
      if (d.link_type == "SDMA") return "#cecfd1";
      else return "a1a1a1";
    })
    .attr("stroke-width", function (d) {
      return d.weight;
    })
    .attr("marker-end", function (d) {
      if (d.link_type == "SDMA") return "url(#arrowSDMA)";
      else return "url(#arrowOther)";
    })
    .attr("pointer-events", "all")
    .style("cursor", "pointer")
    .attr("cx", function (d) {
      return d.x;
    })
    .attr("d", (d) => {
      var x1 = d.source.x,
        y1 = d.source.y,
        x2 = d.target.x,
        y2 = d.target.y,
        dx = x2 - x1,
        dy = y2 - y1,
        dr = Math.sqrt(dx * dx + dy * dy),
        // Defaults for normal edge.
        drx = dr,
        dry = dr,
        xRotation = 0, // degrees
        largeArc = 0, // 1 or 0
        sweep = 1; // 1 or 0
      // Self edge.
      if (x1 === x2 && y1 === y2) {
        xRotation = 45;
        largeArc = 1;
        drx = 20;
        dry = 20;
        x2 = x2 + 1;
        y2 = y2 + 1;
      }

      return (
        "M" +
        x1 +
        "," +
        y1 +
        "A" +
        drx +
        "," +
        dry +
        " " +
        xRotation +
        "," +
        largeArc +
        "," +
        sweep +
        " " +
        x2 +
        "," +
        y2
      );
    })
    .on("mousedown", (d) => {
      // console.log(d);
      let id1 = d.source.id;
      let id2 = d.target.id;
      var newNodes = {};
      newNodes[id1] = true;
      newNodes[id2] = true;

      var m = new Matrix();
      window.graph.renderMatrix(newNodes);
      m.create(Object.keys(newNodes), true);
    });
}

function initDefs(svg) {
  var defs = svg.append("defs");
  var arrowMarkerSDMA = defs
    .append("marker")
    .attr("id", "arrowSDMA")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "8")
    .attr("markerHeight", "8")
    .attr("viewBox", "0 0 12 12")
    .attr("refX", "13")
    .attr("refY", "6")
    .attr("orient", "auto");
  var arrow_path = "M2,2 L10,6 L2,10 L4,6 L2,2";
  arrowMarkerSDMA.append("path").attr("d", arrow_path).attr("fill", "#cecfd1");

  var arrowMarkerOther = defs
    .append("marker")
    .attr("id", "arrowOther")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "8")
    .attr("markerHeight", "8")
    .attr("viewBox", "0 0 12 12")
    .attr("refX", "13")
    .attr("refY", "6")
    .attr("orient", "auto");
  var arrow_path = "M2,2 L10,6 L2,10 L4,6 L2,2";
  arrowMarkerOther.append("path").attr("d", arrow_path).attr("fill", "#a1a1a1");
}

// Graph.prototype.node = [];
Graph.prototype.getLinks = function () {
  return this.links;
};
Graph.prototype.getNodesData = function (nameList) {
  var resData = {};
  this.nodes.forEach((node) => {
    if (nameList.includes(node.id)) {
      resData[node.id] = { c_cost: node.c_cost, w_cost: node.w_cost };
    }
  });
  // console.log(resData);
  return resData;
};