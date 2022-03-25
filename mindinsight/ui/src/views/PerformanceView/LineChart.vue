<template>
  <div id="line-chart-container"></div>
</template>

<script>
import * as echarts from "echarts/core";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from "echarts/components";
import { LineChart } from "echarts/charts";
import { UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { DataZoomComponent } from "echarts/components";

// Echarts注册组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
  DataZoomComponent,
]);

export default {
  name: "LineChart",
  props: {
    overViewData: Object,
  },
  components: {},
  data() {
    return {
      data: [],
      lineChart: null,
      option: null,
    };
  },
  watch: {
    overViewData: function () {
      this.overViewDataProcessing();
      this.renderUpdate();
    },
    communicateNodes: function () {
      this.communicateNodesProcessing();
      this.renderUpdate();
    },
  },
  mounted() {
    this.renderInit();
  },
  computed: {
    communicateNodes() {
      return this.$store.state.communicateNodes;
    },
  },
  methods: {
    renderInit() {
      const chartDom = document.getElementById("line-chart-container");
      const myChart = echarts.init(chartDom);
      this.lineChart = myChart;
      const option = {
        tooltip: {
          trigger: "axis",
        },
        // legend: {
        //   formatter: function (name) {
        //     return name.startsWith("device")
        //       ? 'Total training time of a rank"'
        //       : "Average communication and waiting time of ranks";
        //   },
        //   data: [
        //     // {
        //     //   name: "Total training time of a rank",
        //     //   icon: "rect",
        //     //   textStyle: {
        //     //     color: "#A1A1A1",
        //     //   },
        //     // },
        //     // {
        //     //   // name: "Average communication and waiting time of ranks",
        //     //   name: "communication cost",
        //     //   icon: "rect",
        //     //   textStyle: {
        //     //     color: "#E6882F",
        //     //   },
        //     // },
        //   ],
        // },
        grid: {
          top: "20%",
          left: "5%",
          right: "10%",
          bottom: "20%",
          containLabel: true,
        },
        xAxis: {
          name: "Step",
          type: "category",
          boundaryGap: true,
          nameLocation: "middle",
          axisTick: {
            show: true,
            alignWithLabel: true,
          },
          nameGap: 18,
          nameTextStyle: {
            fontStyle: "normal",
            fontWeight: "bold",
            fontSize: 14,
            align: "center",
          },
          data: [],
        },
        yAxis: [
          {
            type: "value",
            name: "Total training time(ms)",
            minInterval: 5000000000,
            maxInterval: 6000000000,
            min: function (value) {
              return value.min - 20;
            },
            axisLine: {
              symbol: ["none", "triangle"],
              show: true,
              symbolSize: 10,
              symbolOffset: 5,
            },
            axisLabel: {
              show: true,
              // showMaxLabel: true,
              showMinLabel: true,
              formatter: function (value) {
                return value.toExponential(2);
              },
            },
            splitLine: {
              show: false,
            },
            nameLocation: "middle",
            nameGap: 65,
            nameTextStyle: {
              fontStyle: "normal",
              fontWeight: "bold",
              fontSize: 12,
            },
          },
          {
            type: "value",
            name: "Communication cost(ms)",
            // minInterval: 1000,
            nameLocation: "middle",
            nameGap: 55,
            nameTextStyle: {
              fontStyle: "normal",
              fontWeight: "bold",
              fontSize: 12,
              align: "center",
              verticalAlign: "bottom",
            },
            axisLine: {
              symbol: ["none", "triangle"],
              show: true,
              symbolSize: 10,
              symbolOffset: 5,
            },
            splitLine: {
              show: false,
            },
            axisLabel: {
              show: true,
            },
          },
        ],
        dataZoom: [
          {
            type: "inside",
            start: 0,
            end: 100,
          },
          {
            type: "slider",
            start: 0,
            end: 100,
            height: 20,
            moveHandleSize: 1,
            top: "86%",
          },
        ],
        series: [],
      };
      this.option = option;
    },
    renderUpdate() {
      if (!this.option.series || this.option.series.length < 3) return;
      this.lineChart.setOption(this.option);
      this.lineChart.on("click", (params) => {
        console.log("点击step", params);
        this.$emit("getStepNumber", parseInt(params.name, 10));
      });
    },
    communicateNodesProcessing() {
      const communicationList = [];
      const waitingList = [];
      for (let i in this.communicateNodes) {
        let totCommunication = 0;
        let totWaiting = 0;
        for (let j in this.communicateNodes[i]) {
          totCommunication += this.communicateNodes[i][j].communication_cost;
          totWaiting += this.communicateNodes[i][j].wait_cost;
        }
        communicationList.push(
          totCommunication / this.communicateNodes[i].length
        );
        waitingList.push(totWaiting / this.communicateNodes[i].length);
      }
      const series = [
        {
          name: "communication cost",
          yAxisIndex: 1,
          type: "line",
          stack: "Total",
          color: "#E6882F",
          showSymbol: false,
          data: communicationList,
        },
        {
          name: "waiting cost",
          yAxisIndex: 1,
          type: "line",
          stack: "Total",
          color: "#E6882F",
          showSymbol: false,
          data: waitingList,
        },
      ];
      this.option.series.push(...series);
    },
    overViewDataProcessing() {
      const series = [];
      let isxAisData = false; //是否有x轴数据
      Object.keys(this.overViewData).forEach((device) => {
        this.option?.legend?.data.push(device);

        const obj = {
          name: device,
          type: "line",
          color: "#A1A1A1",
          data: [],
        };
        for (let i = 0; i < this.overViewData[device].length; i++) {
          const d = this.overViewData[device][i];
          const stepNum = parseInt(d["step_num"], 10);
          if (!isNaN(stepNum)) {
            obj.data.push(parseInt(d.total, 10));
            if (!isxAisData) {
              this.option?.xAxis?.data.push(stepNum);
            }
          }
        }
        isxAisData = true;
        series.push(obj);
      });
      this.option.series.push(...series);
    },
  },
};
</script>

<style scoped>
#line-chart-container {
  height: 100%;
  width: 100%;
  /* background: rebeccapurple; */
  /* border: 1px solid red; */
}
</style>
