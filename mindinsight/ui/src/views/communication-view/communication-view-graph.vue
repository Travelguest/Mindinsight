<template>
  <div class="communication-view">
    <div>Communication View</div>

    <svg
      id="communication-node-graph"
      style="width: 100%; height: 100%"
      @mousedown="handleMouseDown"
    >
      <defs>
        <marker
          id="arrow"
          markerUnits="strokeWidth"
          markerWidth="12"
          markerHeight="12"
          viewBox="0 0 12 12"
          refX="6"
          refY="6"
          orient="auto"
        >
          <path d="M2,2 L10,6 L2,10 L6,6 L2,2" style="fill: #000000" />
        </marker>
      </defs>
      <g>
        <polygon
          v-if="isShowMask"
          :points="maskPath"
          style="fill: grey; fill-opacity=0.1 "
        />
      </g>
      <g ref="communication-graph-container" v-if="showSvgContainer">
        <path
          v-for="edge in linksData"
          :key="edge.index"
          :d="
            createCPath(
              edge.source.x,
              edge.source.y,
              edge.target.x,
              edge.target.y
            )
          "
          stroke="#0f0"
          stroke-width="1.5px"
          fill="none"
          style="marker-end: url(#arrow)"
        ></path>
        <circle
          v-for="node in nodesData"
          :key="node.name"
          :cx="node.x"
          :cy="node.y"
          :r="5"
          fill="red"
          class="communication-graph-circle"
        ></circle>
        <text
          v-for="node in nodesData"
          :key="'text' + node.name"
          :x="node.x"
          :y="node.y"
        >
          {{ node.name }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style>
.communication-graph-box {
  width: 100%;
  height: 80%;
  position: relative;
  overflow: hidden;
  user-select: none;
}
.communication-graph-mask {
  position: absolute;
  background: #409eff;
  opacity: 0.4;
  z-index: 999;
}
.communication-graph-box svg {
  overflow: auto;
}
</style>
<script>
import {
  device_node,
  communicate_link,
} from "@/js/communicate-view/build-graph.js";
import requestService from "@/services/request-service";
import * as d3 from "d3";
export default {
  data() {
    return {
      stepNum: 1,
      communicateNodes: {},
      communicateEdges: {},
      communicateGraphData: {},
      nodesData: {},
      linksData: {},
      showSvgContainer: true,

      isShowMask: true,
      maskPath: "",
      maskPathList: [],
      selectDevice: [],
    };
  },
  mounted() {
    this.initGraph();
  },
  methods: {
    async initGraph() {
      await this.fetchData();
      this.generateGraph();
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
              new_link.source = "device" + node_pair[0];
              new_link.target = "device" + node_pair[1];
              new_link.type = type;
              new_link.value = link_info[link][type][0];
              this.communicateEdges[step_info["step_num"]].push(new_link);
            }
          }
        }
      }
    },

    generateGraph() {
      this.selectDevice = [];
      let svgContainer = document.getElementById("communication-node-graph");
      let width = svgContainer.getBoundingClientRect().width;
      let height = svgContainer.getBoundingClientRect().height;
      // let svg = d3.select("svg");
      let tmpnodesData = this.communicateNodes[this.stepNum];
      let tmplinksData = this.communicateEdges[this.stepNum];

      var simulation = d3
        .forceSimulation(tmpnodesData)
        .force(
          "collide",
          d3
            .forceCollide()
            .radius(() => 30)
            .iterations(2)
        )
        .force("charge", d3.forceManyBody().strength(-200))
        .force(
          "link",
          d3
            .forceLink(tmplinksData)
            .id((d) => d.name)
            .distance(75)
        )
        .force("center", d3.forceCenter(width / 2, height / 2));

      this.nodesData = tmpnodesData;

      this.linksData = tmplinksData;
    },

    createCPath(x1, y1, x2, y2) {
      var dx = x2 - x1, //增量
        dy = y2 - y1,
        dr = Math.sqrt(dx * dx + dy * dy);
      if (dr == 0) {
        x1 = x1 - 1;
        y1 = y1 - 1;
        dr = 20;
      }
      return (
        "M" + x1 + "," + y1 + "A" + dr + "," + dr + " 0 0 1 " + x2 + "," + y2
      );
    },
    updateMask() {
      this.maskPath = this.maskPathList.join(" ");
      // console.log(this.maskPathList);
      this.isShowMask = true;
    },
    handleMouseDown(event) {
      var pointStr = event.offsetX + "," + event.offsetY;
      this.maskPathList.push(pointStr);
      this.updateMask();

      // console.log(event);
      document.body.addEventListener("mousemove", this.handleMouseMove);
      document.body.addEventListener("mouseup", this.handleMouseUp);
    },
    handleMouseMove(event) {
      //   this.end_x = event.clientX;
      //   this.end_y = event.clientY;
    },
    handleMouseUp() {
      this.selectDevice = [];
      for (var i in this.nodesData) {
        // console.log(this.nodesData[i]);
        if (this.checkMaskCollide(this.nodesData[i].x, this.nodesData[i].y)) {
          this.selectDevice.push(this.nodesData[i].name);
        }
      }
      console.log(this.selectDevice);
      //   document.body.removeEventListener("mousemove", this.handleMouseMove);
      //   document.body.removeEventListener("mouseup", this.handleMouseUp);
    },

    checkMaskCollide(x, y) {
      var p1 = { x: x, y: y };
      var p2 = { x: 100000000, y: y };
      var polygon = this.maskPathList;
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
  },
};
</script>
