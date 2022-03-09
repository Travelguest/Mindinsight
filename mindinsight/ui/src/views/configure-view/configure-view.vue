<template>
  <div class="configuration-view-box">
    <div class="scope-search">
    <a-tree-select
      class="configure-select"
      v-model="selectNamespaces"
      style="width: 90%; z-index: 99; padding: 10px 0;"
      :tree-data="treeData"
      tree-checkable
      :show-checked-strategy="SHOW_PARENT"
      search-placeholder="Please select"
      :dropdownStyle="{ maxHeight: '300px' }"
      :maxTagCount="Number(1)"
      @change="handleTreeChange"
    />
    <div class="scope-tree"></div>
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
            style="display: block; padding-bottom: 4px;"
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
      SHOW_PARENT,
      showSpecialEdgeTypes: [],
      specialEdgeTypes: [],
      graphData: {},
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
    fetchData() {
      const res = this.graphData;
      if ("graphs" in res) {
        levelOrder(getTreeData());
      }
      this.treeData = getTreeData().children;
      console.log("Treedata: " , this.treeData)
      this.$store.commit("setProfileTreeData", this.treeData);
    },
    initView() {
      this.fetchData();
    },
    handleTreeChange() {
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

</style>
