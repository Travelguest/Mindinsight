<template>
  <div class="communication-view">
    <div>Communication View</div>
    <svg id="communication-node-graph" style="width: 100%; height: 80%">
      <defs></defs>
      <g ref="communication-graph-container" v-if="showSvgContainer">
        <circle
          v-for="node in nodesData"
          :key="node.name"
          :cx="node.x"
          :cy="node.y"
          :r="2"
        ></circle>
        <!-- <line
          v-for="edge in linksData"
          :key="edge.index"
          :x1="edge.source.x"
          :y1="edge.source.y"
          :x2="edge.target.x"
          :y2="edge.target.y"
          style="stroke-width: 1; stroke: grey"
        ></line> -->
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
        ></path>
      </g>
    </svg>
  </div>
</template>

<style></style>
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

      let simulation = d3.forceSimulation().nodes(tmpnodesData);
      simulation
        .force("charge_force", d3.forceManyBody())
        .force("center_force", d3.forceCenter(width / 2, height / 2));

      let linkForce = d3.forceLink(tmplinksData).id((d) => {
        return d.name;
      });

      simulation.force("links", linkForce);

      this.nodesData = tmpnodesData;

      this.linksData = tmplinksData;
    },

    createCPath(x1, y1, x2, y2) {
      var path = "M" + x1 + " " + y1 + " ";
      // var rx = 20;
      // var ry = 5;
      // var c = "A" + rx + "," + ry + " 1 0,1";
      // path = path + c + x2 + " " + y2;
      // console.log(path);
      // return path;
      var angle = 30;
      var PI = Math.PI;
      var xAngle = Math.atan2(y2 - y1, x2 - x1);
      xAngle = (360 * xAngle) / (2 * PI);
      var L = Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
      var L2 = L / 2 / Math.cos((angle * 2 * PI) / 360);
      var x0 =
        x1 + Math.round(L2 * Math.cos(((xAngle + angle) * 2 * PI) / 360));
      var y0 =
        y1 + Math.round(L2 * Math.sin(((xAngle + angle) * 2 * PI) / 360));
      path = path + "Q" + x0 + " " + y0 + " " + x2 + " " + y2;
      return path;
    },
  },
};
</script>
