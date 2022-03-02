<template>
  <div class="communication-view">
    <div>Communication View</div>
    <div class="communication-graph-box">
      <i
        class="el-icon-magic-stick"
        id="lassoSelect"
        @click="lassoSelectClick()"
        style="color: grey"
      ></i>
      <svg
        id="communication-node-graph"
        style="width: 100%; height: 100%"
        @mousedown="handleMouseDown"
      >
        <defs>
          <marker
            id="arrow-SDMA"
            markerUnits="strokeWidth"
            markerWidth="6"
            markerHeight="6"
            viewBox="0 0 12 12"
            refX="6"
            refY="6"
            orient="auto"
          >
            <path d="M2,2 L10,6 L2,10 L4,6 L2,2" style="fill: #a1a1a1" />
          </marker>
          <marker
            id="arrow-SDMA"
            markerUnits="strokeWidth"
            markerWidth="6"
            markerHeight="6"
            viewBox="0 0 12 12"
            refX="6"
            refY="6"
            orient="auto"
          >
            <path d="M2,2 L10,6 L2,10 L4,6 L2,2" style="fill: #cecfd1" />
          </marker>
        </defs>
        <g>
          <polygon
            v-if="isShowMask && isLassoState"
            :points="maskPath"
            style="fill:#409eff; fill-opacity=0.4 "
          />
        </g>
        <g ref="communication-graph-container" v-if="showSvgContainer">
          <circle
            v-for="node in nodesData"
            :key="'big-circle-' + node.name"
            :cx="node.x"
            :cy="node.y"
            :r="node.cr"
            :fill="node.color"
          ></circle>
          <g v-for="edge in linksData" :key="'glink' + edge.index">
            <path
              v-if="edge.type == 'SDMA'"
              :d="createCPath(edge.source, edge.target)"
              :class="'link-' + edge.type"
              :stroke-width="Math.log(edge.communication_duration * 10)"
              @click="linkOnClick(edge.index)"
              stroke="#a1a1a1"
              fill="none"
              style="marker-end: url(#arrow-SDMA)"
            ></path>
            <path
              v-if="edge.type != 'SDMA'"
              :d="createCPath(edge.source, edge.target)"
              :class="'link-' + edge.type"
              :stroke-width="Math.log(edge.communication_duration * 10)"
              @click="linkOnClick(edge.index)"
              stroke="#cecfd1"
              fill="none"
              style="marker-end: url(#arrow-DEFAULT)"
            ></path>
          </g>

          <!-- <circle
            v-for="node in nodesData"
            :key="'small-circle-' + node.name"
            :cx="node.x"
            :cy="node.y"
            :r="Math.log(node.communication_cost)"
            fill="white"
            class="communication-graph-circle"
          ></circle> -->
          <text
            v-for="(node, index) in nodesData"
            :key="'text' + node.name"
            :x="node.x + node.cr"
            :y="node.y + node.cr"
          >
            {{ index }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style>
.communication-graph-box {
  position: relative;
}
.el-icon-magic-stick {
  position: absolute;
  top: 0;
  right: 5%;
}
</style>
<script>
import {
  device_node,
  communicate_link,
} from "@/js/communicate-view/build-graph.js";
import { gradientColor } from "@/js/communicate-view/get-gradient-color.js";
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

      isShowMask: false,
      maskPath: "",
      maskPathList: [],
      selectDevice: [],

      isLassoState: false,

      min_communicate_ratio: 0,
      max_communicate_ratio: 0,
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
              new_link.communication_duration = link_info[link][type][0];
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

      for (var i = 0; i < tmpnodesData.length; i++) {
        var tot_node_cost =
          tmpnodesData[i].communication_cost + tmpnodesData[i].wait_cost;

        tmpnodesData[i].cr = Math.log(10 * tot_node_cost);
        tmpnodesData[i].communicate_ratio =
          tmpnodesData[i].communication_cost / tot_node_cost;
        this.min_communicate_ratio = Math.min(
          this.min_communicate_ratio,
          tmpnodesData[i].communicate_ratio
        );
        this.max_communicate_ratio = Math.max(
          this.max_communicate_ratio,
          tmpnodesData[i].communicate_ratio
        );
      }
      for (var i = 0; i < tmpnodesData.length; i++) {
        tmpnodesData[i].color = gradientColor(
          "#fbe7d5",
          "#e6882e",
          this.min_communicate_ratio,
          this.max_communicate_ratio,
          tmpnodesData[i].communicate_ratio
        );
      }

      this.nodesData = tmpnodesData;
      this.linksData = tmplinksData;
      console.log(this.linksData);
      console.log(this.nodesData);
    },

    createCPath(source, target) {
      // if (source == target) {
      //   console.log("same");
      // }
      var x1 = source.x,
        y1 = source.y,
        x2 = target.x,
        y2 = target.y;
      var r1 = source.cr,
        r2 = target.cr;

      var dx = x2 - x1,
        dy = y2 - y1;
      var dr = Math.sqrt(dx * dx + dy * dy);

      if (source == target) {
        x2 = x2 + r1 * 1.1;
        y1 = y1 - r1 * 1.1;
        dr = 1.5 * r1;
        return (
          "M" + x1 + "," + y1 + "A" + dr + "," + dr + " 0 1 1 " + x2 + "," + y2
        );
      } else {
        return (
          "M" + x1 + "," + y1 + "A" + dr + "," + dr + " 0 0 1 " + x2 + "," + y2
        );
      }
    },
    updateMask() {
      this.maskPath = this.maskPathList.join(" ");
      // console.log(this.maskPathList);
      this.isShowMask = true;
    },
    handleMouseDown(event) {
      if (this.isLassoState) {
        var pointStr = event.offsetX + "," + event.offsetY;
        this.maskPathList.push(pointStr);
        this.updateMask();
        document.body.addEventListener("mousemove", this.handleMouseMove);
        document.body.addEventListener("mouseup", this.handleMouseUp);
      }
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
      // console.log(this.selectDevice);
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

    linkOnClick(edgeIndex) {
      console.log(this.linksData[edgeIndex]);
    },
    lassoSelectClick() {
      if (this.isLassoState) {
        this.isLassoState = false;
        document.getElementById("lassoSelect").style.color = "grey";
      } else {
        this.maskPathList = [];
        this.updateMask();
        this.isLassoState = true;
        document.getElementById("lassoSelect").style.color = "red";
      }
    },
  },
};
</script>
