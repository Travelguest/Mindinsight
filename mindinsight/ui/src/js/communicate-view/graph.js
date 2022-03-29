import * as d3 from "d3";
import { gradientColor } from "@/js/communicate-view/get-gradient-color.js";
import { Lasso } from "@/js/communicate-view/lasso.js";
import { Matrix } from "@/js/communicate-view/matrix.js";
import * as _ from "lodash";
export function Graph(w, h, father) {
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
  this.father = father;
}

Graph.prototype.setMatrixSize = function (newsize) {
  if (newsize != 0) {
    this.matrix_size = newsize;
  } else {
    this.matrix_size = this.w * 0.5;
  }
};

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
Graph.prototype.selectOpname = "";
Graph.prototype.setSelectOpname = function (op) {
  this.father.setSelectErrorOp(op);
};
Graph.prototype.getMatrixSize = function () {
  return this.matrix_size;
};

Graph.prototype.renderNet = function () {
  this.layer.select("#networklayer").remove();
  d3.select("#mainsvg > g.matrix-lable").remove();
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
          return 150;
        })
    )
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(this.w / 2, this.h / 2));
  // .force("x", d3.forceX(this.w))
  // .force("y", d3.forceY(this.h));

  simulation.nodes(forceNodes).on("tick", (d) => {
    forceNodes.forEach((n) => {
      if (n.x < 50) {
        n.x = 50;
      }
      if (n.x > this.w - 50) {
        n.x = this.w - 50;
      }
      if (n.y < 50) {
        n.y = 50;
      }
      if (n.y > this.h - 20) {
        n.y = this.h - 20;
      }
    });
    handleTick(node, link, label, this.w * 0.9, this.h * 0.9);
  });
  simulation.force("link").links(forceLinks);
  var link = initLinks(forceLinks, network);
  var node = initNodes(
    forceNodes,
    network,
    this.min_ratio,
    this.max_ratio,
    simulation,
    this.w,
    this.h
  );
  var label = initLabels(forceNodes, network);

  // var zoom = d3
  //   .zoom()
  //   .scaleExtent([-10, 10])
  //   .on("zoom", () => {
  //     network.attr("transform", d3.event.transform);
  //     console.log(d3.event);
  //   });
  // network.call(zoom);
  window.lasso = new Lasso();
  window.lasso.bind();
};

Graph.prototype.renderMatrix = function (matrixNodes) {
  this.layer.select("#networklayer").remove();
  d3.selectAll("#matrix > *").remove();
  d3.select("#mainsvg > g.matrix-lable").remove();
  var network = this.layer.append("g").attr("id", "networklayer");
  var forceLinks = _.cloneDeep(this.links);
  var forceNodes = _.cloneDeep(this.nodes);

  // console.log(forceNodes);
  // console.log(matrixNodes);
  var newNodes = [];
  var newLinks = [];
  // console.log(matrixNodes);

  // console.log(matrixNodes);
  var matrixNodeNum = Object.keys(matrixNodes).length;
  forceNodes.forEach((n) => {
    var copyNode = _.cloneDeep(n);
    var index = Object.keys(matrixNodes).indexOf(copyNode.id);
    // console.log(n, index);
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
      nodeRight.fx = this.matrix_size + 5;
      nodeRight.fy =
        5 + ((this.matrix_size - 5) / matrixNodeNum) * (index + 0.5);
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
      // if (parseInt(newLink.target.substring(6)) % 2 == 0) {
      //   newLink.source = newLink.source + "-bottom";
      // } else {
      //   newLink.source = newLink.source + "-right";
      // }
      newLink.source = newLink.source + "-right";
      newLinks.push(newLink);
    } else if (sourceIndex <= -1 && targetIndex > -1) {
      var newLink = _.cloneDeep(l);
      // if (parseInt(newLink.source.substring(6)) % 2 == 0) {
      //   newLink.target = newLink.target + "-bottom";
      // } else {
      //   newLink.target = newLink.target + "-right";
      // }
      newLink.target = newLink.target + "-right";
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
          return 120;
        })
    )
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(this.w * 0.5, this.h / 2));

  simulation.nodes(newNodes).on("tick", (d) => {
    newNodes.forEach((n) => {
      if (n.x < 50) {
        n.x = 50;
      }
      if (n.x > this.w - 50) {
        n.x = this.w - 50;
      }
      if (n.y < 50) {
        n.y = 50;
      }
      if (n.y > this.h - 20) {
        n.y = this.h - 20;
      }
    });
    handleTick(node, link, label, this.w * 0.9, this.h * 0.9);
  });
  // .on("end", (d) => {
  //   console.log("forceend");
  //   newNodes.forEach((n) => {
  //     if (n.showable) {
  //       if (n.x <= this.matrix_size + 10 && n.y <= this.matrix_size + 10) {
  //         n.x = this.matrix_size + n.x * 0.5;
  //         // if (parseInt(n.id.substring(6)) % 2 == 0) {
  //         //   n.y = this.matrix_size + 10;
  //         // } else {
  //         //   n.x = this.matrix_size + 10;
  //         // }
  //       }
  //     }
  //     handleTick(node, link, label, this.w * 0.9, this.h * 0.9);
  //   });
  // });
  simulation.force("link").links(newLinks);
  var link = initLinks(newLinks, network);
  var node = initNodes(
    newNodes,
    network,
    this.min_ratio,
    this.max_ratio,
    simulation,
    true,
    this.w,
    this.h
  );
  var label = initLabels(newNodes, network);
  window.lasso = new Lasso();
  window.lasso.bind();
};

