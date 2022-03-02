export function gradientColor(startColor, endColor, minValue, maxValue, value) {
  var startR = parseInt(startColor.substring(1, 3), 16);
  var startG = parseInt(startColor.substring(3, 5), 16);
  var startB = parseInt(startColor.substring(5), 16);

  var endR = parseInt(endColor.substring(1, 3), 16);
  var endG = parseInt(endColor.substring(3, 5), 16);
  var endB = parseInt(endColor.substring(5), 16);
  //   sR = (endR - startR) / step; //总差值
  //   sG = (endG - startG) / step;
  //   sB = (endB - startB) / step;
  var sR = Math.round(
    ((value - minValue) / (maxValue - minValue)) * (endR - startR) + startR
  );
  var sG = Math.round(
    ((value - minValue) / (maxValue - minValue)) * (endG - startG) + startG
  );
  var sB = Math.round(
    ((value - minValue) / (maxValue - minValue)) * (endB - startB) + startB
  );

  return "#" + sR.toString(16) + sG.toString(16) + sB.toString(16);
}
