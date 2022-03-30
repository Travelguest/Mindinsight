<template>
  <div class="line-chart-container">
    <svg style="position: absolute; top: 4%" width="100%" height="15px">
      <rect
        x="10%"
        y="1"
        width="25px"
        height="14px"
        fill-opacity="0.5"
        style="rx: 4px; fill: #a1a1a1"
      ></rect>
      <text x="14%" y="13" style="font-size: 13px; opacity: 0.7">
        Total training time of a device
      </text>
      <rect
        x="33%"
        y="1"
        width="25px"
        height="14px"
        style="rx: 4px; fill: #ceab93"
      ></rect>
      <text x="37%" y="13" style="font-size: 13px; opacity: 0.7">
        Average communication time of devices
      </text>
      <rect
        x="63%"
        y="1"
        width="25px"
        height="14px"
        style="rx: 4px; fill: #ad8b73"
      ></rect>
      <text x="67%" y="13" style="font-size: 13px; opacity: 0.7">
        Average waiting time of devices
      </text>
    </svg>
    <div id="line-chart"></div>
  </div>
</template>

<script>
import * as echarts from "echarts/core";
import * as _ from "lodash";
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
      const chartDom = document.getElementById("line-chart");
      const myChart = echarts.init(chartDom);
      this.lineChart = myChart;
      const option = {
        tooltip: {
          trigger: "axis",
        },
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
            // minInterval: 5000000000,
            // maxInterval: 50000000000,
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
            nameGap: 60,
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

      const handleClickFn = (params) => {
        console.log("点击step", params);
        this.$emit("getStepNumber", parseInt(params.name, 10));
      };
      this.lineChart.on("click", _.debounce(handleClickFn, 150));
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
          name: "Average communication time of devices",
          yAxisIndex: 1,
          type: "line",
          stack: "Total",
          color: "#CEAB93",
          // itemStyle: {
          //   opacity: 0.5,
          // },
          showSymbol: false,
          data: communicationList,
        },
        {
          name: "Average waiting time of devices",
          yAxisIndex: 1,
          type: "line",
          stack: "Total",
          color: "#AD8B73",
          // itemStyle: {
          //   opacity: 0.5,
          // },
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
          itemStyle: {
            opacity: 0.5,
          },
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
.line-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}
#line-chart {
  height: 100%;
  width: 100%;
  /* background: rebeccapurple; */
  /* border: 1px solid red; */
}
</style>
