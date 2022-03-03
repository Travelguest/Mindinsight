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

// Echarts注册组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
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
      this.option.series = series;
      // console.log(this.option);
      this.renderUpdate();
    },
  },
  mounted() {
    this.renderInit();
    this.renderUpdate();
  },
  computed: {},
  methods: {
    renderInit() {
      const chartDom = document.getElementById("line-chart-container");
      const myChart = echarts.init(chartDom);
      this.lineChart = myChart;
      const option = {
        tooltip: {
          trigger: "axis",
        },
        legend: {
          data: [],
        },
        grid: {
          top: "21%",
          left: "5%",
          right: "10%",
          bottom: "5%",
          containLabel: true,
        },
        xAxis: {
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
          min:5000000,
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
        series: null,
      };
      this.option = option;
    },
    renderUpdate() {
      this.option.series && this.lineChart.setOption(this.option);
    },
  },
};
</script>

<style scoped>
#line-chart-container {
  height: 150px;
  width: 600px;
  /* background: rebeccapurple; */
  /* border: 1px solid red; */
}
</style>
