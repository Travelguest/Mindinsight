<template>
  <div class="communication-view">
    <div>Communication View</div>
    <div class="communication-graph-box" @mousedown="handleMouseDown">
      <div
        class="communication-graph-mask"
        v-show="is_show_mask"
        :style="
          'width:' +
          mask_width +
          'left:' +
          mask_left +
          'height:' +
          mask_height +
          'top:' +
          mask_top
        "
      ></div>
      <svg id="communication-node-graph" style="width: 100%; height: 100%">
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
      start_x: 0,
      start_y: 0,
      end_x: 0,
      end_y: 0,
      is_show_mask: false,
      box_screen_left: 0,
      box_screen_top: 0,
      selectDevice: [],
    };
  },
  mounted() {
    this.initGraph();
  },

  computed: {
    mask_width() {
      return `${Math.abs(this.end_x - this.start_x)}px;`;
    },
    mask_height() {
      return `${Math.abs(this.end_y - this.start_y)}px;`;
    },
    mask_left() {
      return `${Math.min(this.start_x, this.end_x) - this.box_screen_left}px;`;
    },
    mask_top() {
      return `${Math.min(this.start_y, this.end_y) - this.box_screen_top}px;`;
    },
  },

  methods: {
    async initGraph() {
      await this.fetchData();
      this.generateGraph();
      const dom_box = document.querySelector(".communication-graph-box");
      this.box_screen_left = dom_box.getBoundingClientRect().left;
      this.box_screen_top = dom_box.getBoundingClientRect().top;
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
      console.log(this.nodesData);
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

    handleMouseDown(event) {
      if (event.target.tagName === "SPAN") return false;
      this.is_show_mask = true;
      this.start_x = event.clientX;
      this.start_y = event.clientY;
      this.end_x = event.clientX;
      this.end_y = event.clientY;
      // console.log(this.start_x);
      document.body.addEventListener("mousemove", this.handleMouseMove);
      document.body.addEventListener("mouseup", this.handleMouseUp);
    },
    handleMouseMove(event) {
      this.end_x = event.clientX;
      this.end_y = event.clientY;
    },
    handleMouseUp() {
      document.body.removeEventListener("mousemove", this.handleMouseMove);
      document.body.removeEventListener("mouseup", this.handleMouseUp);
      // console.log(this.end_x);
      this.is_show_mask = false;
      this.handleDeviceSelect();
      this.resSetXY();
    },
    resSetXY() {
      this.start_x = 0;
      this.start_y = 0;
      this.end_x = 0;
      this.end_y = 0;
      this.selectDevice = [];
    },
    handleDeviceSelect() {
      const dom_mask = window.document.querySelector(
        ".communication-graph-mask"
      );
      const rect_select = dom_mask.getClientRects()[0];
      document
        .querySelectorAll(".communication-graph-circle")
        .forEach((node, index) => {
          const rects = node.getClientRects()[0];
          if (this.collide(rects, rect_select) === true) {
            // console.log(this.nodesData[index].name);
            this.selectDevice.push(index);
          }
        });
    },
    collide(rect1, rect2) {
      const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
      const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);
      const minX = Math.min(rect1.x, rect2.x);
      const minY = Math.min(rect1.y, rect2.y);
      if (
        maxX - minX <= rect1.width + rect2.width &&
        maxY - minY <= rect1.height + rect2.height
      ) {
        return true;
      } else {
        return false;
      }
    },
  },
};
</script>
