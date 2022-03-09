import * as d3 from "d3";
import { gradientColor } from "@/js/communicate-view/get-gradient-color.js";

export function Graph(w, h) {
  this.w = w;
  this.h = h;
  this.nodes = [];
  this.links = [];
  this.weights = [];
  this.currNodes = [];
  this.currLinks = [];
}
Graph.prototype.create = function (links, nodes) {
  d3.selectAll("#networklayer").remove();
  this.layer = d3.select("#force");
  this.svg = d3.select("#mainsvg");

  this.defs = this.svg.append("defs");
  var arrowMarker = this.defs
    .append("marker")
    .attr("id", "arrow")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "8")
    .attr("markerHeight", "8")
    .attr("viewBox", "0 0 12 12")
    .attr("refX", "13")
    .attr("refY", "6")
    .attr("orient", "auto");
  var arrow_path = "M2,2 L10,6 L2,10 L4,6 L2,2";
  arrowMarker.append("path").attr("d", arrow_path).attr("fill", "#bbb");

  this.nodes = nodes;
  this.links = links;
  //   this.weights = weights;
  var _this = this;

  var min_ratio = 1,
    max_ratio = 0;
  nodes.forEach(function (d) {
    d.time_ratio = d.c_cost / (d.c_cost + d.w_cost);
    min_ratio = Math.min(d.time_ratio, min_ratio);
    max_ratio = Math.max(d.time_ratio, max_ratio);
    _this.currNodes.push(d);
  });
  links.forEach(function (d) {
    _this.currLinks.push(d);
  });
  var network = this.layer.append("g").attr("id", "networklayer");

  var link = network
    .append("g")
    .attr("class", "links")
    .attr("id", "links")
    .selectAll("path")
    .data(links)
    .enter()
    .append("path")
    .style("fill", "none")
    .attr("stroke-width", function (d) {
      return d.weight;
    })
    .attr("marker-end", "url(#arrow)");

  var node = network
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", function (d) {
      return Math.log(d.c_cost + d.w_cost);
    })
    .attr("id", function (d) {
      return d.id;
    })
    .style("fill", function (d) {
      return gradientColor(
        "#fbe7d5",
        "#e6882e",
        min_ratio,
        max_ratio,
        d.time_ratio
      );
      //   return "#bbb";
    })
    .attr("pointer-events", "all")
    .on("mouseover", function (d) {
      //   highlight(d, true);
      d3.select(this).attr("stroke", "red");
    })
    .on("mouseout", function (d) {
      d3.select(this).attr("stroke", "none");
    })
    .call(
      d3
        .drag()
        .on("start", function (d) {
          if (!d3.event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", function (d) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        })
        .on("end", function (d) {
          if (!d3.event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

  var label = network
    .append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("id", function (d) {
      return "l" + d.id;
    })
    .text(function (d) {
      return d.label;
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
          return 80;
        })
    )
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(this.w / 2, this.h / 2))
    .force("x", d3.forceX(this.w * 0.8))
    .force("y", d3.forceY(this.h * 0.8));
  simulation.nodes(nodes).on("tick", ticked);
  simulation.force("link").links(links);
  function ticked() {
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
        return d.x;
      })
      .attr("cy", function (d) {
        return d.y;
      });
  }
};
