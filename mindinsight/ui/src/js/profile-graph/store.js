import * as d3 from "d3";
export function Store(canvas) {
  this.viewBox = [0, 0, 0, 0];
  this.miniTransform = [0, 0, 1];
  this.miniScale = 1;
  this.miniWidth = 0;
  this.miniHeight = 0;
  this.canvas = canvas;
}
Store.prototype.setMiniScale = function (scale) {
  this.miniScale = scale;
};
Store.prototype.setMiniBox = function (width, height) {
  this.miniWidth = width;
  this.miniHeight = height;
};
Store.prototype.setViewBox = function (viewBox) {
  this.viewBox = viewBox;
};
Store.prototype.setMiniTransform = function (transform) {
  this.miniTransform = transform;
};
Store.prototype.changeViewBox = function (viewBox) {
  this.viewBox = viewBox;
  var frame = d3.select(".minimap>.frame");
  var xtrans = viewBox[0] * this.miniScale;
  var ytrans = viewBox[1] * this.miniScale;
  var s = viewBox[2] / this.miniWidth;
  frame.attr(
    "transform",
    "translate(" + xtrans + " " + ytrans + ")" + "scale(" + s + ")"
  );
  this.miniTransform = [xtrans, ytrans, s];
};
Store.prototype.changeMinimap = function (transform) {
  this.miniTransform = transform;
  var viewBox = [0, 0, 0, 0];
  viewBox[0] = transform[0] / this.miniScale;
  viewBox[1] = transform[1] / this.miniScale;
  viewBox[2] = transform[2] * this.miniWidth;
  viewBox[3] = transform[2] * this.miniHeight;
  this.viewBox = viewBox;
  this.canvas.changeViewBox(this.viewBox, false);
};

Store.prototype.getViewBox = function () {
  return this.viewBox;
};

Store.prototype.getTransform = function () {
  // console.log(this.miniTransform);
  return this.miniTransform;
};
