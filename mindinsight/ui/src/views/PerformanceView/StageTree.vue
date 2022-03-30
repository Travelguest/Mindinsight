<template>
  <div ref="container" class="stage-tree-container">
    <div
      class="tooltip"
      v-show="hoveredNodeInfo.show"
      :style="{
        transform: `translate3d(${hoveredNodeInfo.x}px, ${hoveredNodeInfo.y}px, 0px)`,
      }"
    >
      <div>{{ hoveredNodeInfo.name }}</div>
      <div v-if="hoveredNodeInfo.type === 'Abnormal'">
        <div
          v-for="(text, index) in hoveredNodeInfo.abnomalContent"
          :key="`${text}-${index}`"
        >
          {{ index + 1 }}:{{ text }}
        </div>
      </div>
      <div v-else-if="hoveredNodeInfo.type === 'FLOP'">
        <div>
          {{ hoveredNodeInfo.valueName }} : {{ hoveredNodeInfo.initValue }}
        </div>
        <div>radio: {{ hoveredNodeInfo.radio }}</div>
      </div>
      <div v-else-if="hoveredNodeInfo.type === 'Memory'">
        <div>peakMem: {{ hoveredNodeInfo.peakMem }}</div>
        <div>capacity: {{ hoveredNodeInfo.capacity }}</div>
        <div>radio: {{ hoveredNodeInfo.radio }}</div>
      </div>
    </div>
    <svg
      v-for="stage in stageName"
      :key="stage"
      :transform="`translate(${margin.left + 2 * offset}, ${
        margin.top - 9 + yScale(stage)
      })`"
      class="icon icon-arrow-container"
      aria-hidden="true"
      @click="handleClick(stage)"
    >
      <use
        class="icon-arrow"
        :xlink:href="getArrowIcon(stage)"
        font-size="20"
        fill="#ccc"
      ></use>
    </svg>
    <svg
      id="stage-tree"
      :viewbox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
    >
      <g
        id="stage-tree-group"
        :transform="`translate(${margin.left}, ${margin.top})`"
      >
        <g class="close-circle-group">
          <g
            v-for="data in closeCircleData"
            :key="`${data.y}-close-circle`"
            class="close-circle"
            @mousemove="onNodeMouseover($event, data, 'Abnormal')"
            @mouseout="onNodeMouseout"
          >
            <circle
              cx="0"
              :cy="yScale(data.y)"
              r="7.5"
              stroke="#cb6056"
              fill="transparent"
              stroke-width="2"
            />
            <line
              x1="-3.25"
              :y1="yScale(data.y) - 3.25"
              x2="3.25"
              :y2="yScale(data.y) + 3.25"
              stroke="#cb6056"
              fill="transparent"
              stroke-width="2"
            />
            <line
              x1="-3.25"
              :y1="yScale(data.y) + 3.25"
              x2="3.25"
              :y2="yScale(data.y) - 3.25"
              stroke="#cb6056"
              fill="transparent"
              stroke-width="2"
            />
          </g>
        </g>
        <!-- tree-line -->
        <g class="tree-line-name">
          <path
            v-for="(d, i) in treeLineData"
            :key="`Tree-Line-${d.father}-${i}`"
            :d="d.d"
            stroke="#ccc"
          ></path>
        </g>
        <!-- stage device name -->
        <g class="stage-device-name">
          <text
            v-for="name in stageDeviceArr"
            :key="name"
            :transform="`translate(${27 + 2 * offset}, ${yScale(name)})`"
            dominant-baseline="middle"
          >
            {{ name }}
          </text>
        </g>
        <g class="FLOP-name">
          <text
            v-for="name in xAxisArr"
            :key="name"
            :x="xScale(name) - 13"
            :y="-10"
            :transform="`rotate(-25, ${xScale(name) - 13}, -10)`"
          >
            {{ name }}
          </text>
        </g>
        <g class="FLOP-map">
          <rect
            v-for="data in FLOPMapData"
            :key="`${data.y}-${data.x}`"
            :x="xScale(data.x) - offset"
            :y="yScale(data.y) - offset"
            :width="offset * 2"
            :height="offset * 2"
            :fill="colorScale(data.value + 0.2)"
            @mousemove="onNodeMouseover($event, data, 'FLOP')"
            @mouseout="onNodeMouseout"
          ></rect>
          <rect
            v-for="data in MemoryMapData"
            :key="`${data.y}-${data.x}`"
            :x="xScale(data.x) - offset"
            :y="yScale(data.y) - offset"
            :width="offset * 2"
            :height="offset * 2"
            :fill="colorScale(data.value + 0.2)"
            @mousemove="onNodeMouseover($event, data, 'Memory')"
            @mouseout="onNodeMouseout"
          ></rect>
        </g>
      </g>
    </svg>
  </div>
</template>

<script>
import * as d3 from "d3";

export default {
  name: "StageTree",
  props: {
    stageDeviceArr: Array,
    stageDeviceRelationship: Object,
    FLOPsData: Object,
    deviceToStage: Map,
    MemoryData: Object,
    closeCircleProps: Array,
  },
  watch: {
    stageDeviceArr: function (newVal, oldVal) {
      if (oldVal.length) {
        this.height += (newVal.length - oldVal.length) * 20;
      }
    },
    stageDeviceRelationship: function () {
      this.treeLineProcessing();
      this.FLOPMapData = null;
      this.closeCircleData = null;
      this.MemoryMapData = null;
      this.closeCirclePropsProcessing();
      requestIdleCallback(this.FLOPMapDataProcessing);
      requestIdleCallback(this.MemoryDataProcessing);
    },
  },
  data() {
    return {
      svg: null,
      g: null,
      margin: { top: 50, right: 10, bottom: 10, left: 30 },
      width: 200,
      height: 200,
      offset: 8,

      treeLineData: null,
      FLOPMapData: null,
      MemoryMapData: null,
      stageName: null,
      closeCircleData: null,
      nameToCloseCirclePropsMap: null, // name - props
      xAxisArr: ["FLOPs", "FLOPS", "PeakMem"],

      hoveredNodeInfo: {
        show: false,
        x: 0,
        y: 0,
        name: "",
        type: "",
        abnomalContent: null,
      },
    };
  },
  computed: {
    innerHeight() {
      return this.height - this.margin.top - this.margin.bottom;
    },
    innerWidth() {
      return this.width - this.margin.left - this.margin.right;
    },
    xScale() {
      return d3.scaleBand().domain(this.xAxisArr).range([115, this.innerWidth]);
    },
    yScale() {
      return d3
        .scaleBand()
        .domain(this.stageDeviceArr)
        .range([0, this.innerHeight]);
    },
    colorScale() {
      return d3
        .scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateGreys);
    },
  },
  mounted() {
    const { width, height } = this.$refs.container.getBoundingClientRect();

    this.width = Math.floor(width);
    this.height = Math.floor(height);
  },
  methods: {
    getArrowIcon(stage) {
      return this.stageDeviceRelationship &&
        this.stageDeviceRelationship[stage]?.length > 0
        ? "#icon-arrow_down_fat"
        : "#icon-arrow_right_fat";
    },
    handleClick(stage) {
      this.$emit("clickArrowIcon", stage);
    },
    MemoryDataProcessing() {
      if (
        !this.deviceToStage ||
        !this.stageDeviceRelationship ||
        !this.MemoryData
      )
        return;
      const MemoryMapData = [];
      const stageData = {};
      const stageName = Object.keys(this.stageDeviceRelationship);

      stageName.forEach((stage) => {
        stageData[stage] = {
          sumPeakMem: 0,
          sumCapacity: 0,
          averageValue: 0,
          cnt: 0,
        };
      });
      const deviceName = Object.keys(this.MemoryData);
      deviceName.forEach((device) => {
        const { capacity, peak_mem } = this.MemoryData[device].summary || {};
        //1.先统计stage
        const stage = this.deviceToStage.get(device);
        stageData[stage].averageValue += peak_mem / capacity;
        stageData[stage].sumPeakMem += peak_mem;
        stageData[stage].sumCapacity += capacity;
        stageData[stage].cnt++;
        if (this.stageDeviceRelationship[stage].length > 0) {
          MemoryMapData.push({
            x: "PeakMem",
            y: device,
            peakMem: peak_mem,
            capacity,
            value: peak_mem / capacity,
          });
        }
      });
      //2.加入stage
      stageName.forEach((stage) => {
        const { averageValue, cnt, sumPeakMem, sumCapacity } =
          stageData[stage] || {};
        MemoryMapData.push({
          x: "PeakMem",
          y: stage,
          peakMem: sumPeakMem / cnt,
          capacity: sumCapacity / cnt,
          value: averageValue / cnt,
        });
      });
      this.MemoryMapData = MemoryMapData;
    },
    FLOPMapDataProcessing() {
      if (
        !this.deviceToStage ||
        !this.stageDeviceRelationship ||
        !this.FLOPsData
      )
        return;
      const FLOPMapData = [];
      const stageData = {};
      const stageName = Object.keys(this.stageDeviceRelationship);
      const closeCircleData = [];
      stageName.forEach((stage) => {
        stageData[stage] = {
          sumFLOPS: 0,
          sumFLOPs: 0,
          cnt: 0,
          isAnomaly: false,
          abnomalContent: [],
        };
      });
      let maxFLOPS = -Infinity;
      let maxFLOPs = -Infinity;
      const deviceName = Object.keys(this.FLOPsData);
      deviceName.forEach((device) => {
        const { FLOPS, FLOPs, abnomalContent, isAnomaly } =
          this.FLOPsData[device].summary || {};
        //1.先统计stage
        const stage = this.deviceToStage.get(device);
        stageData[stage].sumFLOPS += FLOPS;
        stageData[stage].sumFLOPs += FLOPs;
        stageData[stage].cnt++;
        stageData[stage].isAnomaly = isAnomaly || false;
        stageData[stage]["abnomalContent"].push(...abnomalContent);

        maxFLOPS = Math.max(maxFLOPS, FLOPS);
        maxFLOPs = Math.max(maxFLOPs, FLOPs);
      });
      deviceName.forEach((device) => {
        const { FLOPS, FLOPs, abnomalContent, isAnomaly } =
          this.FLOPsData[device].summary || {};
        const stage = this.deviceToStage.get(device);
        //2.统计device - 展开才统计
        if (this.stageDeviceRelationship[stage].length > 0) {
          FLOPMapData.push({
            x: "FLOPS",
            y: device,
            value: FLOPS / maxFLOPS,
            initValue: FLOPs,
            isAnomaly,
            abnomalContent,
          });
          FLOPMapData.push({
            x: "FLOPs",
            y: device,
            value: FLOPs / maxFLOPs,
            initValue: FLOPs,
            isAnomaly,
            abnomalContent,
          });
          if (isAnomaly) {
            let arr;
            if (
              this.nameToCloseCirclePropsMap &&
              this.nameToCloseCirclePropsMap.has(device)
            ) {
              arr = this.nameToCloseCirclePropsMap.get(device);
            }
            const closeCircle = {
              y: device,
              isAnomaly,
              abnomalContent: arr ? abnomalContent.concat(arr) : abnomalContent,
            };
            closeCircleData.push(closeCircle);
          }
        }
      });
      //3.加入stage
      stageName.forEach((stage) => {
        const { sumFLOPS, sumFLOPs, cnt, isAnomaly, abnomalContent } =
          stageData[stage] || {};
        FLOPMapData.push({
          x: "FLOPS",
          y: stage,
          value: sumFLOPS / cnt / maxFLOPS,
          initValue: sumFLOPS / cnt,
          isAnomaly,
          abnomalContent,
        });
        FLOPMapData.push({
          x: "FLOPs",
          y: stage,
          value: sumFLOPs / cnt / maxFLOPs,
          initValue: sumFLOPs / cnt,
          isAnomaly,
          abnomalContent,
        });
        if (isAnomaly) {
          let arr;
          if (
            this.nameToCloseCirclePropsMap &&
            this.nameToCloseCirclePropsMap.has(stage)
          ) {
            arr = this.nameToCloseCirclePropsMap.get(stage);
          }
          const closeCircle = {
            y: stage,
            isAnomaly,
            abnomalContent: arr ? abnomalContent.concat(arr) : abnomalContent,
          };
          closeCircleData.push(closeCircle);
        }
      });
      this.FLOPMapData = FLOPMapData;
      this.closeCircleData = closeCircleData;
    },
    treeLineProcessing() {
      if (!this.stageDeviceRelationship) return;
      const treeLineData = [];
      const stageName = Object.keys(this.stageDeviceRelationship);
      this.stageName = stageName;
      stageName.forEach((stage) => {
        const childArr = this.stageDeviceRelationship[stage];

        if (childArr.length > 0) {
          const d1 = `M${3 * this.offset},${this.yScale(stage)}V${this.yScale(
            childArr[childArr.length - 1]
          )}Z`;
          treeLineData.push({ father: stage, d: d1 });

          for (let i = 0; i < childArr.length; i++) {
            const device = childArr[i];

            const d = `M${3 * this.offset},${this.yScale(device)}H38Z`;
            treeLineData.push({ father: stage, d });
          }
        }
      });
      this.treeLineData = treeLineData;
    },
    closeCirclePropsProcessing() {
      if (!this.deviceToStage || !this.closeCircleProps) return;
      const nameToCloseCirclePropsMap = new Map();
      this.closeCircleProps.forEach((item) => {
        const { device, abnormalContent } = item;
        const stage = this.deviceToStage.get(device);
        if (!nameToCloseCirclePropsMap.has(stage)) {
          nameToCloseCirclePropsMap.set(stage, []);
        }
        nameToCloseCirclePropsMap.get(stage).push(...abnormalContent);
        const arr = abnormalContent.filter(
          (str) =>
            !(str.startsWith("Intra-stage") || str.startsWith("Inter-stage"))
        );
        nameToCloseCirclePropsMap.set(device, arr);
      });
      this.nameToCloseCirclePropsMap = nameToCloseCirclePropsMap;
    },
    onNodeMouseover(e, data, type) {
      const { layerX, layerY } = e || {};
      if (type === "Abnormal") {
        const { y: name, abnomalContent } = data;
        this.hoveredNodeInfo = {
          show: true,
          x: layerX + 15,
          y: layerY - 55,
          type,
          name,
          abnomalContent,
        };
      } else if (type === "FLOP") {
        const { initValue, value, y: name, x: valueName } = data;
        this.hoveredNodeInfo = {
          show: true,
          x: layerX + 15,
          y: layerY - 55,
          type,
          name,
          radio: value,
          valueName,
          initValue,
        };
      } else if (type === "Memory") {
        const { peakMem, capacity, value, y: name, x: valueName } = data;
        this.hoveredNodeInfo = {
          show: true,
          x: layerX + 15,
          y: layerY - 55,
          name,
          type,
          peakMem,
          capacity,
          radio: value,
          valueName,
        };
      }
    },
    onNodeMouseout() {
      this.hoveredNodeInfo.show = false;
    },
  },
};
</script>

<style scoped>
.stage-tree-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.icon-arrow-container {
  width: 16px;
  height: 16px;
  position: absolute;
}
/* .close-circle-group .close-circle .text {
  display: none;
}
.close-circle-group .close-circle:hover .text {
  display: block;
} */

.tooltip {
  position: absolute;
  top: 0px;
  left: 0px;
  padding: 10px;
  opacity: 0.8;
  width: fit-content;
  height: fit-content;
  background-color: rgba(0, 0, 0, 1);
  border: 1px solid #fff;
  border-radius: 4px;
  pointer-events: none;
  z-index: 99;
  font: 14px / 21px sans-serif;
  color: #fff;
  white-space: nowrap;
}
</style>
