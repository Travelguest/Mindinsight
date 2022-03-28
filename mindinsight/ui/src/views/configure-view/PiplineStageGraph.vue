<template>
  <div class="training-pipeline-container">
    <!-- pipeline stage legend -->
    <div class="training-pipeline-legend">
      <svg width="100%" height="100%" class="legend-wrapper">
        <g class="legend-wrapperInner">
          <rect
            x="0"
            y="0"
            width="10"
            height="10"
            :fill="pipelineReceiveRectColor"
          ></rect>
          <text x="15" y="9" font-size="12">Receive_op</text>
          <rect
            x="100"
            y="0"
            width="10"
            height="10"
            :fill="pipelineSendRectColor"
          ></rect>
          <text x="115" y="9" font-size="12">Send_op</text>
        </g>
      </svg>
    </div>
    <!-- pipeline stage graph -->
    <div class="training-pipeline-graph">
      <!-- <Empty
        v-if="pipelineNodeInfo == null"
        image="{Empty.PRESENTED_IMAGE_SIMPLE}"
      /> -->
      <a-empty v-if="pipelineNodeInfo == null" :image="simpleImage" />
      <svg
        id="training-pipeline-graph-svg"
        v-if="pipelineNodeInfo !== null"
        :width="getPipelineNodePosition(0, pipelineNodeInfo[0].length, 0)[0]"
        height="100%"
      >
        <defs>
          <rect
            id="send"
            :width="pipelineRectWidth"
            :height="pipelineRectWidth"
            :fill="pipelineSendRectColor"
            :style="{ cursor: 'pointer' }"
          ></rect>
          <rect
            id="receive"
            :width="pipelineRectWidth"
            :height="pipelineRectWidth"
            :fill="pipelineReceiveRectColor"
            :style="{ cursor: 'pointer' }"
          ></rect>
        </defs>
        <g id="pipeline_edges_test">
          <path
            v-for="(edge, index) in pipelineEdgeInfo"
            :key="`${index}_pipeline_edge`"
            :d="genPipelinePath(edge)"
            :fill="pipelineArrowColor"
          ></path>
        </g>
        <g id="pipeline_nodes">
          <g
            v-for="(block, blockIndex) in pipelineNodeInfo"
            :key="`${blockIndex}_pipeline_block`"
          >
            <g
              v-if="blockIndex % 2 === 0"
              :transform="`translate(${getPipelineNodePosition(
                1,
                block.length - 1,
                0,
                true
              )
                .map((v, i) => {
                  if (i === 0) return v + 12;
                  if (i === 1) return v - 15;
                  return v;
                })
                .join(',')}), rotate(90), scale(0.05)`"
            >
              <PipelineLink />
            </g>
            <g
              v-for="(col, colIndex) in block"
              :key="`${colIndex}_pipeline_col`"
            >
              <g
                v-if="colIndex % 2 === 1 && colIndex !== block.length - 1"
                :transform="`translate(${getPipelineNodePosition(
                  blockIndex,
                  colIndex,
                  Math.floor(col.length / 2)
                )
                  .map((v, i) => {
                    if (i === 0) return v + 30;
                    if (i === 1) return v - 10;
                  })
                  .join(',')}), scale(0.05)`"
              >
                <PipelineLink />
              </g>
              <g
                v-for="(node, index) in col"
                :key="`${node}_pipeline_node`"
                @click="clickPipelineRect(node, Math.floor((colIndex + 1) / 2))"
                :transform="`translate(${getPipelineNodePosition(
                  blockIndex,
                  colIndex,
                  index
                ).join(',')})`"
              >
                <use
                  :xlink:href="
                    (blockIndex + colIndex) % 2 ? '#receive' : '#send'
                  "
                ></use>
                <text
                  :x="
                    colIndex % 2
                      ? pipelineRectWidth + 2
                      : -pipelineRectWidth - 8
                  "
                  :y="10"
                  font-size="8px"
                >
                  {{ node }}
                </text>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
    <!-- stages checkbox -->
    <div class="checkbox-container">
      <div
        v-for="(stage, index) in showStageIdOptions"
        :key="index"
        :style="generateStageLabel(index)"
      >
        <!-- input 需要加 @click="showRankIdChange" -->
        <!-- <input
        :id="'checkbox-' + stage.value"
        type="checkbox"
        class="custom-checkbox"
        v-model="showStageId[index]"
      /> -->
        <label class="custom-checkbox-label" :for="'checkbox-' + stage.value">
          {{ stage.label }}
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import { buildPipelinedStageInfo, changeShowRankId } from "@/js/build-graph.js";
import PipelineLink from "@/assets/images/svg/link.svg";
import { buildGraph } from "@/js/profile-graph/build-graph.js";
import * as d3 from "d3";
import { Empty } from "ant-design-vue";

export default {
  beforeCreate() {
    this.simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
  },
  components: {
    PipelineLink,
    // Empty,
  },

  data() {
    return {
      pipelineRectWidth: 10,
      pipelineRectMargin: 2,

      pipelineSendRectColor: "#e9a39d",
      pipelineReceiveRectColor: "#8fc6ad",
      pipelineArrowColor: "#e4e4e4",
      pipelinedStageInfo: null,
      pipelineNodeInfo: null,
      pipelineEdgeInfo: null,
      graphData: {},

      showStageId: [],
      showStageIdOptions: [],
    };
  },
  watch: {
    "$store.state.graphData": function (val) {
      this.graphData = val;
      this.fetchData();
    },
    showStageId: function (val) {
      //TODO：切换显示对应的计算图
      console.log(val);
    },
  },

  mounted() {
    // var legend = d3.select(".legend-wrapper");
    // var legendBox = legend.select(".legend-wrapperInner");
    // console.log(legendBox.node().getBBox());
    // console.log(
    //   document.getElementsByClassName("legend-wrapper")[0].getBoundingClientRect
    // );
    this.$nextTick(() => {
      // var legend = d3.select(".legend-wrapper");
      var legendBox = d3.select(".legend-wrapperInner");
      var legend = document
        .getElementsByClassName("legend-wrapper")[0]
        .getBoundingClientRect();
      var boxWidth = legendBox.node().getBBox().width;
      var trans = (legend.width - boxWidth) / 2;
      legendBox.attr("transform", "translate(" + trans + ",0)");
    });
  },
  methods: {
    generateStageLabel(index) {
      if (index == 0) {
        return "position: relative;float:left;margin-right: 10px;";
      } else {
        return "position: relative;float:right;margin-right: 10px;";
      }
    },

    fetchData() {
      const res = this.graphData.graphs;
      // console.log(res);

      const { pipelinedStageInfo, pipelineNodeInfo, pipelineEdgeInfo } =
        buildPipelinedStageInfo(res);
      this.pipelinedStageInfo = pipelinedStageInfo;
      this.pipelineNodeInfo = pipelineNodeInfo;
      this.pipelineEdgeInfo = pipelineEdgeInfo;
      // console.log(pipelinedStageInfo);

      // stage 选择
      this.showStageIdOptions = Object.keys(res).map((key) => {
        const stages = res[key];
        return {
          value: key,
          label: "stage" + key,
          rank_ids: stages.rank_ids.join("-"),
        };
      });
      for (let index = 0; index < this.showStageIdOptions.length; index++) {
        this.showStageId[index] = true;
      }
      // console.log(this.showStageId);
    },

    getPipelineNodePosition(firstIndex, secondIndex, thirdIndex, isLink) {
      if (this.pipelineNodeInfo === null) return;
      const rectWidth = this.pipelineRectWidth;
      const rectMargin = 2 * this.pipelineRectMargin;
      const textWidth = 20;

      // console.log(
      //   "width",
      //   document.getElementsByClassName("training-pipeline-graph")[0]
      //     .clientWidth
      // );

      const nodeBetween = 30;
      const blockBetween = 20;
      const viewMargin = 10;
      const stageBetween =
        document.getElementsByClassName("training-pipeline-graph")[0]
          .clientWidth -
        2 * textWidth -
        2 * rectWidth -
        2 * rectMargin -
        nodeBetween;
      //TODO
      const maxFirstBlockItemCount = this.pipelineNodeInfo[0].reduce(
        (pre, cur) => {
          if (cur.length > pre) return cur.length;
          else return pre;
        },
        0
      );
      let x = 0;
      let y = 0;
      x += textWidth + viewMargin;
      x += Math.floor((secondIndex + 1) / 2) * stageBetween;
      x += Math.floor(secondIndex / 2) * nodeBetween;
      x += secondIndex * rectWidth;
      y += viewMargin;
      if (firstIndex === 1) {
        y += blockBetween + maxFirstBlockItemCount * (rectWidth + rectMargin);
      }
      y += thirdIndex * (rectWidth + rectMargin);
      if (isLink) {
        // x = document.getElementsByClassName("training-pipeline-graph")[0]
        //   .clientWidth;
        // x = stageBetween;
        x =
          document.getElementsByClassName("training-pipeline-graph")[0]
            .clientWidth -
          textWidth -
          rectWidth -
          rectMargin -
          nodeBetween;
      }
      return [x, y];
    },
    genPipelinePath(edge) {
      const [start, end] = edge;
      if (end[1] > start[1]) {
        const startPos = this.getPipelineNodePosition(...start);
        startPos[0] += this.pipelineRectWidth + this.pipelineRectMargin;

        const shiftStartPos = [
          startPos[0],
          startPos[1] + this.pipelineRectWidth,
        ];

        const endPos = this.getPipelineNodePosition(...end);
        endPos[0] -= this.pipelineRectMargin + 4;

        const shiftEndPos = [endPos[0], endPos[1] + this.pipelineRectWidth];

        const controlPointDis = Math.abs(endPos[0] - startPos[0]) / 2;

        const startControlPoint = [startPos[0] + controlPointDis, startPos[1]];
        const endControlPoint = [endPos[0] - controlPointDis, endPos[1]];
        const shiftEndControlPoint = [
          shiftEndPos[0] - controlPointDis,
          shiftEndPos[1],
        ];
        const shiftStartControlPoint = [
          shiftStartPos[0] + controlPointDis,
          shiftStartPos[1],
        ];

        const arrowPointPos = [
          endPos[0] + 4,
          endPos[1] + this.pipelineRectWidth / 2,
        ];
        return `M${startPos.join(" ")} C ${startControlPoint.join(
          " "
        )}, ${endControlPoint.join(" ")}, ${endPos.join(
          " "
        )} L ${arrowPointPos.join(" ")} L ${shiftEndPos.join(
          " "
        )} C ${shiftEndControlPoint.join(" ")}, ${shiftStartControlPoint.join(
          " "
        )}, ${shiftStartPos.join(" ")}`;
      } else {
        const startPos = this.getPipelineNodePosition(...start);
        startPos[0] += -this.pipelineRectMargin;

        const shiftStartPos = [
          startPos[0],
          startPos[1] + this.pipelineRectWidth,
        ];
        const endPos = this.getPipelineNodePosition(...end);
        endPos[0] += this.pipelineRectWidth + this.pipelineRectMargin + 4;
        const shiftEndPos = [endPos[0], endPos[1] + this.pipelineRectWidth];

        const controlPointDis = Math.abs(endPos[0] - startPos[0]) / 2;

        const startControlPoint = [startPos[0] - controlPointDis, startPos[1]];
        const endControlPoint = [endPos[0] + controlPointDis, endPos[1]];
        const shiftEndControlPoint = [
          shiftEndPos[0] + controlPointDis,
          shiftEndPos[1],
        ];
        const shiftStartControlPoint = [
          shiftStartPos[0] - controlPointDis,
          shiftStartPos[1],
        ];
        const arrowPointPos = [
          endPos[0] - 4,
          endPos[1] + this.pipelineRectWidth / 2,
        ];
        return `M${startPos.join(" ")} C ${startControlPoint.join(
          " "
        )}, ${endControlPoint.join(" ")}, ${endPos.join(
          " "
        )} L ${arrowPointPos.join(" ")} L ${shiftEndPos.join(
          " "
        )} C ${shiftEndControlPoint.join(" ")}, ${shiftStartControlPoint.join(
          " "
        )}, ${shiftStartPos.join(" ")}`;
      }
    },
    clickPipelineRect(nodeID, stageID) {
      this.showRankId = stageID + "";
      changeShowRankId(this.showRankId);
      this.getDisplayedGraph(this.showNodeType, this.showRankId);
      setTimeout(() => {
        this.findNode(nodeID);
      }, 200);
    },
  },
};
</script>

<style scoped>
.training-pipeline-container {
  width: 90%;
  height: 100%;
  margin: 0 auto;
}
.training-pipeline-legend {
  height: 12px;
}
/* .custom-checkbox input:checked+label {
    background: #f40;
} */
input[type="checkbox"] {
  width: 12px;
  height: 12px;
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  line-height: 12px;
  position: relative;
}

input[type="checkbox"]::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  background: #fff;
  width: 100%;
  height: 100%;
  border-radius: 2px;
  border: 1px solid #999;
}

input[type="checkbox"]:checked::before {
  content: "\2713";
  background-color: #256eb7;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  border-radius: 2px;
  color: white;
  font-size: 10px;
  border: none;
}
.checkbox-container {
  position: relative;
  overflow: hidden;
  margin-top: -15px;
}
</style>
