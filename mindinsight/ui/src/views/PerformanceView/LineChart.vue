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
      const series = [];
      let isxAisData = false; //是否有x轴数据
      Object.keys(this.overViewData).forEach((device) => {
        this.option?.legend?.data.push(device);

        const obj = {
          name: device,
          type: "line",
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
      // console.log("series", series);
      this.option.series.push(...series);
      // console.log(this.option);
      this.renderUpdate();
    },
    communicateNodes: function () {
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
          color: "#cecfd1",
          showSymbol: false,
          data: communicationList,
        },
        {
          name: "waiting cost",
          yAxisIndex: 1,
          type: "line",
          stack: "Total",
          color: "#cecfd1",
          showSymbol: false,
          data: waitingList,
          markLine: {
            symbol: "none", //去掉警戒线最后面的箭头
            silent: true, //鼠标悬停事件  true没有，false有
            label: {
              position: "middle", //将警示值放在哪个位置，三个值“start”,"middle","end"  开始  中点 结束
            },
            data: [
              {
                type: "max",
                name: "最大值",
              },
            ],
          },
        },
      ];
      this.option.series.push(...series);
      // console.log(this.option);
      this.renderUpdate();
    },
  },
  mounted() {
    this.renderInit();
    this.renderUpdate();
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
        //   data: [],
        // },
        grid: {
          top: "20%",
          left: "5%",
          right: "10%",
          bottom: "16%",
          containLabel: true,
        },
        xAxis: {
          name: "step",
          type: "category",
          boundaryGap: true,
          axisTick: {
            show: true,
            alignWithLabel: true,
          },
          axisLine: {
            symbol: ["none", "triangle"],
            show: true,
            symbolSize: 10,
            symbolOffset: 5,
          },
          nameTextStyle: {
            fontStyle: "normal",
            fontWeight: "bold",
            fontSize: 16,
          },
          data: [],
        },
        yAxis: [
          {
            type: "value",
            name: "time(ms)",
            axisLine: {
              symbol: ["none", "triangle"],
              show: true,
              symbolSize: 10,
              symbolOffset: 5,
            },
            axisLabel: {
              show: true,
            },
            splitLine: {
              show: false,
            },
            nameTextStyle: {
              fontStyle: "normal",
              fontWeight: "bold",
              fontSize: 16,
              align: "center",
              verticalAlign: "bottom",
            },
          },
          {
            type: "value",
            name: "time(ms)",
            nameTextStyle: {
              fontStyle: "normal",
              fontWeight: "bold",
              fontSize: 16,
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
            moveHandleSize: 1,
            top: "85%",
          },
        ],
        series: [],
      };
      this.option = option;
    },
    renderUpdate() {
      if (!this.option.series || this.option.series.length < 2) return;

      this.lineChart.setOption(this.option);
      this.lineChart.on("click", (params) => {
        console.log("点击step", params);
        this.$emit("getStepNumber", parseInt(params.name, 10));
      });
    },
  },
};
</script>

<style scoped>
#line-chart-container {
  height: 250px;
  width: 100%;
  /* background: rebeccapurple; */
  /* border: 1px solid red; */
}
</style>
