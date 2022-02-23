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
    />
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

  watch: {
    showSpecialEdgeTypes(newVal, oldVal) {},
  },

  mounted() {
    this.initView();
  },

  methods: {
    async fetchData() {
      console.log("fetching");
      const res = (await RequestService.getGraphs()).data;
      if ("graphs" in res) {
        levelOrder(getTreeData());
      }
      this.treeData = getTreeData().children;
    },
    async initView() {
      await this.fetchData();
    },
  },
};
</script>

<style>
.configuration-view {
  border-top: 2px solid #ccc;
}
</style>
