import * as d3 from "d3";

export function Minimap(store) {
  this.width = 0;
  this.height = 0;
  this.svgWidth = 0;
  this.svgHeight = 0;
  this.heightScale = 0;
  this.widthScale = 0;
  this.lastTransform = { k: 1, x: 0, y: 0 };
  this.transform = [0, 0, 1];
  this.store = store;
}

Minimap.prototype.create = function () {
  var nodes = d3.select(".svgCanvas>.minimap").selectAll("circle");
  var minX = 10000,
    maxX = -10000;

  nodes._groups[0].forEach((d) => {
    minX = Math.min(minX, d.getBBox().x);
    maxX = Math.max(maxX, d.getBBox().x);
  });

  this.svgHeight =
    document.getElementsByClassName("strategy-view")[0].clientHeight -
    document.getElementById("parallel-title").clientHeight;
  this.svgWidth =
    document.getElementsByClassName("profile-graph")[0].clientWidth;
  this.width = this.svgWidth;
  this.height = this.svgHeight * 0.1;
  this.bigWidth = d3
    .select(".wrapperInner")
    .select("#profile-graph")
    .attr("width");
  var bigHeight = d3
    .select(".wrapperInner")
    .select("#profile-graph")
    .attr("height");
  this.store.setMiniBox(this.bigWidth, bigHeight);

  var container = d3.select(".svgCanvas>.minimap");
  container.attr("clip-path", "url(#minimapClipPath)");

  container.attr(
    "transform",
    "translate(0," + (this.svgHeight - this.height) + ")"
  );

  container
    .select(".background")
    .attr("height", this.height)
    .attr("width", this.width)
    .style("fill", "#ffffff")
    .style("stroke", "gray");
  var box = container.select("#graph-container").node().getBBox();
  this.widthScale = this.width / (maxX - minX);
  this.store.setMiniScale(this.width / (maxX - minX));
  this.heightScale = this.height / box.height;
  container
    .select("#graph-container")
    .attr(
      "transform",
      "scale(" +
        this.widthScale +
        ")" +
        "translate(" +
        -box.x +
        "," +
        -box.y +
        ")"
    );
  // d3.select(".svgCanvas>defs")
  //   .append("clipPath")
  //   .attr("id", "minimap-clipPath");
  this.generateFrame();
};

