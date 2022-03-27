<template>
  <div class="performance-view-container">
    <div class="top">
      <div class="left">
        <div class="title">Performance View</div>
        <communication-view-graph />
      </div>
      <div class="right">
        <svg style="position: absolute" width="1px" height="100%">
          <line
            x1="0"
            y1="2%"
            x2="0"
            y2="98%"
            stroke="#ccc"
            stroke-width="1"
            stroke-dasharray="4"
            stroke-dashoffset="22"
          ></line>
        </svg>
        <div class="legend">
          <LegendPerformance />
        </div>
        <div class="view">
          <div class="stage-tree">
            <StageTree
              :stageDeviceArr="stageDeviceArr"
              :stageDeviceRelationship="stageDeviceRelationship"
              :FLOPsData="FLOPsData"
              :deviceToStage="deviceToStage"
              @clickArrowIcon="handleClickArrowIcon"
            />
          </div>
          <div class="marey-graph">
            <MareyGraph
              :stepNumber="stepNumber"
              :stageDeviceArr="stageDeviceArr"
              :timeLineData="timeLineData"
              :FLOPsData="FLOPsData"
              :MemoryDataProps="MemoryData"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="bottom">
      <svg style="position: absolute; top = 0" width="100%" height="1px">
        <line
          x1="2%"
          y1="0"
          x2="98%"
          y2="0"
          stroke="#ccc"
          stroke-width="1"
          stroke-dasharray="4"
          stroke-dashoffset="22"
        ></line>
      </svg>
      <div class="left">
        <LineChart
          :overViewData="overViewData"
          @getStepNumber="getStepNumber"
        />
      </div>
      <div class="right">
        <svg style="position: absolute" width="1px" height="250px">
          <line
            x1="0"
            y1="5%"
            x2="0"
            y2="95%"
            stroke="#ccc"
            stroke-width="1"
            stroke-dasharray="4"
            stroke-dashoffset="22"
          ></line>
        </svg>
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
import CommunicationViewGraph from "../communication-view/communication-view-graph.vue";
import LegendPerformance from "../PerformanceView/LegendPerformance.vue";

export default {
  name: "PerformanceView",
  components: {
    LineChart,
    StackedColumnChart,
    MareyGraph,
    StageTree,
    CommunicationViewGraph,
    LegendPerformance,
  },
  computed: {
    stepNumber() {
      return this.$store.state.stepNum;
    },
  },
  data() {
    return {
      overViewData: null,
      timeLineData: null,
      FLOPsData: null,
      MemoryData: null,
      stageDeviceArr: [],
      isStageExpand: new Map(), //是否展开判断数组
      stageDeviceRelationship: null,
      deviceToStage: null, //device - stage的映射
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
      this.$store.commit("setStepNum", stepNumber);
      this.getTimeLineData();
    },
    getTimeLineData() {
      RequestService.getTimeLineData(this.stepNumber)
        .then(({ data }) => {
          //1. 初始化
          const { stage_data, maps } = data || {};
          const stages = Object.keys(stage_data);
          stages.forEach((stageName) => {
            this.isStageExpand.set(stageName, false); //默认不展开
          });
          //2.数据对齐
          for (let i = 1; i < stages.length; i++) {
            const preDevice = stage_data[stages[i - 1]].devices[0];
            const curDevice = stage_data[stages[i]].devices[0];
            const preDeviceOpName = Object.keys(maps[preDevice]);
            const curDeviceOpName = Object.keys(maps[curDevice]);
            let sendOp;
            let receiveOp;
            for (let j = 0; j < preDeviceOpName.length; j++) {
              if (preDeviceOpName[j].startsWith("Send")) {
                sendOp = preDeviceOpName[j];
                break;
              }
            }
            for (let j = 0; j < curDeviceOpName.length; j++) {
              if (curDeviceOpName[j].startsWith("Receive")) {
                receiveOp = curDeviceOpName[j];
                break;
              }
            }
            const startOffset = Math.abs(
              maps[preDevice][sendOp].st - maps[curDevice][receiveOp].st
            );
            const endOffset = Math.abs(
              maps[preDevice][sendOp].ed - maps[curDevice][receiveOp].ed
            );
            // console.log("找到啦", sendOp, receiveOp, startOffset, endOffset);
            // device偏移
            stage_data[stages[i]].devices.forEach((device) => {
              Object.keys(maps[device]).forEach((op) => {
                const opInfo = maps[device][op];
                opInfo.st += startOffset;
                opInfo.ed += endOffset;
              });
            });
            // stage偏移
            Object.keys(stage_data[stages[i]].data).forEach((op) => {
              const opInfo = stage_data[stages[i]].data[op];
              opInfo.ed_avg += endOffset;
              opInfo.ed_max += endOffset;
              opInfo.ed_min += endOffset;
              opInfo.st_avg += startOffset;
              opInfo.st_max += startOffset;
              opInfo.st_min += startOffset;
            });
          }
          //3.处理dur太小的问题
          Object.keys(maps).forEach((device) => {
            Object.keys(maps[device]).forEach((op) => {
              const opInfo = maps[device][op];
              if (opInfo.dur <= 0.1) {
                opInfo.ed += 1;
              }
            });
          });

          this.timeLineData = data;
          this.stageDeviceArrProcessing();
        })
        .catch(console.error);
    },
    stageDeviceArrProcessing() {
      const stageDeviceArr = [];
      const stageDeviceRelationship = {};
      const deviceToStage = new Map();
      const { stage_data } = this.timeLineData || {};
      Object.keys(stage_data).forEach((stageName) => {
        stageDeviceArr.push(stageName);
        const curStageDevice = stage_data[stageName].devices;
        if (!stageDeviceRelationship[stageName]) {
          stageDeviceRelationship[stageName] = [];
        }
        //排序
        curStageDevice.sort((a, b) => {
          const [num1] = a.match(/\d+/g);
          const [num2] = b.match(/\d+/g);
          return parseInt(num1, 10) - parseInt(num2, 10);
        });
        curStageDevice.forEach((device) => {
          deviceToStage.set(device, stageName);
          if (this.isStageExpand.get(stageName)) {
            stageDeviceArr.push(device);
            stageDeviceRelationship[stageName].push(device);
          }
        });
      });
      this.stageDeviceArr = stageDeviceArr;
      this.stageDeviceRelationship = stageDeviceRelationship;
      this.deviceToStage = deviceToStage;
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
    handleClickArrowIcon(stage) {
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
  border-top: 1px solid #ccc;
}
.performance-view-container .top {
  flex-grow: 1;
  display: flex;
  flex-direction: row;
}
.performance-view-container .top .left {
  width: 20%;
}
.performance-view-container .top .right {
  flex-grow: 1;
  position: relative;
  display: flex;
  flex-direction: column;
}
.performance-view-container .top .right .legend {
  width: 100%;
}
.performance-view-container .top .right .view {
  flex-grow: 1;
  display: flex;
  flex-direction: row;
}
.performance-view-container .top .right .view .stage-tree {
  flex-basis: 250px;
}
.performance-view-container .top .right .view .marey-graph {
  flex: 1;
}
.performance-view-container .bottom {
  height: 200px;
  display: flex;
  flex-direction: row;
}
.performance-view-container .bottom .left {
  flex: 1;
}
.performance-view-container .bottom .right {
  flex: 1;
  overflow: hidden;
}
.title {
  font-size: 16px;
  font-weight: 500;
  margin-left: 32px;
}
</style>
