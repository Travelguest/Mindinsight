import * as d3 from "d3";
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
  this.svg = d3.select("mainsvg");
  this.nodes = nodes;
  this.links = links;
  //   this.weights = weights;
  var _this = this;
  nodes.forEach(function (d) {
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
    .attr("stroke-width", 2);

  var node = network
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", 5)
    .attr("id", function (d) {
      return "n" + d.id;
    })
    .style("fill", "#bbb");

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
          return 60;
        })
    )
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(this.w / 2, this.h / 2))
    .force("x", d3.forceX(this.w * 0.8))
    .force("y", d3.forceY(this.h * 0.8));
  simulation.nodes(nodes).on("tick", ticked);
  simulation.force("link").links(links);
  function ticked() {
    // link
    //   .attr("x1", function (d) {
    //     return d.source.x;
    //   })
    //   .attr("y1", function (d) {
    //     return d.source.y;
    //   })
    //   .attr("x2", function (d) {
    //     return d.target.x;
    //   })
    //   .attr("y2", function (d) {
    //     return d.target.y;
    //   });
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
