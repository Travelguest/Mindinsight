<template>
  <div class="performance-view-container">
    <div class="top">
      <div class="left">
        <StageTree
          :stageDeviceArr="stageDeviceArr"
          :stageDeviceRelationship="stageDeviceRelationship"
          @clickArrowIcon="handleclickArrowIcon"
        />
      </div>
      <div class="right">
        <MareyGraph
          :stepNumber="stepNumber"
          :stageDeviceArr="stageDeviceArr"
          :timeLineData="timeLineData"
          :FLOPsData="FLOPsData"
          :MemoryDataProps="MemoryData"
        />
      </div>
    </div>
    <div class="bottom">
      <div class="left">
        <LineChart
          :overViewData="overViewData"
          @getStepNumber="getStepNumber"
        />
      </div>
      <div class="right">
        <StackedColumnChart
          :overViewData="overViewData"
          :stepNumber="stepNumber"
        />
      </div>
    </div>
  </div>
</template>
<script>
import RequestService from "@/services/request-service";
import LineChart from "./LineChart.vue";
import StackedColumnChart from "./StackedColumnChart.vue";
import MareyGraph from "./NewMareyGraph.vue";
import StageTree from "./StageTree.vue";

export default {
  name: "PerformanceView",
  components: {
    LineChart,
    StackedColumnChart,
    MareyGraph,
    StageTree,
  },
  data() {
    return {
      overViewData: null,
      stepNumber: 1,
      timeLineData: null,
      FLOPsData: null,
      MemoryData: null,
      stageDeviceArr: [],
      isStageExpand: new Map(), //是否展开判断数组
      stageDeviceRelationship: null,
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
          //初始化
          const { stage_data } = data || {};
          Object.keys(stage_data).forEach((stageName) => {
            this.isStageExpand.set(stageName, false); //默认不展开
          });

          this.stageDeviceArrProcessing();
        })
        .catch(console.error);
    },
    stageDeviceArrProcessing() {
      const stageDeviceArr = [];
      const stageDeviceRelationship = {};
      const { stage_data } = this.timeLineData || {};
      Object.keys(stage_data).forEach((stageName) => {
        stageDeviceArr.push(stageName);
        const curStageDevice = stage_data[stageName].devices;
        if (!stageDeviceRelationship[stageName]) {
          stageDeviceRelationship[stageName] = [];
        }
        curStageDevice.forEach((device) => {
          if (this.isStageExpand.get(stageName)) {
            stageDeviceArr.push(device);
            stageDeviceRelationship[stageName].push(device);
          }
        });
      });
      this.stageDeviceArr = stageDeviceArr;
      this.stageDeviceRelationship = stageDeviceRelationship;
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
    handleclickArrowIcon(stage) {
      this.isStageExpand.set(stage, !this.isStageExpand.get(stage));
      this.stageDeviceArrProcessing();
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
