<template>
  <div class="configuration-view-box">
    <svg
      class="data-selection-border"
      style="position: absolute; top: 0"
      width="414px"
      height="35px"
    >
      <polyline
        stroke="#ccc"
        stroke-width="1px"
        fill="none"
        points="0,35 384,35 414,0"
      ></polyline>
    </svg>
    <div class="data-selection">
      <span class="title">Data selection: </span>
      <a-select
        v-model="dataSource"
        size="small"
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
        size="small"
        style="width: 80%; aria-expanded: true"
        :tree-data="showTreeData"
        tree-checkable
        :show-checked-strategy="SHOW_PARENT"
        search-placeholder="Please select"
        :dropdownStyle="{ height: '70px' }"
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
      <div class="config-sub-title">Hidden Edge</div>
      <div class="special-edge-checkbox">
        <el-checkbox-group v-model="showSpecialEdgeTypes">
          <el-checkbox
            v-for="(specialEdgeType, index) in specialEdgeTypes"
            :key="index"
            :label="specialEdgeType"
            style="display: block; height: 20px"
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
      <div class="stage-panel-sub-title">Stage</div>
      <PipelineStageGraph />
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";
import { getTreeData, levelOrder } from "@/js/profile-graph/build-graph.js";
import { TreeSelect, Select, Icon } from "ant-design-vue";
import PipelineStageGraph from "./PiplineStageGraph.vue";
import RequestService from "@/services/request-service";
import * as _ from "lodash";

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
      dataSource: "",
      nameScopeFromMarey: [],
    };
  },

  mounted() {
    // this.initView();
    if (/\?/.test(location.href)) {
      const value = location.href.split("?").pop().split("=").pop();
      this.dataSource = value;
      console.log("切换数据到", value);
    }
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
    "$store.state.nameScopeToParallelStrategy": function (val) {
      if (val.nameScope) console.log(val);
      this.selectNewScopeFromMarey(val);
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
    selectNewScopeFromMarey(val) {
      if (this.nameScopeFromMarey.length > 0) {
        this.nameScopeFromMarey.forEach((namescope) => {
          var index = this.selectNamespaces.indexOf(namescope);
          if (index != -1) {
            this.selectNamespaces.splice(index, 1);
          }
        });
        this.nameScopeFromMarey = [];
      }
      var data = [];
      for (var i = 0; i < this.treeData.length; i++) {
        if (val.stage.includes(this.treeData[i].title)) {
          data.push(this.treeData[i]);
        }
      }

      data.forEach((stageData) => {
        var reData = _.cloneDeep(stageData);
        var nameLst = val.nameScope.split("/");
        var familyLst = [reData];
        if (nameLst[0] == "") {
          nameLst.splice(0, 1);
        }
        while (nameLst.length != 0) {
          var childIndex;
          for (
            childIndex = 0;
            childIndex < reData.children.length;
            childIndex++
          ) {
            if (reData.children[childIndex].title == nameLst[0]) {
              break;
            }
          }
          if (childIndex == reData.children.length) {
            break;
          } else {
            reData = reData.children[childIndex];
            familyLst.push(reData);
            nameLst.splice(0, 1);
          }
        }

        if (nameLst.length == 0) {
          for (i = familyLst.length - 2; i >= 0; i--) {
            if (familyLst[i].children.length == 1) {
              reData = familyLst[i];
            } else {
              break;
            }
          }

          console.log("能找到对应namescope-father", reData);

          var findIndex = this.selectNamespaces.indexOf(reData.key);
          if (findIndex != -1) {
            this.selectNamespaces.splice(findIndex, 1);
          } else {
            this.nameScopeFromMarey.push(reData.key);
          }
          this.selectNamespaces.push(reData.key);
          console.log(this.selectNamespaces, this.haloColorScale(reData.key));
          console.log(this.selectNamespaces.includes(reData.key));
          this.handleTreeChange();
        } else {
          console.log("不能找到对应namescope", reData, nameLst);
        }
      });

      //TODO: 从marey收到一个namescope
    },

    handleTreeChange(value, label) {
      this.$store.commit("setProfileNamespaces", this.selectNamespaces);
    },
    handleDataSwitch(value) {
      RequestService.switchDataset(value)
        .then((data) => {
          location.href =
            location.href.split("?").shift() + `?dataSource=${this.dataSource}`;
          location.reload();
        })
        .catch((e) => {
          console.error(e);
        });
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
  margin: 5px 0 5px 32px;
}
.data-selection .title {
  font-weight: 500;
  font-size: 16px;
  margin-right: 10px;
}
.scope-search {
  position: relative;
  margin-top: 10px;
  height: 100px;
  text-align: center;
}
/* .scope-tree {
  height: 230px;
  width: 90%;
  overflow-y: scroll;
  background: #eee;
  margin: 0 auto;
} */
/* .dashed-line {
  border-bottom: 1px dashed #aaaaaa;
  width: 90%;
  margin: 0 auto;
  padding-top: 5px;
  position: relative;
} */
.special-edge-checkbox {
  /* flex-grow: 1; */
}
.edge-config {
  position: relative;
  margin-left: 32px;
  margin-top: 10px;
  height: 160px;
}
.config-sub-title {
  font-weight: 500;
  font-size: 14px;
  margin-top: 5px;
  text-align: left;
}
.stage-panel-sub-title {
  font-weight: 500;
  font-size: 14px;
  margin-left: 32px;
  margin-top: 5px;
  text-align: left;
}
.stage-panel {
  position: relative;
  height: 150px;
  margin-top: 13px;
  /* flex-grow: 1; */
}
.ant-select-open .ant-select-selection {
  border-color: #fff !important;
}
.ant-select-dropdown {
  /* border-shadow: */
  box-shadow: 0 0 !important;
}
/* 修改滚动轴样式 */
.ant-select-dropdown::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.ant-select-dropdown::-webkit-scrollbar-track {
  background: rgb(239, 239, 239);
  border-radius: 2px;
}
.ant-select-dropdown::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 10px;
}
.ant-select-dropdownr::-webkit-scrollbar-thumb:hover {
  background: #333;
}
.ant-select-dropdown::-webkit-scrollbar-corner {
  background: #179a16;
}
</style>
