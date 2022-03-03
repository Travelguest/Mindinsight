<template>
  <div class="communication-view">
    <div style="width: 100%; height: 10%">Communication View</div>
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
  </div>
</template>

<style>
.communication-view {
  height: 100%;
}
.communication-graph-box {
  position: relative;
  width: 100%;
  height: 90%;
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
</style>
<script>
import {
  device_node,
  communicate_link,
} from "@/js/communicate-view/build-graph.js";
import requestService from "@/services/request-service";
import * as vis from "vis";
import { gradientColor } from "@/js/communicate-view/get-gradient-color.js";
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
    };
  },
  mounted() {
    this.initGraph();
  },
  methods: {
    async initGraph() {
      await this.fetchData();
      this.generateGraph();
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
          dragNodes: false,
          dragView: this.ableToDrag,
          zoomView: this.ableToDrag,
        },
      };
      var network = new vis.Network(container, data, options);
      // this.position = network.canvasToDOM(network.getPositions(1)[1]);
      // console.log(network.getPositions(1)[1]);
      // var canvasPosition = network.getPositions();
      // console.log(canvasPosition);
      // for (i = 0; i <= 3; i++) {
      //   console.log(network.canvasToDOM(network.getPositions(i)[i]));
      // }
      // console.log(network.getBoundingBox(1));
      network.on("click", function (properties) {
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
    // generateCanvas() {
    //   var canvas = document.getElementById("communication-canvas");
    //   var context = canvas.getContext("2d");
    //   context.fillStyle = "#FF0000"; //填充颜色
    //   context.fillRect(0, 0, 10, 100);
    //   console.log(this.position);
    //   context.stroke();
    // },
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
      console.log(this.maskPath);
    },
  },
};
</script>
