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
  this.nodes.forEach((d) => {
    d.time_ratio = d.c_cost / (d.c_cost + d.w_cost);
    d.showable = true;
    minR = Math.min(d.time_ratio, minR);
    maxR = Math.max(d.time_ratio, maxR);
  });
  this.min_ratio = minR;
  this.max_ratio = maxR;

  this.renderNet();
};
Graph.prototype.getMatrixSize = function () {
  return this.matrix_size;
};

Graph.prototype.renderNet = function () {
  this.layer.select("#networklayer").remove();
  var network = this.layer.append("g").attr("id", "networklayer");
  var forceLinks = _.cloneDeep(this.links);
  var forceNodes = _.cloneDeep(this.nodes);
  d3.selectAll("#matrix > *").remove();

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

  simulation.nodes(forceNodes).on("tick", (d) => {
    handleTick(node, link, label);
  });
  simulation.force("link").links(forceLinks);
  var link = initLinks(forceLinks, network);
  var node = initNodes(
    forceNodes,
    network,
    this.min_ratio,
    this.max_ratio,
    simulation
  );
  var label = initLabels(forceNodes, network);
  window.lasso = new Lasso();
  window.lasso.bind();
};

Graph.prototype.renderMatrix = function (matrixNodes) {
  this.layer.select("#networklayer").remove();
  d3.selectAll("#matrix > *").remove();
  var network = this.layer.append("g").attr("id", "networklayer");
  var forceLinks = _.cloneDeep(this.links);
  var forceNodes = _.cloneDeep(this.nodes);

  // console.log(forceNodes);
  // console.log(matrixNodes);
  var newNodes = [];
  var newLinks = [];
  var matrixNodeNum = Object.keys(matrixNodes).length;
  forceNodes.forEach((n) => {
    var copyNode = _.cloneDeep(n);
    var index = Object.keys(matrixNodes).indexOf(copyNode.id);
    if (index <= -1) {
      copyNode.showable = true;
      newNodes.push(copyNode);
    } else {
      copyNode.showable = false;
      var nodeBottom = _.cloneDeep(copyNode),
        nodeRight = _.cloneDeep(copyNode);
      nodeBottom.id = copyNode.id + "-bottom";
      nodeBottom.fx = (this.matrix_size / matrixNodeNum) * (index + 0.5);
      nodeBottom.fy = this.matrix_size;
      newNodes.push(nodeBottom);
      nodeRight.id = copyNode.id + "-right";
      nodeRight.fx = this.matrix_size;
      nodeRight.fy = (this.matrix_size / matrixNodeNum) * (index + 0.5);
      newNodes.push(nodeRight);
    }
  });
  forceLinks.forEach((l) => {
    var sourceIndex = Object.keys(matrixNodes).indexOf(l.source);
    var targetIndex = Object.keys(matrixNodes).indexOf(l.target);
    if (sourceIndex <= -1 && targetIndex <= -1) {
      newLinks.push(_.cloneDeep(l));
    } else if (sourceIndex > -1 && targetIndex <= -1) {
      var newLink = _.cloneDeep(l);
      if (parseInt(newLink.target.substring(6)) % 2 == 0) {
        newLink.source = newLink.source + "-bottom";
      } else {
        newLink.source = newLink.source + "-right";
      }
      newLinks.push(newLink);
    } else if (sourceIndex <= -1 && targetIndex > -1) {
      var newLink = _.cloneDeep(l);
      if (parseInt(newLink.source.substring(6)) % 2 == 0) {
        newLink.target = newLink.target + "-bottom";
      } else {
        newLink.target = newLink.target + "-right";
      }
      newLinks.push(newLink);
    }
  });

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

  simulation.nodes(newNodes).on("tick", (d) => {
    handleTick(node, link, label);
  });
  simulation.force("link").links(newLinks);
  var link = initLinks(newLinks, network);
  var node = initNodes(
    newNodes,
    network,
    this.min_ratio,
    this.max_ratio,
    simulation
  );
  var label = initLabels(newNodes, network);
  window.lasso = new Lasso();
  window.lasso.bind();
};

function handleTick(node, link, label) {
  // console.log("tick");
  link.attr("d", function (d) {
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
      // console.log(d3.select("#links").)
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
  });
  label
    .attr("x", function (d) {
      return d.x + 10;
    })
    .attr("y", function (d) {
      return d.y + 3;
    });
  node
    .attr("cx", function (d) {
      // window.paths.data.forEach(function (dd) {
      //   if (dd.force_id == d.id) {
      //     dd.pos_end.x = d.x;
      //     dd.pos_end.y = d.y;
      //   }
      // });
      return d.x;
    })
    .attr("cy", function (d) {
      return d.y;
    });
}

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
      if (d.showable) {
        return d.label;
      } else {
        return "";
      }
    });
  return label;
}

function initNodes(nodesData, network, minR, maxR, simulation) {
  network.select(".nodes").remove();

  var node = network
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodesData)
    .enter()
    .append("circle")
    .attr("visibility", function (d) {
      if (!d.showable) {
        return "hidden";
      } else {
        return "visible";
      }
    })
    .attr("r", function (d) {
      return Math.log(d.c_cost + d.w_cost);
    })
    .attr("id", function (d) {
      return d.id;
    })
    .style("fill", function (d) {
      return gradientColor("#fbe7d5", "#e6882e", minR, maxR, d.time_ratio);
    })
    .attr("pointer-events", "all")
    .on("mouseenter", function (d) {
      d3.select(this).attr("stroke", "red");
    })
    .on("mouseleave", function (d) {
      d3.select(this).attr("stroke", "none");
    })
    .call(
      d3
        .drag()
        .on("start", function (d) {
          if (d.showable) {
            if (!d3.event.active) simulation.alphaTarget(0.1).restart();
            d.fx = d.x;
            d.fy = d.y;
          }
        })
        .on("drag", function (d) {
          if (d.showable) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
          }
        })
        .on("end", function (d) {
          if (d.showable) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }
        })
    );
  return node;
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
    .on("mousedown", (d) => {
      let id1 = d.source.id;
      let id2 = d.target.id;
      var newNodes = {};
      newNodes[id1] = true;
      newNodes[id2] = true;

      var m = new Matrix();
      window.graph.renderMatrix(newNodes);
      m.create(Object.keys(newNodes), true);
    });

  return link;
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
