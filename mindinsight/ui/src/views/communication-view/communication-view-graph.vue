<template>
  <div class="communication-view">
    <div style="width: 100%; height: 5%">Communication View</div>
    <div class="communication-graph-box">
      <i
        class="el-icon-magic-stick"
        id="lassoSelect"
        style="color: grey"
        @click="lassoSelectClick"
      ></i>
      <div
        id="communication-network"
        style="position: absolute; width: 100%; height: 100%"
      ></div>
      <svg
        v-if="!ableToDrag"
        class="communication-canvas"
        id="communication-canvas"
        @mousedown="handleMaskMouseDown"
      >
        <polygon
          v-if="showMask"
          :points="maskPath"
          style="fill: #409eff; opacity: 0.4"
        ></polygon>
      </svg>
    </div>
    <div id="communication-line-chart-container">
      <div id="communication-line-chart"></div>
    </div>
  </div>
</template>

<style>
.communication-view {
  height: 100%;
}
.communication-graph-box {
  position: relative;
  width: 100%;
  height: 65%;
}
.el-icon-magic-stick {
  position: absolute;
  top: 0;
  right: 5%;
  z-index: 999;
}
.communication-canvas {
  position: absolute;
  width: 100%;
  height: 100%;
  /* z-index: -1; */
}
#communication-line-chart-container {
  height: 30%;
  width: 100%;
}
#communication-line-chart {
  height: 100%;
  width: 100%;
}
</style>
<script>
import {
  device_node,
  communicate_link,
} from "@/js/communicate-view/build-graph.js";
import requestService from "@/services/request-service";
import * as vis from "vis";
import { gradientColor } from "@/js/communicate-view/get-gradient-color.js";
import * as echarts from "echarts/core";
export default {
  data() {
    return {
      stepNum: 1,
      communicateNodes: {},
      communicateEdges: {},
      communicateGraphData: {},
      nodesData: {},
      linksData: {},
      ableToDrag: true,
      position: { x: 0, y: 0 },
      maskPath: "",
      maskPointList: [],
      showMask: true,
      network: null,

      linecharOption: null,
      linechart: null,
    };
  },
  mounted() {
    this.initGraph();
  },

  methods: {
    async initGraph() {
      await this.fetchData();
      this.generateGraph();

      this.renderLineChartInit();
      // this.generateCanvas();
    },
    async fetchData() {
      const res = (await requestService.getCommunicationGraph()).data;
      this.communicateGraphData = res;
      for (var device in this.communicateGraphData) {
        // var new_node=Object.create(device_node)
        // console.log(this.communicateGraphData[device]);
        for (var i in this.communicateGraphData[device]) {
          var step_info = this.communicateGraphData[device][i];
          var new_node = Object.create(device_node);
          new_node.name = device;
          new_node.communication_cost = step_info["communication_cost"];
          new_node.wait_cost = step_info["wait_cost"];
          if (!this.communicateNodes.hasOwnProperty(step_info["step_num"])) {
            this.communicateNodes[step_info["step_num"]] = [];
          }
          this.communicateNodes[step_info["step_num"]].push(new_node);
          var link_info = step_info["link_info"];
          if (!this.communicateEdges.hasOwnProperty(step_info["step_num"])) {
            this.communicateEdges[step_info["step_num"]] = [];
          }
          for (var link in link_info) {
            // console.log(link_info[link]);
            for (var type in link_info[link]) {
              var new_link = Object.create(communicate_link);
              var node_pair = link.split("-");
              new_link.source = node_pair[0];
              new_link.target = node_pair[1];
              new_link.type = type;
              new_link.value = link_info[link][type][0];
              this.communicateEdges[step_info["step_num"]].push(new_link);
            }
          }
        }
      }
    },
    generateGraph() {
      // console.log(this.communicateNodes[this.stepNum]);
      var nodeList = [];
      var maxRadio = 0,
        minRadio = 1;
      for (var i = 0; i < this.communicateNodes[this.stepNum].length; i++) {
        var nodeInfo = this.communicateNodes[this.stepNum][i];
        var tmpRatio =
          nodeInfo.communication_cost /
          (nodeInfo.communication_cost + nodeInfo.wait_cost);
        maxRadio = Math.max(maxRadio, tmpRatio);
        minRadio = Math.min(minRadio, tmpRatio);
      }
      for (var i = 0; i < this.communicateNodes[this.stepNum].length; i++) {
        var nodeInfo = this.communicateNodes[this.stepNum][i];
        var tmpRatio =
          nodeInfo.communication_cost /
          (nodeInfo.communication_cost + nodeInfo.wait_cost);
        var newnode = {
          id: parseInt(nodeInfo.name.replace("device", "")),
          name: nodeInfo.name,
          label: nodeInfo.name.replace("device", ""),
          value: Math.log(nodeInfo.communication_cost + nodeInfo.wait_cost),
          borderWidth: 1,
          color: {
            background: gradientColor(
              "#fbe7d5",
              "#e6882e",
              minRadio,
              maxRadio,
              tmpRatio
            ),
            border: "white",
          },
        };
        // newnode.id = nodeInfo.name;
        // newnode.name = parseInt(newnode.name.replace("device", ""));
        nodeList.push(newnode);
      }
      var edgeList = [];
      for (var i = 0; i < this.communicateEdges[this.stepNum].length; i++) {
        var edgeInfo = this.communicateEdges[this.stepNum][i];
        // console.log(edgeInfo);
        var newedge = {
          from: parseInt(edgeInfo.source),
          to: parseInt(edgeInfo.target),
          // arrows: "curve",
          value: 0.5 * Math.log(edgeInfo.value),
          color: { color: "#cecfd1" },
        };
        edgeList.push(newedge);
      }
      var nodes = new vis.DataSet(nodeList);
      var edges = new vis.DataSet(edgeList);
      var container = document.getElementById("communication-network");
      var data = {
        nodes: nodes,
        edges: edges,
      };
      var options = {
        nodes: {
          shape: "dot",
        },
        edges: {
          arrows: {
            to: {
              enabled: true,
              type: "arrow",
            },
          },
          arrowStrikethrough: true,
        },
        autoResize: true,
        height: "100%",
        width: "100%",
        interaction: {
          dragNodes: this.ableToDrag,
          dragView: this.ableToDrag,
          zoomView: this.ableToDrag,
        },
      };
      this.network = new vis.Network(container, data, options);
      // this.position = network.canvasToDOM(network.getPositions(1)[1]);
      // console.log(network.getPositions(1)[1]);
      // var canvasPosition = network.getPositions();
      // console.log(canvasPosition);
      // for (i = 0; i <= 3; i++) {
      //   console.log(network.canvasToDOM(network.getPositions(i)[i]));
      // }
      // console.log(network.getBoundingBox(1));
      this.network.on("click", function (properties) {
        console.log(properties.pointer.DOM);
      });
      // network.on("zoom", function (properties) {
      //   console.log(properties);
      // });
    },
    lassoSelectClick() {
      if (this.ableToDrag) {
        this.ableToDrag = false;
        document.getElementById("lassoSelect").style.color = "red";
        this.maskPath = "";
        this.maskPointList = [];
      } else {
        // this.maskPathList = [];
        // this.updateMask();
        this.ableToDrag = true;
        document.getElementById("lassoSelect").style.color = "gray";
      }
    },

    updateMask() {
      this.maskPath = this.maskPointList.join(" ");
      this.showMask = true;
    },
    handleMaskMouseDown(event) {
      var pointStr = event.offsetX + "," + event.offsetY;
      this.maskPointList.push(pointStr);
      this.updateMask();
      document.body.addEventListener("mouseup", this.handleMaskMouseUp);
    },
    handleMaskMouseUp(event) {
      // console.log(this.maskPath);
      var selectDevice = [];
      var canvasPosition = this.network.getPositions();
      for (var edgeId in canvasPosition) {
        var domPosition = this.network.canvasToDOM(canvasPosition[edgeId]);
        if (this.checkMaskCollide(domPosition.x, domPosition.y)) {
          // console.log(edgeId);
          selectDevice.push(edgeId);
        }
      }
      console.log(selectDevice);
    },

    checkMaskCollide(x, y) {
      var p1 = { x: x, y: y };
      var p2 = { x: 100000000, y: y };
      var polygon = this.maskPointList;
      var count = 0;
      var p3, p4;
      for (var i = 0; i < polygon.length - 1; i++) {
        var point = polygon[i].split(",");
        p3 = { x: point[0], y: point[1] };
        point = polygon[i + 1].split(",");
        p4 = { x: point[0], y: point[1] };
        if (this.checkCross(p1, p2, p3, p4) == true) {
          count++;
        }
      }
      var point = polygon[polygon.length - 1].split(",");
      p3 = {
        x: point[0],
        y: point[1],
      };
      var point = polygon[0].split(",");
      p4 = { x: point[0], y: point[1] };
      if (this.checkCross(p1, p2, p3, p4) == true) {
        count++;
      }
      return count % 2 == 0 ? false : true;
    },
    checkCross(p1, p2, p3, p4) {
      var v1 = { x: p1.x - p3.x, y: p1.y - p3.y },
        v2 = { x: p2.x - p3.x, y: p2.y - p3.y },
        v3 = { x: p4.x - p3.x, y: p4.y - p3.y },
        v = this.crossMul(v1, v3) * this.crossMul(v2, v3);

      v1 = { x: p3.x - p1.x, y: p3.y - p1.y };
      v2 = { x: p4.x - p1.x, y: p4.y - p1.y };

      v3 = { x: p2.x - p1.x, y: p2.y - p1.y };
      return v <= 0 && this.crossMul(v1, v3) * this.crossMul(v2, v3) <= 0
        ? true
        : false;
    },

    //计算向量叉乘
    crossMul(v1, v2) {
      return v1.x * v2.y - v1.y * v2.x;
    },

    renderLineChartInit() {
      const chartDom = document.getElementById("communication-line-chart");
      const myChart = echarts.init(chartDom);
      var stepList = [];
      var communicationList = [],
        waitingList = [];
      for (var i in this.communicateNodes) {
        stepList.push(i);
        var totCommunication = 0,
          totWaiting = 0;
        for (var j in this.communicateNodes[i]) {
          // console.log(this.communicateNodes[i][j]);
          totCommunication += this.communicateNodes[i][j].communication_cost;
          totWaiting += this.communicateNodes[i][j].wait_cost;
        }
        communicationList.push(
          totCommunication / this.communicateNodes[i].length
        );
        waitingList.push(totWaiting / this.communicateNodes[i].length);
      }
      const option = {
        tooltip: {
          trigger: "axis",
          position: function (point, params, dom, rect, size) {
            // 固定在右侧
            return [point[0], "10%"];
          },
          formatter: function (params) {
            console.log(params);
            var res =
              "<h1>step" +
              params[0].axisValue +
              "</h1>" +
              "<div>" +
              params[0].seriesName +
              ": " +
              params[0].data +
              "ms</div>" +
              "<div>" +
              params[1].seriesName +
              ": " +
              params[1].data +
              "ms</div>";
            return res;
          },
        },

        grid: {
          top: "5%",
          left: "10%",
          right: "20%",
          bottom: "5%",
          containLabel: true,
        },

        xAxis: {
          type: "category",
          name: "step",
          boundaryGap: false,
          data: stepList,
          axisLine: {
            symbol: ["none", "arrow"],
            show: true,
            symbolSize: [5, 5],
          },
        },
        yAxis: {
          type: "value",
          name: "time(ms)",
          nameTextStyle: {
            padding: [0, 0, -25, 80],
          },
          axisLine: {
            symbol: ["none", "arrow"],
            show: true,
            symbolSize: [5, 5],
          },
          splitLine: {
            show: false,
          },
          axisLabel: {
            show: false,
          },
        },
        series: [
          {
            name: "communication cost",
            type: "line",
            stack: "Total",
            color: "#cecfd1",
            showSymbol: false,
            data: communicationList,
          },
          {
            name: "waiting cost",
            type: "line",
            stack: "Total",
            color: "#cecfd1",
            showSymbol: false,
            data: waitingList,
          },
        ],
      };
      myChart.setOption(option);
    },
  },
};
</script>