Minimap.prototype.generateFrame = function () {
  var frame = d3.select(".minimap>.frame");
  var window = frame.select(".background");

  window
    .attr("width", this.width)
    .attr("height", this.svgHeight * 0.9)
    .style("stroke", "#111111")
    .style("fill-opacity", "0.1")
    .style("fill", "#000000")
    .style("fill", "url(#minimapGradient)")
    .style("filter", "url(#minimapDropShadow)")
    .style("cursor", "move")
    .attr("transform", "scale(" + this.widthScale + ")");
  frame.attr("transform", "translate(" + 0 + "," + 0 + ")scale(1)");

  var frameEl = document.getElementsByClassName("frame")[0];
  var minimapEl = document.getElementById("minimap-background");
  minimapEl.onwheel = (e) => {
    this.transform = this.store.getTransform();
    let delta = e.wheelDelta && (e.wheelDelta > 0 ? 1 : -1);
    if (delta > 0) {
      this.transform[2] = this.transform[2] * 1.1;
    } else if (delta < 0) {
      this.transform[2] = this.transform[2] / 1.1;
    }
    frame.attr(
      "transform",
      "translate(" +
        [this.transform[0], this.transform[1]].join(" ") +
        ")" +
        "scale(" +
        this.transform[2] +
        ")"
    );
    this.store.changeMinimap(this.transform);
  };
  frameEl.onwheel = (e) => {
    this.transform = this.store.getTransform();
    let delta = e.wheelDelta && (e.wheelDelta > 0 ? 1 : -1);
    if (delta > 0) {
      this.transform[2] = this.transform[2] * 1.1;
    } else if (delta < 0) {
      this.transform[2] = this.transform[2] / 1.1;
    }
    frame.attr(
      "transform",
      "translate(" +
        [this.transform[0], this.transform[1]].join(" ") +
        ")" +
        "scale(" +
        this.transform[2] +
        ")"
    );
    this.store.changeMinimap(this.transform);
  };
  var offsetX, offsetY;
  var dragging = false;
  frameEl.onmousedown = (e) => {
    dragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
  };
  frameEl.onmouseup = (e) => {
    if (dragging) {
      this.transform = this.store.getTransform();
      this.transform[0] = this.transform[0] + (e.offsetX - offsetX);
      this.transform[1] = this.transform[1] + (e.offsetY - offsetY);

      frame.attr(
        "transform",
        "translate(" +
          [this.transform[0], this.transform[1]].join(" ") +
          ")" +
          "scale(" +
          this.transform[2] +
          ")"
      );
      this.store.changeMinimap(this.transform);
      dragging = false;
    }
  };
  frameEl.onmouseleave = (e) => {
    if (dragging) {
      this.transform = this.store.getTransform();
      this.transform[0] = this.transform[0] + (e.offsetX - offsetX);
      this.transform[1] = this.transform[1] + (e.offsetY - offsetY);

      frame.attr(
        "transform",
        "translate(" +
          [this.transform[0], this.transform[1]].join(" ") +
          ")" +
          "scale(" +
          this.transform[2] +
          ")"
      );
      this.store.changeMinimap(this.transform);
      dragging = false;
    }
  };
  frameEl.onmousemove = (e) => {
    if (dragging) {
      var tmpT = [0, 0, this.transform[2]];
      tmpT[0] = this.transform[0] + (e.offsetX - offsetX);
      tmpT[1] = this.transform[1] + (e.offsetY - offsetY);

      frame.attr(
        "transform",
        "translate(" +
          [tmpT[0], tmpT[1]].join(" ") +
          ")" +
          "scale(" +
          tmpT[2] +
          ")"
      );
    }
  };
  // minimapEl.onmousemove = (e) => {
  //   if (dragging) {
  //     var tmpT = [0, 0, this.transform[2]];
  //     tmpT[0] = this.transform[0] + (e.offsetX - offsetX);
  //     tmpT[1] = this.transform[1] + (e.offsetY - offsetY);

  //     frame.attr(
  //       "transform",
  //       "translate(" +
  //         [tmpT[0], tmpT[1]].join(" ") +
  //         ")" +
  //         "scale(" +
  //         tmpT[2] +
  //         ")"
  //     );
  //   }
  // };
  // minimapEl.onmouseup = (e) => {
  //   // console.log("mouseup");
  //   if (dragging) {
  //     // console.log(this.transform);
  //     this.transform = this.store.getTransform();
  //     this.transform[0] = this.transform[0] + (e.offsetX - offsetX);
  //     this.transform[1] = this.transform[1] + (e.offsetY - offsetY);

  //     frame.attr(
  //       "transform",
  //       "translate(" +
  //         [this.transform[0], this.transform[1]].join(" ") +
  //         ")" +
  //         "scale(" +
  //         this.transform[2] +
  //         ")"
  //     );
  //     this.store.changeMinimap(this.transform);
  //     dragging = false;
  //   }
  // };
  // minimapEl.onmousemove = (e) => {
  //   if (dragging) {
  //     // this.transform = this.store.getTransform();
  //     this.transform[0] =
  //       this.transform[0] + (e.offsetX - offsetX) * this.widthScale;
  //     this.transform[1] =
  //       this.transform[1] + (e.offsetY - offsetY) * this.widthScale;

  //     frame.attr(
  //       "transform",
  //       "translate(" +
  //         [this.transform[0], this.transform[1]].join(" ") +
  //         ")" +
  //         "scale(" +
  //         this.transform[2] +
  //         ")"
  //     );
  //   }
  // };
  // frame.call(
  //   d3.zoom().on("zoom", () => {
  //     let transform = d3.event.transform;
  //     this.translate[0] =
  //       this.translate[0] -
  //       (this.lastTransform.x - transform.x) * this.widthScale;
  //     this.translate[1] =
  //       this.translate[1] -
  //       (this.lastTransform.y - transform.y) * this.widthScale;
  //     this.scale = (this.scale / this.lastTransform.k) * transform.k;
  //     frame.attr(
  //       "transform",
  //       "translate(" +
  //         this.translate.join(" ") +
  //         ")" +
  //         "scale(" +
  //         this.scale +
  //         ")"
  //     );
  // this.lastTransform = transform;
  // })
  // );
};

// Minimap.prototype.update = function () {
//   var viewBox = this.store.getViewBox();
//   var frame = d3.select(".minimap>.frame");
//   var xtrans = viewBox[0] * this.widthScale;
//   var ytrans = viewBox[1] * this.widthScale;
//   var s = viewBox[2] / this.bigWidth;
//   frame.attr(
//     "transform",
//     "translate(" + xtrans + " " + ytrans + ")" + "scale(" + s + ")"
//   );
// };
