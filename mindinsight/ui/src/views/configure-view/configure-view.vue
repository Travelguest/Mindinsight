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
    <a-collapse class="configure-collapse" v-model="activeKey">
      <a-collapse-panel
        key="1"
        header="Namespace"
        :forceRender="true"
        :style="customeStyle"
      >
        <div class="scope-search-wrap" :style="'height: ' + scopeHeight">
          <a-tree-select
            ref="configure-select"
            class="configure-select"
            v-model="selectNamespaces"
            size="small"
            style="width: 100%; aria-expanded: true"
            :tree-data="showTreeData"
            tree-checkable
            :show-checked-strategy="SHOW_PARENT"
            search-placeholder="Please select"
            :dropdownStyle="{
              height: scrollHeight,
              top: '170px!important',
            }"
            :treeDefaultExpandedKeys="expandedKeys"
            dropdownMatchSelectWidth
            :getPopupContainer="
              (triggerNode) => {
                return triggerNode || document.body;
              }
            "
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
      </a-collapse-panel>
      <a-collapse-panel
        key="2"
        header="Hidden Edge"
        :forceRender="true"
        :style="customeStyle"
      >
        <div class="edge-config">
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
      </a-collapse-panel>
      <a-collapse-panel
        key="3"
        header="Stage"
        :forceRender="true"
        :style="customeStyle"
        ><div class="stage-panel"><PipelineStageGraph /></div
      ></a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script>
import * as d3 from "d3";
import { getTreeData, levelOrder } from "@/js/profile-graph/build-graph.js";
import { TreeSelect, Select, Icon, Collapse } from "ant-design-vue";
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
    "a-collapse": Collapse,
    "a-collapse-panel": Collapse.Panel,
  },

  data() {
    return {
      scopeHeight: "100px",
      scrollHeight: "80px",
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
      activeKey: ["1", "2", "3"],
      height2: 0,
      height3: 0,
      height0: 0,
      titleHeight: 0,
      lastKey: ["1", "2", "3"],
      customeStyle: "background:#ffffff;border-radius:0px;",
    };
  },

  mounted() {
    // this.initView();
    if (/\?/.test(location.href)) {
      const value = location.href.split("?").pop().split("=").pop();
      this.dataSource = value;
      console.log("切换数据到", value);
    }
    this.$nextTick(() => {
      // this.height2 =
      //   document.getElementsByClassName("edge-config")[0].clientHeight;
      // console.log(document.getElementsByClassName("ant-collapse-item").length);
      this.height0 =
        document.getElementsByClassName("configuration-view-box")[0]
          .clientHeight -
        document.getElementsByClassName("data-selection-border")[0]
          .clientHeight;
      this.titleHeight = document.getElementsByClassName(
        "ant-collapse-header"
      )[0].clientHeight;
      this.height2 = document.getElementsByClassName(
        "ant-collapse-content-box"
      )[1].clientHeight;
      this.height3 = document.getElementsByClassName(
        "ant-collapse-content-box"
      )[2].clientHeight;
      // console.log(this.height0, this.titleHeight, this.height2, this.height3);
      this.activeKey = ["1", "3"];
    });
  },

  watch: {
    activeKey(key) {
      // this.changeActiveKey(key);
      if (key.length == 3) {
        this.activeKey.splice(0, 1);
      } else if (key.length == 1) {
        if (!this.lastKey.includes("1")) {
          this.activeKey.push("1");
        } else if (!this.lastKey.includes("2")) {
          this.activeKey.push("2");
        } else {
          this.activeKey.push("3");
        }
      } else {
        this.lastKey = key;
        this.changeActiveKey(key);
      }
    },
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
    changeActiveKey(key) {
      if (key.includes("1") && key.includes("2")) {
        this.scopeHeight = "173px";
        this.scrollHeight = "153px";
      } else if (key.includes("1") && key.includes("3")) {
        this.scopeHeight = "163px";
        this.scrollHeight = "143px";
      }
    },
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
  /* position: relative;
  margin-top: 10px;
  height: 100px; */
  text-align: center;
}

/* .scope-search-wrap {
  height: 100px;
} */
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
  /* position: relative;
  margin-left: 32px;
  margin-top: 10px; */
  height: 163px;
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
  /* position: relative; */
  height: 173px;
  width: 100%;
  /* margin-top: 13px; */
  flex-grow: 1;
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

.ant-collapse-header {
  padding: 6px 32px !important;
  border-radius: 0px !important;
  color: none !important;
}

.ant-collapse-item:last-child > .ant-collapse-content {
  border-radius: 0px !important;
}
.ant-collapse {
  border-radius: 0px !important;
}
.ant-collapse-content {
  border-top: none !important;
}

/* .namespace-dropdown {

} */
</style>
