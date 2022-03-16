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
      this.renderUpdate();
    },
    overViewData: function () {
      this.renderUpdate();
    },
  },
  mounted() {
    this.renderInit();
  },
  computed: {},
  methods: {
    renderInit() {
      const chartDom = document.getElementById("stacked-column-container");
      const myChart = echarts.init(chartDom);
      this.stackedColumnChart = myChart;

      const option = {
        title: {
          show: true,
          text: "",
          left: "13.5%",
          top: "11%",
          textStyle: {
            fontSize: 12,
            fontStyle: "normal",
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "shadow",
          },
        },
        legend: {},
        grid: {
          top: "21%",
          left: "5%",
          right: "10%",
          bottom: "5%",
          containLabel: true,
        },
        xAxis: {
          name: "Rank ID",
          type: "category",
          boundaryGap: true,
          axisTick: {
            show: true,
            alignWithLabel: true,
          },
          axisLine: {
            symbol: ["none", "arrow"],
            show: true,
          },
          data: [],
        },
        yAxis: {
          type: "value",
          name: "time(ms)",
          axisLine: {
            symbol: ["none", "arrow"],
            show: true,
          },
          axisLabel: {
            show: false,
          },
          splitLine: {
            show: false,
          },
        },
        series: [
          {
            name: "Step Interval",
            type: "bar",
            barWidth: 40,
            stack: "Time",
            emphasis: {
              focus: "series",
            },
            data: [],
          },
          {
            name: "Forward and Backward Propagaion",
            type: "bar",
            stack: "Time",
            emphasis: {
              focus: "series",
            },
            data: [],
          },
          {
            name: "Step Tail",
            type: "bar",
            stack: "Time",
            emphasis: {
              focus: "series",
            },
            data: [],
          },
        ],
      };
      this.option = option;
    },
    renderUpdate() {
      //处理数据
      const [intervalObj, propagaionObj, tailObj] = this.option.series;
      //只展示了step1的
      const curStep = this.stepNumber - 1; //下标从0开始
      this.option.title.text = `Current Step: ${this.stepNumber}`;
      Object.keys(this.overViewData).forEach((device) => {
        if (!this.isxAisData) {
          this.option?.xAxis?.data.push(device.replace("device", ""));
        }
        const curStepInfo = this.overViewData[device][curStep];
        intervalObj.data.push(parseInt(curStepInfo["iteration_interval"], 10));
        propagaionObj.data.push(parseInt(curStepInfo["fp_and_bp"], 10));
        tailObj.data.push(parseInt(curStepInfo["tail"], 10));
      });
      if (!this.isxAisData) {
        this.isxAisData = true;
      }
      this.stackedColumnChart.setOption(this.option);
    },
    clearRender() {
      const [intervalObj, propagaionObj, tailObj] = this.option.series;
      intervalObj.data = [];
      propagaionObj.data = [];
      tailObj.data = [];
    },
  },
};
</script>

<style scoped>
#stacked-column-container {
  height: 200px;
  width: 100%;
  /* background: rebeccapurple; */
  /* border: 1px solid red; */
}
</style>
