/**
 * Copyright 2019-2021 Huawei Technologies Co., Ltd.All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import Vue from "vue";
import Vuex from "vuex";
import RequestService from "@/services/request-service";
import axios from "axios";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    // cancel request token
    cancelTokenArr: [],
    // reload flag
    isReload: false,
    // Scheduled reload flag
    isTimeReload: localStorage.isTimeReload === "false" ? false : true,
    // reload time
    timeReloadValue: localStorage.timeReloadValue
      ? localStorage.timeReloadValue
      : 10,
    // multiSelevtGroup component count
    multiSelectedGroupCount: 0,
    tableId: 0,
    componentsCount: 0,
    summaryDirList: undefined,
    // Traceability list that needs to be hidden
    hideTableIdList: undefined,
    // Echart column selected by model traceability box
    selectedBarList: [],
    customizedColumnOptions: [],
    // Current language
    language: "en-us",
    // Theme index
    themeIndex: "0",

    profileNamespaces: [],
    profileTreeData: [],
    profileSpecialEdgeTypes: [],
    // profileShowSpecialEdgeTypes: { newVal: [], oldVal: [] },
    profileShowSpecialEdgeTypes: [],
    graphData: {},
    selectedGraphNode: null,
    nodeMaps: [],

    stepNum: 1,
    nameScopeToParallelStrategy: "", //传给ParallelStrategyScope
    nameScopeToPerformanceView: "", //传给PerformanceView的nameScope

    communicateNodes: null, //LineChart依赖数据
    communicationData: null, //getCommunicationData的数据

    selectCommunicateOpnode: ["", 0],

    selectOpname: "", //在通信图矩阵boxplot中选择异常节点的名字
  },
  mutations: {
    // set cancelTokenArr
    pushToken: (state, src) => {
      state.cancelTokenArr.push(src.cancelToken);
    },
    // clear cancelTokenArr
    clearToken: (state) => {
      state.cancelTokenArr.forEach((item) => {
        item("routeJump");
      });
      state.cancelTokenArr = [];
    },
    // set isReload
    setIsReload: (state, val) => {
      state.isReload = val;
    },
    setSummaryDirList: (state, val) => {
      state.summaryDirList = val;
    },
    // Set hidden list
    setHideTableIdList: (state, val) => {
      state.hideTableIdList = val;
    },
    // Set the frame selection bar of model traceability echart
    setSelectedBarList: (state, val) => {
      state.selectedBarList = val;
    },
    customizedColumnOptions: (state, val) => {
      state.customizedColumnOptions = val;
    },
    // set isTimeReload
    setIsTimeReload: (state, val) => {
      state.isTimeReload = val;
    },
    setTimeReloadValue: (state, val) => {
      state.timeReloadValue = val;
    },
    multiSelectedGroupComponentNum(state) {
      state.multiSelectedGroupCount++;
    },
    increaseTableId(state) {
      state.tableId++;
    },
    componentsNum(state) {
      state.componentsCount++;
    },
    setLanguage(state, val) {
      state.language = val;
    },
    setThemeIndex(state, val) {
      state.themeIndex = val;
      localStorage.setItem("miTheme", val);
    },
    setProfileNamespaces(state, val) {
      state.profileNamespaces = val;
    },
    setProfileTreeData(state, val) {
      state.profileTreeData = val;
    },
    setProfileSpecialEdgeTypes(state, val) {
      state.profileSpecialEdgeTypes = val;
    },
    setProfileShowSpecialEdgeTypes(state, val) {
      // state.profileShowSpecialEdgeTypes["newVal"] = val["newVal"];
      // state.profileShowSpecialEdgeTypes["oldVal"] = val["oldVal"];
      state.profileShowSpecialEdgeTypes = val;
    },
    setGraphData(state, val) {
      state.graphData = val;
    },
    setSelectedGraphNode(state, val) {
      state.selectedGraphNode = val;
    },
    setNodeMaps(state, val) {
      state.nodeMaps = val;
    },
    setStepNum(state, val) {
      state.stepNum = val;
    },
    setNameScopeToParallelStrategy(state, val) {
      state.nameScopeToParallelStrategy = val;
    },
    setNameScopeToPerformanceView(state, val) {
      state.nameScopeToPerformanceView = val;
    },
    setCommunicateNodes(state, val) {
      state.communicateNodes = val;
    },
    setSelectCommunicateOpnode(state, val) {
      state.selectCommunicateOpnode = val;
    },
    setCommunicationData(state, val) {
      state.communicationData = val;
    },
    setSelectOpname(state, val) {
      state.selectOpname = [val[0].toLowerCase(), Number(val[1])];
    },
  },
  actions: {
    getGraphData({ commit }) {
      // const res = RequestService.getGraphs().data;
      // if (res) {
      //   commit('setGraphData', res.graphs)
      // } else {
      //   console.log(res);
      // }
      axios
        .get("mock/getGraphs")
        .then((res) => {
          commit("setGraphData", res.data); //调用mutations下面的changeListMutation方法并且传值过去
        })
        .catch((error) => {
          console.log(error);
        });
    },
  },
});
