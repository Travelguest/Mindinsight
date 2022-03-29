<template>
  <div class="attribute-panel-container" id="attribute-collapse">
    <LeeCollapse v-model="expname" @change="handleChange">
      <LeeCollapseItem title="Special operator statiatics" name="1">
        <div class="graph-strategy-info">
          <div class="second-title" style="font-size: 10px">
            {{ this.$t("profiling.hasStrategy") }}:
            <span style="font-weight: normal">{{
              specialNodesMap["hasStrategy"]
                ? specialNodesMap["hasStrategy"]
                : 0
            }}</span>
          </div>
          <div class="second-title" style="font-size: 10px">
            {{ this.$t("profiling.redistribution") }}:
            <span style="font-weight: normal">{{
              specialNodesMap["Redistribution"]
                ? specialNodesMap["Redistribution"]
                : 0
            }}</span>
          </div>
          <div class="second-title" style="font-size: 10px">
            {{ this.$t("profiling.gradientAggregate") }}:
            <span style="font-weight: normal">{{
              specialNodesMap["GradientAggregation"]
                ? specialNodesMap["GradientAggregation"]
                : 0
            }}</span>
          </div>
        </div>
      </LeeCollapseItem>
      <LeeCollapseItem title="Node attributes" name="2">
        <div class="attribute-tooltip" v-if="selectedNode !== null">
          <div
            class="second-title"
            v-html="`Node ID: ${selectedNode.id}`"
          ></div>
          <div class="attribute-tooltip-content">
            <div class="col">
              <div class="left second-title">type:</div>
              <div class="right" v-html="selectedNode.type"></div>
            </div>
            <div class="col">
              <div class="left second-title">scope:</div>
              <div class="right">
                <div
                  v-for="(scope, index) in selectedNode.scope.split('/')"
                  :key="scope + index"
                  v-html="`${scope}/`"
                  style="word-break: break-all"
                ></div>
              </div>
            </div>
            <div class="col">
              <div class="left second-title">inputs:</div>
              <div class="right">
                <div
                  v-for="input in selectedNode.input"
                  :key="input"
                  v-html="
                    `${input} - ${
                      !isNaN(input) ? nodeMaps[nodeGroupIndex][input].type : ''
                    }`
                  "
                ></div>
              </div>
            </div>
            <div class="col">
              <div class="left second-title">output:</div>
              <div class="right">
                <div
                  v-for="output in selectedNode.output"
                  :key="output"
                  v-html="
                    `${output} - ${
                      !isNaN(output)
                        ? nodeMaps[nodeGroupIndex][output].type
                        : ''
                    }`
                  "
                ></div>
              </div>
            </div>
          </div>
        </div>
      </LeeCollapseItem>
    </LeeCollapse>
  </div>
</template>

<style>
.attribute-panel-container {
  position: fixed;
  top: 50px;
  right: 10px;
  width: 300px;
  background: #fafafa;
}
#attribute-collapse .lee-collapse-item .itemtab {
  background: #ececec;
  padding: 0 10px;
  height: 30px;
  border-radius: 4px;
}
#attribute-collapse .lee-collapse-item .itemcontent {
  padding-bottom: 10px;
}
#attribute-collapse .lee-collapse-item .itemcontentw {
  padding: 0 10px;
  border: none;
  max-height: 290px;
  overflow-y: scroll;
}
#attribute-collapse .lee-collapse-item:first-child .itemcontentw {
  max-height: 100px;
}
#attribute-collapse .lee-collapse {
  border-radius: 4px;
}
#attribute-collapse .lee-collapse-item {
  border-bottom: 1px solid #fff;
}
.second-title {
  height: 24px;
  line-height: 24px;
  font-size: 14px;
  font-weight: 600;
  -ms-flex-negative: 0;
  flex-shrink: 0;
}
.graph-strategy-info {
  padding-top: 5px;
}
</style>

<script>
import { LeeCollapse, LeeCollapseItem } from "leevueplugin";
import { getSpecialNodesMap } from "@/js/profile-graph/build-graph.js";

export default {
  components: {
    LeeCollapse,
    LeeCollapseItem,
  },
  data() {
    return {
      expname: ["1"],
      selectedNode: null,
      nodeMaps: [],
      nodeGroupIndex: "",
      specialNodesMap: {},
    };
  },
  watch: {
    "$store.state.selectedGraphNode": function (val) {
      this.selectedNode = val;
      this.nodeGroupIndex = Math.floor((this.selectedNode.y + 200) / 500);
      this.expname = ["1", "2"];
      // console.log(this.selectedNode)
      // console.log(getSpecialNodesMap())
    },
    "$store.state.nodeMaps": function (val) {
      this.nodeMaps = val;
      this.specialNodesMap = getSpecialNodesMap();
    },
  },
  methods: {
    handleChange(val) {
      // console.log(val);
    },
    getSpecialNodesMap() {
      return getSpecialNodesMap();
    },
  },
};
</script>
