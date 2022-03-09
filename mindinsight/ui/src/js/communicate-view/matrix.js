export function Matrix(id, x, y) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.locallayer = d3
    .select("#matrix")
    .append("g")
    .attr("id", "mat" + this.id);
}

Matrix.prototype.type = "matrix";
Matrix.prototype.unitsize = 10;
Matrix.prototype.fontsize = 10;
