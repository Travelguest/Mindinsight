<template>
  <div id="stacked-column-container"></div>
</template>

<script>
import * as echarts from "echarts/core";
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
} from "echarts/components";
import { BarChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  BarChart,
  CanvasRenderer,
]);

export default {
  name: "StackedColumnChart",
  props: {
    overViewData: Object,
    stepNumber: Number,
  },
  components: {},
  data() {
    return {
      data: [],
      stackedColumnChart: null,
      option: null,
      isxAisData: false, //是否有x轴数据
    };
  },
  watch: {
    stepNumber() {
      this.clearRender();
      this.overViewDataProcessing();
      this.communicationDataProcessing();
      this.renderUpdate();
    },
    overViewData: function () {
      this.overViewDataProcessing();
      this.renderUpdate();
    },
    communicationData: function () {
      this.communicationDataProcessing();
      this.renderUpdate();
    },
  },
  mounted() {
    this.renderInit();
  },
  computed: {
    communicationData() {
      return this.$store.state.communicationData;
    },
  },
  methods: {
    renderInit() {
      const chartDom = document.getElementById("stacked-column-container");
      const myChart = echarts.init(chartDom);
      this.stackedColumnChart = myChart;

      const option = {
        title: {
          show: true,
          text: "",
          left: "2%",
          top: "2%",
          textStyle: {
            fontSize: 14,
            fontStyle: "normal",
          },
        },
        tooltip: {
          trigger: "axis",
          confine: true,
          axisPointer: {
            type: "shadow",
          },
        },
        legend: {
          top: "2%",
          itemStyle: {
            opacity: 0.5,
          },
        },
        grid: {
          top: "20%",
          left: "5%",
          right: "10%",
          bottom: "20%",
          containLabel: true,
        },
        xAxis: {
          name: "Device ID",
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
          },
          data: [],
        },
        yAxis: [
          {
            type: "value",
            name: "Training time(ms)",
            // minInterval: 300000000,
            // maxInterval: 400000000,
            nameLocation: "middle",
            nameGap: 65,
            min: function (value) {
              return value.min;
            },
            axisLine: {
              symbol: ["none", "triangle"],
              show: true,
              symbolSize: 10,
              symbolOffset: 5,
            },
            axisLabel: {
              show: true,
              showMinLabel: true,
              formatter: function (value) {
                return value.toExponential(2);
              },
            },
            splitLine: {
              show: false,
            },
            nameTextStyle: {
              fontStyle: "normal",
              fontWeight: "bold",
              fontSize: 12,
              align: "middle",
              verticalAlign: "bottom",
            },
          },
          {
            type: "value",
            name: "Communication cost(ms)",
            nameLocation: "middle",
            nameGap: 55,
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
              fontSize: 12,
              align: "middle",
              verticalAlign: "bottom",
            },
          },
        ],
        series: [
          {
            name: "Step Interval",
            type: "bar",
            barWidth: 25,
            stack: "Time",
            color: "#a9d1e5",
            itemStyle: {
              opacity: 0.5,
            },
            emphasis: {
              focus: "series",
            },
            data: [],
          },
          {
            name: "Forward and Backward Propagation",
            type: "bar",
            stack: "Time",
            color: "#74ba62",
            itemStyle: {
              opacity: 0.5,
            },
            emphasis: {
              focus: "series",
            },
            data: [],
          },
          {
            name: "Step Tail",
            type: "bar",
            stack: "Time",
            color: "#e6882e",
            itemStyle: {
              opacity: 0.5,
            },
            emphasis: {
              focus: "series",
            },
            data: [],
          },
          {
            name: "communication cost",
            yAxisIndex: 1,
            type: "line",
            color: "#CEAB93",
            // itemStyle: {
            //   opacity: 0.5,
            // },
            showSymbol: false,
            data: [],
          },
          {
            name: "waiting cost",
            yAxisIndex: 1,
            type: "line",
            color: "#AD8B73",
            // itemStyle: {
            //   opacity: 0.5,
            // },
            showSymbol: false,
            data: [],
          },
        ],
      };
      this.option = option;
    },
    overViewDataProcessing() {
      //处理数据
      const [intervalObj, propagationObj, tailObj] = this.option.series;
      const curStep = this.stepNumber - 1; //下标从0开始
      this.option.title.text = `Current Step: ${this.stepNumber}`;
      Object.keys(this.overViewData).forEach((device) => {
        if (!this.isxAisData) {
          this.option?.xAxis?.data.push(
            parseInt(device.replace("device", ""), 10)
          );
        }
        const curStepInfo = this.overViewData[device][curStep];
        intervalObj.data.push(parseInt(curStepInfo["iteration_interval"], 10));
        propagationObj.data.push(parseInt(curStepInfo["fp_and_bp"], 10));
        tailObj.data.push(parseInt(curStepInfo["tail"], 10));
      });
      if (!this.isxAisData) {
        this.isxAisData = true;
      }
    },
    communicationDataProcessing() {
      const [_1, _2, _3, communicationCost, waitingCost] = this.option.series;
      const curStep = this.stepNumber - 1; //下标从0开始
      Object.keys(this.communicationData).forEach((device) => {
        const curStepInfo = this.communicationData[device][curStep];
        if (!curStepInfo) return;
        communicationCost.data.push(
          parseInt(curStepInfo["communication_cost"], 10)
        );
        waitingCost.data.push(parseInt(curStepInfo["wait_cost"], 10));
      });
    },
    renderUpdate() {
      const [intervalObj, propagationObj, tailObj] = this.option.series;
      if (
        !intervalObj.data.length ||
        !propagationObj.data.length ||
        !tailObj.data.length
      ) {
        return;
      }
      this.stackedColumnChart.setOption(this.option);
    },
    clearRender() {
      const [
        intervalObj,
        propagationObj,
        tailObj,
        communicationCost,
        waitingCost,
      ] = this.option.series;
      intervalObj.data = [];
      propagationObj.data = [];
      tailObj.data = [];
      communicationCost.data = [];
      waitingCost.data = [];
    },
  },
};
</script>

<style scoped>
#stacked-column-container {
  height: 100%;
  width: 100%;
}
</style>
