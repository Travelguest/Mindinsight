<template>
  <div class="configuration-view-box">
    <div class="data-selection">
      <span class="title">Data selection: </span>
      <a-select
        default-value="5_resnet_pipeline_4p"
        style="width: 60%"
        @change="handleDataSwitch"
      >
        <a-select-option value="1_bert_16p_0115"
          >1_bert_16p_0115</a-select-option
        >
        <a-select-option value="2_pangu">2_pangu</a-select-option>
        <a-select-option value="3_pipline_16p_0115"
          >3_pipline_16p_0115</a-select-option
        >
        <a-select-option value="4_googlenet_8p_0121"
          >4_googlenet_8p_0121</a-select-option
        >
        <a-select-option value="5_resnet_pipeline_4p"
          >5_resnet_pipeline_4p</a-select-option
        >
        <a-select-option value="pangu_16p_0115">pangu_16p_0115</a-select-option>
      </a-select>
    </div>
    <div class="scope-search">
      <a-tree-select
        ref="configure-select"
        class="configure-select"
        v-model="selectNamespaces"
        style="width: 90%; padding-top: 10px; aria-expanded: true"
        :tree-data="showTreeData"
        tree-checkable
        :show-checked-strategy="SHOW_PARENT"
        search-placeholder="Please select"
        :dropdownStyle="{ height: '150px' }"
        :maxTagCount="Number(1)"
        :treeDefaultExpandedKeys="expandedKeys"
        dropdownMatchSelectWidth
        open
        @change="handleTreeChange"
      >
        <template slot="title" slot-scope="item">
          <span>
            <svg
              viewBox="0 0 15 10"
              width="15"
              height="10"
              v-if="selectNamespaces.includes(item.key)"
            >
              <rect
                x="0"
                y="0"
                width="15"
                height="10"
                rx="3"
                ry="3"
                :fill="haloColorScale(item.key)"
              ></rect>
            </svg>
            {{ item.titleText }}
          </span>
        </template>
      </a-tree-select>
      <!-- <div class="scope-tree"></div> -->
      <!-- <div class="dashed-line"></div> -->
    </div>
    <div class="edge-config">
      <svg style="position: absolute; top: 0" width="100%" height="1px">
        <line
          x1="0"
          y1="0"
          x2="90%"
          y2="0"
          stroke="#ccc"
          stroke-width="1"
          stroke-dasharray="4"
          stroke-dashoffset="22"
        ></line>
      </svg>
      <div class="config-sub-title">
        <h2>Hidden Edge</h2>
      </div>
      <div class="special-edge-checkbox dashed-line">
        <el-checkbox-group v-model="showSpecialEdgeTypes">
          <el-checkbox
            v-for="(specialEdgeType, index) in specialEdgeTypes"
            :key="index"
            :label="specialEdgeType"
            style="display: block; padding-bottom: 4px"
          >
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
    <div class="stage-panel">
      <svg style="position: absolute; top: 0" width="100%" height="1px">
        <line
          x1="0"
          y1="0"
          x2="90%"
          y2="0"
          stroke="#ccc"
          stroke-width="1"
          stroke-dasharray="4"
          stroke-dashoffset="22"
        ></line>
      </svg>
      <div class="stage-panel-sub-title">
        <h2>Stage</h2>
      </div>
      <PipelineStageGraph />
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import { getTreeData, levelOrder } from "@/js/profile-graph/build-graph.js";
import { TreeSelect, Select, Icon } from "ant-design-vue";
import PipelineStageGraph from "./PiplineStageGraph.vue";
// import RequestService from "@/services/request-service";

const SHOW_PARENT = TreeSelect.SHOW_PARENT;

export default {
  components: {
    PipelineStageGraph,
    "a-icon": Icon,
    "a-select": Select,
    "a-select-option": Select.Option,
  },

  data() {
    return {
      selectNamespaces: [],
      treeData: [],
      showTreeData: [],
      SHOW_PARENT,
      showSpecialEdgeTypes: [],
      specialEdgeTypes: [],
      graphData: {},
      expandedKeys: [],
    };
  },

  mounted() {
    // this.initView();
  },

  watch: {
    "$store.state.profileSpecialEdgeTypes": function (val) {
      this.specialEdgeTypes = val;
    },
    showSpecialEdgeTypes(newVal, oldVal) {
      this.$store.commit("setProfileShowSpecialEdgeTypes", [oldVal, newVal]);
    },
    "$store.state.graphData": function (val) {
      this.graphData = val;
      this.initView();
    },
  },

  methods: {
    // async fetchData() {
    //   const res = (await RequestService.getGraphs()).data;
    //   if ("graphs" in res) {
    //     levelOrder(getTreeData());
    //   }
    //   this.treeData = getTreeData().children;
    //   this.$store.commit("setProfileTreeData", this.treeData);
    // },
    haloColorScale: d3.scaleOrdinal(d3.schemeAccent),
    modifyTreeData(node) {
      if (!node) return;
      const newChildren = [];
      for (const child of node.children) {
        if (child.children.length !== 0) {
          newChildren.push(child);
        }
      }
      node.children = newChildren;
      for (const child of node.children) {
        child.scopedSlots = { title: "title" };
        child.titleText = child.title;
        child.title = null;
        this.expandedKeys.push(child.key);
        this.modifyTreeData(child);
      }
    },
    fetchData() {
      const res = this.graphData;
      if ("graphs" in res) {
        levelOrder(getTreeData());
      }
      this.treeData = getTreeData().children;
      this.$store.commit("setProfileTreeData", this.treeData);
      this.showTreeData = JSON.parse(JSON.stringify(this.treeData));
      for (const child of this.showTreeData) {
        child.scopedSlots = { title: "title" };
        child.titleText = child.title;
        child.title = null;
        this.expandedKeys.push(child.key);
        this.modifyTreeData(child);
      }
      // console.log("showTreedata: ", this.showTreeData);
    },
    initView() {
      this.fetchData();
      // console.log(this.$refs["configure-select"]);
    },
    handleTreeChange(value, label) {
      this.$store.commit("setProfileNamespaces", this.selectNamespaces);
    },
    handleDataSwitch(value) {
      console.log("切换数据到", value);
    },
  },
};
</script>

<style>
.configuration-view-box {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.data-selection {
  padding-top: 10px;
  margin-left: 32px;
}
.data-selection .title {
  font-weight: 500;
  font-size: 16px;
  margin-right: 10px;
}
.scope-search {
  position: relative;
  height: 200px;
  margin-bottom: 10px;
  text-align: center;
}
.scope-tree {
  height: 230px;
  width: 90%;
  overflow-y: scroll;
  background: #eee;
  margin: 0 auto;
}
/* .dashed-line {
  border-bottom: 1px dashed #aaaaaa;
  width: 90%;
  margin: 0 auto;
  padding-top: 5px;
  position: relative;
} */
.special-edge-checkbox {
  height: 185px;
}
.edge-config {
  position: relative;
  margin-left: 32px;
  padding-top: 10px;
  height: 210px;
  flex-grow: 1;
}
.config-sub-title {
  width: 90%;
  text-align: left;
}
.stage-panel-sub-title {
  width: 100%;
  margin-left: 32px;
  text-align: left;
}
.stage-panel {
  position: relative;
  padding-top: 10px;
  height: 210px;
  flex-grow: 1;
}
h2 {
  margin-bottom: 3px;
}
.ant-select-open .ant-select-selection {
  border-color: #fff !important;
}
.ant-select-dropdown {
  /* border-shadow: */
  box-shadow: 0 0 !important;
}
</style>
