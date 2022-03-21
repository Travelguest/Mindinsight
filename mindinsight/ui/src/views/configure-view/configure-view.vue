<template>
  <div class="configuration-view-box">
    <div class="scope-search">
      <a-tree-select
        ref="configure-select"
        class="configure-select"
        v-model="selectNamespaces"
        style="width: 90%; z-index: 99; padding: 10px 0; aria-expanded: true"
        :tree-data="showTreeData"
        tree-checkable
        :show-checked-strategy="SHOW_PARENT"
        search-placeholder="Please select"
        :dropdownStyle="{ height: '230px' }"
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
      <div class="dashed-line"></div>
    </div>
    <div class="edge-config">
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
      <div class="config-sub-title">
        <h2>Stage</h2>
      </div>
      <PipelineStageGraph />
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import { getTreeData, levelOrder } from "@/js/profile-graph/build-graph.js";
import { TreeSelect } from "ant-design-vue";
import PipelineStageGraph from "./PiplineStageGraph.vue";
// import RequestService from "@/services/request-service";

const SHOW_PARENT = TreeSelect.SHOW_PARENT;

export default {
  components: {
    PipelineStageGraph,
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
      console.log("showTreedata: ", this.showTreeData);
    },
    initView() {
      this.fetchData();
      console.log(this.$refs["configure-select"]);
    },
    handleTreeChange(value, label) {
      this.$store.commit("setProfileNamespaces", this.selectNamespaces);
    },
  },
};
</script>

<style>
.configuration-view-box {
  position: relative;
  width: 100%;
  /* height: 705px; */
}
.scope-search {
  height: 288px;
  text-align: center;
}
.scope-tree {
  height: 230px;
  width: 90%;
  overflow-y: scroll;
  background: #eee;
  margin: 0 auto;
}
.dashed-line {
  border-bottom: 1px dashed #aaaaaa;
  width: 90%;
  margin: 0 auto;
  padding-top: 5px;
  position: relative;
}
.special-edge-checkbox {
  height: 185px;
}
.edge-config {
  height: 210px;
}
.config-sub-title {
  width: 90%;
  padding-top: 5px;
  text-align: left;
  margin: 0 auto;
}
.config-sub-title h2 {
  margin-bottom: 0;
}

.ant-select-open .ant-select-selection {
  border-color: #fff !important;
}
.ant-select-dropdown {
  /* border-shadow: */
  box-shadow: 0 0 !important;
}
</style>
