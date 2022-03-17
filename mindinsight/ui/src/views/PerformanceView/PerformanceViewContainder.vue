<template>
  <div class="performance-view-container">
    <div class="top">
      <div class="left"></div>
      <div class="right">
        <MareyGraph
          :stepNumber="stepNumber"
          :timeLineData="timeLineData"
          :FLOPsData="FLOPsData"
          :MemoryDataProps="MemoryData"
        />
      </div>
    </div>
    <div class="bottom">
      <div class="left">
        <!-- <LineChart
          :overViewData="overViewData"
          @getStepNumber="getStepNumber"
        /> -->
      </div>
      <div class="right">
        <!-- <StackedColumnChart
          :overViewData="overViewData"
          :stepNumber="stepNumber"
        /> -->
      </div>
    </div>
  </div>
</template>
<script>
import RequestService from "@/services/request-service";
import LineChart from "./LineChart.vue";
import StackedColumnChart from "./StackedColumnChart.vue";
import MareyGraph from "./NewMareyGraph.vue";

export default {
  name: "PerformanceView",
  components: {
    LineChart,
    StackedColumnChart,
    MareyGraph,
  },
  data() {
    return {
      overViewData: null,
      stepNumber: 1,
      timeLineData: null,
      FLOPsData: null,
      MemoryData: null,
    };
  },
  mounted() {
    this.getOverviewTimeData();
    this.getTimeLineData();
    this.getFLOPsData();
    this.getMemoryData();
  },
  methods: {
    getOverviewTimeData() {
      RequestService.getOverviewTime()
        .then(({ data }) => {
          this.overViewData = data;
        })
        .catch((err) => {
          console.error(err);
        });
    },
    getStepNumber(stepNumber) {
      // console.log("获取step", stepNumber);
      this.stepNumber = stepNumber;
      this.getTimeLineData();
    },
    getTimeLineData() {
      RequestService.getTimeLineData(this.stepNumber)
        .then(({ data }) => {
          this.timeLineData = data;
        })
        .catch(console.error);
    },
    getFLOPsData() {
      RequestService.getFLOPsData()
        .then(({ data }) => {
          this.FLOPsData = data;
        })
        .catch(console.error);
    },
    getMemoryData() {
      RequestService.getMemoryData()
        .then(({ data }) => {
          this.MemoryData = data;
        })
        .catch(console.error);
    },
  },
};
</script>
<style scoped>
.performance-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.performance-view-container .top {
  flex-grow: 1;
  display: flex;
  flex-direction: row;
}
.performance-view-container .top .left {
  flex-basis: 200px;
}
.performance-view-container .top .right {
  flex: 1;
}
.performance-view-container .bottom {
  margin-bottom: 45px;
  display: flex;
  flex-direction: row;
}
.performance-view-container .bottom .left {
  flex: 1;
}
.performance-view-container .bottom .right {
  flex: 1;
}
</style>
