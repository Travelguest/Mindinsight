<template>
  <div class="configuration-view">
    <div>configuration View</div>
    <a-tree-select
      class="configure-select"
      v-model="selectNamespaces"
      style="width: 200px; z-index: 99"
      :tree-data="treeData"
      tree-checkable
      :show-checked-strategy="SHOW_PARENT"
      search-placeholder="Please select"
      :dropdownStyle="{ maxHeight: '300px' }"
      :maxTagCount="Number(1)"
      @change="handleTreeChange"
    />
    <div>
      <div>Hidden Edge</div>
      <div class="special-edge-checkbox">
        <el-checkbox-group v-model="showSpecialEdgeTypes">
          <el-checkbox
            v-for="(specialEdgeType, index) in specialEdgeTypes"
            :key="index"
            :label="specialEdgeType"
            style="display: block"
          >
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
  </div>
</template>

<script>
import { getTreeData, levelOrder } from "@/js/profile-graph/build-graph.js";
import { TreeSelect } from "ant-design-vue";
import RequestService from "@/services/request-service";

const SHOW_PARENT = TreeSelect.SHOW_PARENT;

export default {
  data() {
    return {
      selectNamespaces: [],
      treeData: [],
      SHOW_PARENT,
      showSpecialEdgeTypes: [],
      specialEdgeTypes: [],
    };
  },

  mounted() {
    this.initView();
  },

  watch: {
    "$store.state.profileSpecialEdgeTypes": function (val) {
      this.specialEdgeTypes = val;
    },
    showSpecialEdgeTypes(newVal, oldVal) {
      this.$store.commit("setProfileShowSpecialEdgeTypes", [oldVal, newVal]);
    },
  },

  methods: {
    async fetchData() {
      const res = (await RequestService.getGraphs()).data;
      if ("graphs" in res) {
        levelOrder(getTreeData());
      }
      this.treeData = getTreeData().children;
      this.$store.commit("setProfileTreeData", this.treeData);
    },
    async initView() {
      await this.fetchData();
    },
    handleTreeChange() {
      this.$store.commit("setProfileNamespaces", this.selectNamespaces);
    },
  },
};
</script>

<style>
.configuration-view {
  border-top: 2px solid #ccc;
}
</style>
