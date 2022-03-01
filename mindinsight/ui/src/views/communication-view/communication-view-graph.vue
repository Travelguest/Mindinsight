<template>
  <div class="communication-view">
    <div>Communication View</div>
    <svg id="communication-node-graph" style="width: 100%; height: 80%">
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
        ></circle>
      </g>
    </svg>
  </div>
</template>

<style>
.communication-view circle {
  z-index: 100;
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
        return (
          "M" +
          (x1 - 1) +
          "," +
          (y1 - 1) +
          "A" +
          10 +
          "," +
          10 +
          " 0 1 1 " +
          x2 +
          "," +
          y2
        );
      }
      return (
        "M" + x1 + "," + y1 + "A" + dr + "," + dr + " 0 0 1 " + x2 + "," + y2
      );
    },
  },
};
</script>