function handleTick(node, link, label, w, h) {
  // console.log("tick");
  link.attr("d", function (d) {
    var x1 = d.source.x,
      x2 = d.target.x,
      y1 = d.source.y,
      y2 = d.target.y;
    // var x1 = Math.min(d.source.x, w),
    //   y1 = Math.min(d.source.y, h),
    //   x2 = Math.min(d.target.x, w),
    //   y2 = Math.min(d.target.y, h);
    // x1 = Math.max(20, x1);
    // x2 = Math.max(20, x2);
    // y1 = Math.max(20, y1);
    // y2 = Math.max(20, y2);

    var dx = x2 - x1,
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
      // var x = Math.min(d.x, w);
      // x = Math.max(20, x);
      return d.x + 10;
    })
    .attr("y", function (d) {
      // var y = Math.min(d.y, w);
      // y = Math.max(20, y);
      return d.y + 3;
    });
  node
    .attr("cx", function (d) {
      // var x = Math.min(d.x, w);
      // x = Math.max(20, x);
      // window.paths.data.forEach(function (dd) {
      //   if (dd.force_id == d.id) {
      //     dd.pos_end.x = d.x;
      //     dd.pos_end.y = d.y;
      //   }
      // });
      return d.x;
    })
    .attr("cy", function (d) {
      // var y = Math.min(d.y, w);
      // y = Math.max(20, y);
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

function initNodes(
  nodesData,
  network,
  minR,
  maxR,
  simulation,
  draggable = true,
  w,
  h
) {
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
      return Math.abs(Math.log(d.c_cost + d.w_cost));
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
    });
  if (draggable) {
    node.call(
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
            // d.fx = null;
            // d.fy = null;
          }
        })
    );
  }

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
      // console.log(d.link_type);
      if (d.link_type == "SDMA") return "#cecfd1";
      else return "#a1a1a1";
    })
    .attr("stroke-width", function (d) {
      // return Math.log(d.weight);
      return 1;
    })
    .attr("marker-end", function (d) {
      if (d.link_type == "SDMA") return "url(#arrowSDMA)";
      else return "url(#arrowOther)";
    })
    .attr("pointer-events", "all")
    .style("cursor", "pointer")
    .on("mousedown", (d) => {
      let id1 = d.source.id.split("-")[0];
      let id2 = d.target.id.split("-")[0];
      var newNodes = {};
      newNodes[id1] = true;
      newNodes[id2] = true;
      window.communicategraph.setMatrixSize(2 * 60);
      var m = new Matrix();
      var nodeList = Object.keys(newNodes).sort(
        (a, b) =>
          Number(a.replace("device", "")) - Number(b.replace("device", ""))
      );
      newNodes = {};
      nodeList.forEach((n) => {
        newNodes[n] = true;
      });
      window.communicategraph.renderMatrix(newNodes);
      // console.log(newNodes);
      m.create(Object.keys(newNodes), true);
    });

  return link;
}

Graph.prototype.showOpNode = function (nodeData) {
  // console.log(nodeData);
  // var matrixNodes = {},newDict={}
  var matrixNodes = {};
  nodeData.forEach((node) => {
    matrixNodes[node.source] = true;
    matrixNodes[node.target] = true;
  });
  var deviceList = Object.keys(matrixNodes);
  var nodeValue = [];
  nodeData.forEach((node) => {
    nodeValue.push({
      source: deviceList.indexOf(node.source),
      target: deviceList.indexOf(node.target),
      value: node.opValue,
    });
  });

  var nodeList = Object.keys(matrixNodes).sort(
    (a, b) => Number(a.replace("device", "")) - Number(b.replace("device", ""))
  );
  matrixNodes = {};
  nodeList.forEach((n) => {
    matrixNodes[n] = true;
  });
  if (Object.keys(matrixNodes).length < 3) {
    window.communicategraph.setMatrixSize(Object.keys(matrixNodes).length * 60);
  } else {
    window.communicategraph.setMatrixSize(0);
  }
  window.communicategraph.renderMatrix(matrixNodes);
  var m = new Matrix();
  m.create(Object.keys(matrixNodes), false, nodeValue);
};

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
