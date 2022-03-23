<template>
  <div class="communication-graph-box">
    <div id="networkPlot"></div>
    <!-- <div id="communication-line-chart-container">
      <div id="communication-line-chart"></div>
    </div> -->
  </div>
</template>

<style>
.communication-view {
  height: 100%;
}

#networkPlot {
  position: relative;
  width: 100%;
  height: 100%;
}
.communication-graph-box {
  position: relative;
  width: 100%;
  height: 100%;
}
.el-icon-magic-stick {
  position: absolute;
  top: 0;
  right: 5%;
  z-index: 999;
}
/* #communication-line-chart-container {
  height: 30%;
  width: 100%;
} */
/* #communication-line-chart {
  height: 100%;
  width: 100%;
} */

.lasso path {
  stroke: rgb(80, 80, 80);
  stroke-width: 2px;
}

.lasso .drawn {
  fill-opacity: 0.05;
}

.lasso .loop_close {
  fill: none;
  stroke-dasharray: 4, 4;
}

.lasso .origin {
  fill: #3399ff;
  fill-opacity: 0.5;
}
</style>
<script>
import {
  device_node,
  communicate_link,
} from "@/js/communicate-view/build-graph.js";
import requestService from "@/services/request-service";
import * as vis from "vis";
import * as echarts from "echarts/core";
import * as d3 from "d3";
import { Graph } from "@/js/communicate-view/graph.js";
import { Paths } from "@/js/communicate-view/path.js";
import { Lasso } from "@/js/communicate-view/lasso.js";
export default {
  data() {
    return {
      stepNum: 1,
      communicateNodes: {},
      communicateEdges: {},
      communicateOps: {},
      communicateGraphData: {},

      linecharOption: null,
      linechart: null,
    };
  },
  mounted() {
    this.initGraph();
  },
  watch: {
    "$store.state.stepNum": function (val) {
      this.stepNum = val;
      this.renderNetwork();
    },
    "$store.state.selectCommunicateOpnode": function (val) {
      console.log(val);
      this.recieveOpnode(val[0], val[1]);
    },
  },

  methods: {
    async initGraph() {
      await this.fetchData();
      //发送communicateNodes 给LineChart
      this.$store.commit('setCommunicateNodes',this.communicateNodes);
      this.$store.commit('setCommunicationData',this.communicateGraphData);

      // this.generateGraph();
      this.renderNetwork();
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
          new_node.opNodes = step_info["communication_operator_cost"];
          if (!this.communicateNodes.hasOwnProperty(step_info["step_num"])) {
            this.communicateNodes[step_info["step_num"]] = [];
          }
          this.communicateNodes[step_info["step_num"]].push(new_node);
          var link_info = step_info["link_info"];
          if (!this.communicateEdges.hasOwnProperty(step_info["step_num"])) {
            this.communicateEdges[step_info["step_num"]] = [];
          }
          if (!this.communicateOps.hasOwnProperty(step_info["step_num"])) {
            this.communicateOps[step_info["step_num"]] = {};
          }

          for (var link in link_info) {
            for (var type in link_info[link]) {
              var new_link = Object.create(communicate_link);
              var node_pair = link.split("-");
              new_link.source = node_pair[0];
              new_link.target = node_pair[1];
              new_link.type = type;
              new_link.value = link_info[link][type][0];
              new_link.communication_duration = link_info[link][type][0];
              new_link.traffic = link_info[link][type][1];
              new_link.bandWidth = link_info[link][type][2];
              this.communicateEdges[step_info["step_num"]].push(new_link);
            }
          }

          var op_info = step_info["communication_operator_cost"];

          var step = step_info["step_num"];
          for (var op_name in op_info) {
            // console.log(op_name, op_info[op_name][3]);
            for (var link in op_info[op_name][3]) {
              if (!this.communicateOps[step].hasOwnProperty(link)) {
                this.communicateOps[step][link] = [];
              }
              for (var link_type in op_info[op_name][3][link]) {
                var duration = op_info[op_name][3][link][link_type][0];
                var traffic = op_info[op_name][3][link][link_type][1];
                var bandWidth = op_info[op_name][3][link][link_type][2];
                this.communicateOps[step][link].push({
                  op_name: op_name,
                  duration: duration,
                  traffic: traffic,
                  bandWidth: bandWidth,
                });
              }
            }
          }
        }
      }
      // console.log(this.communicateOps);
    },
    renderNetwork() {
      // network data
      // console.log(this.communicateOps);
      var dataLink = [];
      var dataNode = [];
      this.communicateNodes[this.stepNum].forEach(function (d) {
        dataNode.push({
          id: d.name,
          label: d.name.replace("device", ""),
          c_cost: d.communication_cost,
          w_cost: d.wait_cost,
        });
      });

      // console.log(this.communicateEdges[this.stepNum]);
      this.communicateEdges[this.stepNum].forEach((d) => {
        var op_duration = [],
          op_traffic = [],
          op_bandWidth = [];
        var link_str = d.source + "-" + d.target;
        var op_info = this.communicateOps[this.stepNum][link_str];
        op_info.forEach((i) => {
          op_duration.push(i["duration"]);
          op_traffic.push(i["traffic"]);
          op_bandWidth.push(i["bandWidth"]);
        });
        dataLink.push({
          source: "device" + d.source,
          target: "device" + d.target,
          weight: d.value,
          link_type: d.type,
          communication_duration: d.communication_duration,
          traffic: d.traffic,
          bandWidth: d.bandWidth,
          op_duration: op_duration.sort((a, b) => a - b),
          op_traffic: op_traffic.sort((a, b) => a - b),
          op_bandWidth: op_bandWidth.sort((a, b) => a - b),
        });
      });

      var width = document.getElementById("networkPlot").clientWidth;
      var height = document.getElementById("networkPlot").clientHeight;

      d3.selectAll("#networkPlot>*").remove();
      var svg = d3
        .select("#networkPlot")
        .append("svg")
        .attr("id", "mainsvg")
        .attr("width", width)
        .attr("height", height);

      d3.selectAll("#matrix > *").remove();
      d3.selectAll("#force > *").remove();
      d3.selectAll("#path > *").remove();

      var matrix_layer = svg.append("g").attr("id", "matrix");
      var force_layer = svg.append("g").attr("id", "force");
      var path_layer = svg.append("g").attr("id", "path");

      window.graph = new Graph(width, height);
      window.graph.init(dataLink, dataNode);
    },

    recieveOpnode(type, index) {
      // console.log(type, index);
      // console.log(this.communicateNodes[this.stepNum]);
      var nodeData = [];
      this.communicateNodes[this.stepNum].forEach((device) => {
        // var opNodes = this.communicateNodes[this.stepNum][device];
        // console.log(device.opNodes);
        Object.keys(device.opNodes).forEach((nodeName, i) => {
          var nameList = nodeName.split("_");
          if (
            nameList[0].toLowerCase() == type.toLowerCase() &&
            Number(nameList[1]) == index
          ) {
            // console.log(nodeName, device.opNodes[nodeName]);
            if (device.opNodes[nodeName][3] != {}) {
              Object.keys(device.opNodes[nodeName][3]).forEach((link) => {
                var link_type = Object.keys(
                  device.opNodes[nodeName][3][link]
                )[0];
                var linkList = link.split("-");
                nodeData.push({
                  source: "device" + linkList[0],
                  target: "device" + linkList[1],
                  opValue: device.opNodes[nodeName][3][link][link_type],
                });
              });
            }
          }
        });
      });
      window.graph.showOpNode(nodeData);
    },

    // //折线图
    // renderLineChartInit() {
      
    //   const chartDom = document.getElementById("communication-line-chart");
    //   const myChart = echarts.init(chartDom);
    //   var stepList = [];
    //   var communicationList = [],
    //     waitingList = [];
    //   for (var i in this.communicateNodes) {
    //     stepList.push(i);
    //     var totCommunication = 0,
    //       totWaiting = 0;
    //     for (var j in this.communicateNodes[i]) {
    //       // console.log(this.communicateNodes[i][j]);
    //       totCommunication += this.communicateNodes[i][j].communication_cost;
    //       totWaiting += this.communicateNodes[i][j].wait_cost;
    //     }
    //     communicationList.push(
    //       totCommunication / this.communicateNodes[i].length
    //     );
    //     waitingList.push(totWaiting / this.communicateNodes[i].length);
    //   }
    //   console.log("communicateNodes", this.communicateNodes);
    //   console.log("communicationList", communicationList);
    //   console.log("waitingList", waitingList);

    //   const option = {
    //     tooltip: {
    //       trigger: "axis",
    //       position: function (point, params, dom, rect, size) {
    //         // 固定在右侧
    //         return [point[0], "10%"];
    //       },
    //       formatter: function (params) {
    //         var res =
    //           "<h1>step" +
    //           params[0].axisValue +
    //           "</h1>" +
    //           "<div>" +
    //           params[0].seriesName +
    //           ": " +
    //           params[0].data +
    //           "ms</div>" +
    //           "<div>" +
    //           params[1].seriesName +
    //           ": " +
    //           params[1].data +
    //           "ms</div>";
    //         return res;
    //       },
    //     },

    //     grid: {
    //       top: "5%",
    //       left: "15%",
    //       right: "20%",
    //       bottom: "5%",
    //       containLabel: true,
    //     },

    //     xAxis: {
    //       type: "category",
    //       name: "step",
    //       boundaryGap: false,
    //       data: stepList,
    //       axisLine: {
    //         symbol: ["none", "arrow"],
    //         show: true,
    //         symbolSize: [5, 5],
    //       },
    //     },
    //     yAxis: {
    //       type: "value",
    //       name: "time(ms)",
    //       nameTextStyle: {
    //         padding: [0, 0, -25, 80],
    //       },
    //       axisLine: {
    //         symbol: ["none", "arrow"],
    //         show: true,
    //         symbolSize: [5, 5],
    //       },
    //       splitLine: {
    //         show: false,
    //       },
    //       axisLabel: {
    //         show: false,
    //       },
    //     },
    //     series: [
    //       {
    //         name: "communication cost",
    //         type: "line",
    //         stack: "Total",
    //         color: "#cecfd1",
    //         showSymbol: false,
    //         data: communicationList,
    //       },
    //       {
    //         name: "waiting cost",
    //         type: "line",
    //         stack: "Total",
    //         color: "#cecfd1",
    //         showSymbol: false,
    //         data: waitingList,
    //         markLine: {
    //           symbol: "none", //去掉警戒线最后面的箭头
    //           silent: true, //鼠标悬停事件  true没有，false有
    //           label: {
    //             position: "start", //将警示值放在哪个位置，三个值“start”,"middle","end"  开始  中点 结束
    //           },
    //           data: [
    //             {
    //               type: "max",
    //               name: "最大值",
    //             },
    //           ],
    //         },
    //       },
    //     ],
    //   };
    //   myChart.setOption(option);
    //   myChart.on("click", (param) => {
    //     this.$store.commit("setStepNum", Number(param.name));
    //   });
    // },
  },
};
</script>
