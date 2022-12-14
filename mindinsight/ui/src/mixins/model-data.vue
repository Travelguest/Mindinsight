<!--
Copyright 2020 Huawei Technologies Co., Ltd.All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
<script>
import echarts, {echartsThemeName} from '../js/echarts';
import CommonProperty from '@/common/common-property.js';
import commonProperty from '../common/common-property';
export default {
  data() {
    return {
      learningRate: this.$t('modelTraceback.learningRate'),
    };
  },

  methods: {
    /** left data**/

    /**
     * Open or close left  column
     */
    collapseLeft() {
      this.collapse = !this.collapse;
      if (this.showLeftChart) {
        clearTimeout(this.showLeftChart);
        this.showLeftChart = null;
      }
      this.showLeftChart = setTimeout(() => {
        this.resizeChart();
      }, 200);
    },
    /**
     * Set data of targets
     * @param {Number} index
     */
    setTargetsData(index) {
      const pieHBuckets = this.targetData[index].buckets;
      this.pieLegendData = [];
      this.pieSeriesData = [];
      // Data of pie
      for (let i = 0; i < pieHBuckets.length; i++) {
        const objData = {};
        if (pieHBuckets[i] && pieHBuckets[i].length >= 3) {
          let preNum = pieHBuckets[i][0];
          let numSum = undefined;
          const baseNum = Math.pow(10, 4);
          preNum = Math.round(preNum * baseNum) / baseNum;
          if (i < pieHBuckets.length - 1) {
            numSum = Math.round(pieHBuckets[i + 1][0] * baseNum) / baseNum;
          } else {
            let nextNumber = pieHBuckets[i][1];
            nextNumber = Math.round(nextNumber * baseNum) / baseNum;
            numSum = preNum + nextNumber;
            numSum = Math.round(numSum * baseNum) / baseNum;
          }
          const minNegativeNum = -10000;
          const maxNegativeNum = -0.0001;
          const minPositiveNum = 0.0001;
          const maxPositiveNum = 10000;
          if (
            ((preNum > maxPositiveNum || preNum < minPositiveNum) && preNum > 0) ||
            ((preNum < minNegativeNum || preNum > maxNegativeNum) && preNum < 0)
          ) {
            preNum = preNum.toExponential(2);
          }
          if (
            ((numSum > maxPositiveNum || numSum < minPositiveNum) && numSum > 0) ||
            ((numSum < minNegativeNum || numSum > maxNegativeNum) && numSum < 0)
          ) {
            numSum = numSum.toExponential(2);
          }
          const numSumString = `${preNum}~${numSum}`;
          this.pieLegendData.push(numSumString);
          objData.value = pieHBuckets[i][2];
          objData.name = numSumString;
          this.pieSeriesData.push(objData);
        }
      }
      this.setBarSelectOptionData(index);
    },

    setChartOfPie() {
      if (!this.myPieChart) {
        this.myPieChart = echarts.init(document.getElementById('pie-chart'), echartsThemeName);
      }
      const commonTheme = CommonProperty.commonChartTheme[this.themeIndex];
      const pieOption = {
        grid: {
          y2: 0,
          y: 0,
          containLabel: true,
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/> {b} : {c} ({d}%)',
          confine: true,
        },
        legend: {
          data: this.pieLegendData,
          selectedMode: false,
          icon: 'circle',
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 10,
          orient: 'vertical',
          left: 'left',
          top: 'bottom',
          textStyle: {
            color: commonTheme.legendTextColor,
          },
        },
        color: CommonProperty.barColorArr[this.themeIndex],
        series: [
          {
            name: this.targetLabel,
            type: 'pie',
            radius: '65%',
            center: ['65%', '50%'],
            label: {
              show: false,
              positionL: 'inner',
            },
            data: this.pieSeriesData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };
      this.$nextTick(() => {
        this.myPieChart.setOption(pieOption);
      });
    },

    setChartOfBar() {
      const barDataLength = this.barYAxisData.length;
      this.xTitle = this.barYAxisData[barDataLength - 1];
      this.viewBigBtnDisabled = !barDataLength;

      if (!barDataLength && this.myBarChart) {
        this.myBarChart.clear();
        this.$refs.smallScatter.clearScatter();
        return;
      }

      const showDataZoomLimitLength = 10;
      const dataZoomShowFlag = barDataLength > showDataZoomLimitLength;

      this.barStart = Math.max(0, barDataLength - 1 - showDataZoomLimitLength);
      this.barEnd = barDataLength - 1;
      const commonTheme = CommonProperty.commonChartTheme[this.themeIndex];
      const modelTracebackChartTheme = commonProperty.modelTracebackChartTheme[this.themeIndex];
      this.barOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
          confine: true,
          formatter: this.barToolTipFormatter,
          backgroundColor: commonTheme.tooltipBgColor,
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params) => {
            return this.barEnd - this.barStart > showDataZoomLimitLength ? '' : params.value;
          },
        },
        xAxis: {
          type: 'value',
          axisLable: {
            formatter: function(value) {
              const minNum = 0.0001;
              const maxNum = 10000;
              if ((value < minNum && value > 0) || value > maxNum) {
                value = value.toExponential(1);
              }
              return value;
            },
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: commonTheme.axisLineColor,
            },
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: commonTheme.splitLineColor,
            },
          },
        },
        yAxis: [
          {
            type: 'category',
            axisTick: {show: false},
            data: this.barYAxisData,
            triggerEvent: true,
            axisLabel: {
              formatter: (params) => {
                const maxLength = 12;
                const axisName = params === 'learning_rate' ? this.learningRate : params;
                if (axisName.length > maxLength) {
                  return axisName.substring(0, maxLength) + '...';
                } else {
                  return axisName;
                }
              },
              color: (params) => {
                const textColor =
                  params === this.xTitle
                    ? modelTracebackChartTheme.epochTextColor
                    : modelTracebackChartTheme.batchSizeTextColor;
                return textColor;
              },
            },
            axisLine: {
              lineStyle: {
                color: commonTheme.axisLineColor,
              },
            },
          },
        ],
        series: [
          {
            name: this.$t('modelTraceback.parameterImportance'),
            type: 'bar',
            barGap: 0,
            barWidth: 10,
            data: this.barSeriesData,
            itemStyle: {
              color: (params) => {
                // Determine the selected name to change the color setting of the column
                if (params.name === this.xTitle) {
                  return '#cc5b58';
                } else {
                  return '#6c92fa';
                }
              },
            },
          },
        ],
        grid: {x: 94, y: 30, x2: 50, y2: 30},
        dataZoom: [
          {
            show: dataZoomShowFlag,
            type: 'slider',
            yAxisIndex: 0,
            width: '30px',
            startValue: this.barStart,
            endValue: this.barEnd,
            showDetail: false,
          },
        ],
      };

      if (this.myBarChart) {
        this.myBarChart.setOption(this.barOption, true);
      } else {
        this.myBarChart = echarts.init(document.getElementById('bar-chart'), echartsThemeName);
        this.myBarChart.setOption(this.barOption, true);
        this.setBarChartEvent();
      }
      // Set up a scatter chart
      this.setChartOfScatters();
    },

    barToolTipFormatter(value) {
      const maxTooltipLen = 30;
      let name = value[0].name;
      this.tooltipsBarName = name;
      name = name.replace(/</g, '< ');
      name = name === 'learning_rate' ? this.learningRate : name;
      const breakCount = Math.ceil(name.length / maxTooltipLen);
      let str = '';
      for (let i = 0; i < breakCount; i++) {
        const temp = name.substr(i * maxTooltipLen, maxTooltipLen);
        str += str ? `<br/>${temp}` : temp;
      }

      const item = this.currentBarData[value[0].axisValue];
      const msg = item && item.message ? item.message : item.disabled ? this.$t('modelTraceback.mustExist') : '';
      const res = `<div class="tooltip-msg"><p>${str}</p><p>${
        this.$t('modelTraceback.parameterImportance') + this.$t('symbols.colon')
      }${value[0].value}</p><p>${
        msg ? this.$t('modelTraceback.explan') + this.$t('symbols.colon') + msg : ''
      }</p></div>`;
      return res;
    },

    /**
     * Set event of bar echart
     */
    setBarChartEvent() {
      this.myBarChart.on('datazoom', (params) => {
        this.barStart = Math.round((this.barYAxisData.length * params.start) / 100) - 1;
        this.barEnd = Math.round((this.barYAxisData.length * params.end) / 100) - 1;
      });
      this.myBarChart.on('mouseover', 'yAxis', (params) => {
        const offsetX = params.event.offsetX + 10;
        const offsetY = params.event.offsetY + 10;
        this.myBarChart.setOption({
          tooltip: {
            formatter: params.value === 'learning_rate' ? this.learningRate : params.value,
            alwaysShowContent: true,
          },
        });
        this.myBarChart.dispatchAction({
          type: 'showTip',
          seriesIndex: 0,
          dataIndex: 0,
          position: [offsetX, offsetY],
        });
      });
      this.myBarChart.on('mouseout', 'yAxis', (params) => {
        this.myBarChart.setOption({
          tooltip: {
            formatter: this.barToolTipFormatter,
            alwaysShowContent: false,
          },
        });
      });
      this.myBarChart.getZr().on('click', (params) => {
        if (params.topTarget) {
          setTimeout(() => {
            this.xTitle = this.tooltipsBarName;
            this.myBarChart.setOption(this.barOption, true);
            // Draw a scatter chart after click
            this.setChartOfScatters();
          }, 100);
        }
      });
      this.myBarChart.on('click', 'yAxis', (params) => {
        this.tooltipsBarName = params.value;
      });
    },

    /**
     * Set data of scatters echart
     */
    setChartOfScatters() {
      this.yTitle = this.targetLabel;
      let xvalue = [];
      let yvalue = [];
      this.tooltipsData = [];
      const hyper = this.scatterData.metadata.possible_hyper_parameters;
      for (let m = 0; m < hyper.length; m++) {
        hyper[m].name = hyper[m].name === 'learning_rate' ? this.learningRate : hyper[m].name;
        if (hyper[m].name === this.xTitle) {
          xvalue = hyper[m].data;
        }
      }
      for (let k = 0; k < this.scatterData.targets.length; k++) {
        if (this.scatterData.targets[k].name === this.yTitle) {
          yvalue = this.scatterData.targets[k].data;
        }
      }
      const arrayTemp = [];
      for (let i = 0; i < xvalue.length; i++) {
        if ((xvalue[i] || xvalue[i] === 0) && (yvalue[i] || yvalue[i] === 0)) {
          arrayTemp.push([xvalue[i], yvalue[i]]);
          const obj = {train_id: this.scatterData.metadata['train_ids'][i]};
          obj[this.xTitle] = xvalue[i];
          obj[this.yTitle] = yvalue[i];
          this.tooltipsData.push(obj);
        }
      }
      this.scatterChartData = arrayTemp;
      this.viewBigBtnDisabled = !this.scatterChartData.length;
    },

    /**
     * No data on echart on the left
     */
    leftChartNoData() {
      this.viewBigBtnDisabled = true;
      this.targetValue = '';
      this.targetOptions = [];
      this.selectedBarArray = [];
      this.barNameList = [];
      this.baseSelectOptions = [];
      // Clear pie charts, bar chart and scatter charts
      if (this.myPieChart) {
        this.myPieChart.clear();
      }
      if (this.myBarChart) {
        this.myBarChart.clear();
      }
      if (this.$refs.smallScatter) {
        this.$refs.smallScatter.clearScatter();
      }
    },
    /**
     * Single selection drop-down box on the left
     */
    targetSelectChange() {
      const length = this.targetOptions.length;
      let index = 0;
      for (let i = 0; i < length; i++) {
        if (this.targetValue === this.targetOptions[i].value) {
          this.targetLabel = this.targetOptions[i].label;
          index = i;
          break;
        }
      }
      this.setTargetsData(index);
      this.$nextTick(() => {
        this.setChartOfPie();
        this.setChartOfBar();
      });
    },
    /**
     * The method of changing the value of the multi-select drop-down box of the histogram
     */
    selectedBarNameListChange() {
      // Setting the bar selection
      const list = [];
      this.baseSelectOptions.forEach((item) => {
        item.options.forEach((option) => {
          list.push(option.label);
        });
      });
      if (list.length > this.selectedBarArray.length) {
        this.selectedAllBar = false;
      } else {
        this.selectedAllBar = true;
      }
      this.selectedSetBarData();
    },

    // Select all bar options
    barAllSelect() {
      if (this.selectedAllBar) {
        return;
      }
      this.selectedBarArray = [];
      this.barNameList.forEach((item) => {
        item.options.forEach((option) => {
          if (!option.unselected) {
            this.selectedBarArray.push(option.label);
          }
        });
      });
      this.selectedAllBar = !this.selectedAllBar;
      this.selectedSetBarData();
    },

    // Bar unselect all
    barDeselectAll() {
      this.selectedBarArray = [];
      this.barNameList.forEach((item) => {
        item.options.forEach((option) => {
          if (option.disabled && !option.unselected) {
            this.selectedBarArray.push(option.label);
          }
        });
      });
      this.selectedAllBar = false;
      this.selectedSetBarData();
    },

    viewLargeImage() {
      if (this.scatterChartData.length && !this.viewBigBtnDisabled) {
        this.echartDialogVisible = true;
        this.$nextTick(() => {
          this.largeScatterChartData = this.scatterChartData;
          this.$refs.dialogScatter.resizeCallback();
        });
      }
    },
    setBarSelectOptionData(index) {
      const barHyper = [];
      const tempData = this.targetData[index].hyper_parameters;
      const unrecognizedParams = this.scatterData.metadata.unrecognized_params;
      let arrayTotal = [];
      if (unrecognizedParams && unrecognizedParams.length) {
        arrayTotal = unrecognizedParams.concat(tempData);
      } else {
        arrayTotal = tempData;
      }
      tempData.forEach((item) => {
        item.name = item.name === 'learning_rate' ? this.learningRate : item.name;
        if (!item.unselected) {
          if (item.name.startsWith('[U]')) {
            barHyper.unshift(item);
          } else {
            barHyper.push(item);
          }
        }
      });
      barHyper.sort(this.sortBy('importance'));
      this.selectedBarArray = [];
      const mustSelectOptions = [];
      const otherListOptions = [];
      const selectBar = [];
      // Options that can be selected
      this.canSelected = [];
      arrayTotal.forEach((item) => {
        if (item.name.startsWith('[U]')) {
          if (!item.unselected) {
            this.canSelected.push(item);
            otherListOptions.unshift({
              value: item.name,
              label: item.name,
              disabled: item.unselected ? true : false,
              unselected: item.unselected ? item.unselected : undefined,
              message: item.reason_code ? this.$t('modelTraceback.reasonCode')[item.reason_code.toString()] : '',
            });
          } else {
            otherListOptions.push({
              value: item.name,
              label: item.name,
              disabled: item.unselected ? true : false,
              unselected: item.unselected ? item.unselected : undefined,
              message: item.reason_code ? this.$t('modelTraceback.reasonCode')[item.reason_code.toString()] : '',
            });
          }
        } else {
          if (!item.unselected) {
            selectBar.push(item.name);
            mustSelectOptions.push({
              value: item.name,
              label: item.name,
              disabled: true,
              unselected: item.unselected ? item.unselected : undefined,
              message: item.reason_code ? this.$t('modelTraceback.reasonCode')[item.reason_code.toString()] : '',
            });
          } else {
            mustSelectOptions.push({
              value: item.name,
              label: item.name,
              disabled: true,
              unselected: item.unselected ? item.unselected : undefined,
              message: item.reason_code ? this.$t('modelTraceback.reasonCode')[item.reason_code.toString()] : '',
            });
          }
        }
      });
      this.selectedBarArray = selectBar;
      this.barNameList = [];
      this.baseSelectOptions = [];
      const nameObjMust = {
        label: this.$t('modelTraceback.mustOptions'),
        options: mustSelectOptions,
      };
      const nameObjOther = {
        label: this.$t('modelTraceback.customOptions'),
        options: otherListOptions,
      };
      this.baseOptions = mustSelectOptions.concat(otherListOptions);
      this.searchOptions = this.baseOptions;
      const barData = {};
      this.baseOptions.forEach((i) => {
        barData[i.value] = i;
      });
      this.currentBarData = JSON.parse(JSON.stringify(barData));
      // The displayed bar drop-down box content
      this.barNameList.push(nameObjMust, nameObjOther);
      this.barNameList.forEach((item) => {
        item.options.forEach((options) => {
          options.label = options.label === 'learning_rate' ? this.learningRate : options.label;
        });
      });
      // Save all the contents of the drop-down box
      this.baseSelectOptions.push(nameObjMust, nameObjOther);
      this.barYAxisData = [];
      this.barSeriesData = [];
      for (let i = 0; i < barHyper.length; i++) {
        const name = barHyper[i].name;
        let importanceValue = barHyper[i].importance;
        const smallNum = 0.0001;
        if (importanceValue < smallNum && importanceValue > 0) {
          importanceValue = importanceValue.toExponential(4);
        } else {
          importanceValue = Math.round(importanceValue * Math.pow(10, 4)) / Math.pow(10, 4);
        }
        if (!barHyper[i].name.startsWith('[U]') && importanceValue !== 0) {
          this.barYAxisData.push(name);
          this.barSeriesData.push(importanceValue);
        } else if (!barHyper[i].name.startsWith('[U]')) {
          this.barYAxisData.unshift(name);
          this.barSeriesData.unshift(importanceValue);
        }
        this.currentBarData[name].value = importanceValue;
      }
      this.selectedAllBar = barHyper.length > this.barYAxisData.length ? false : true;
    },

    /** right data**/
    /**
     * Set Column Data of Table
     */
    setTableColumnData() {
      this.table = {
        columnOptions: {
          train_dataset_path: {
            label: this.$t('modelTraceback.trainSetPath'),
            required: true,
          },
          test_dataset_path: {
            label: this.$t('modelTraceback.testSetPath'),
            required: true,
          },
          loss: {
            label: this.labelValue.loss,
            required: true,
          },
          network: {
            label: this.$t('modelTraceback.network'),
            required: true,
          },
          optimizer: {
            label: this.$t('modelTraceback.optimizer'),
            required: true,
          },
          train_dataset_count: {
            label: this.$t('modelTraceback.trainingSampleNum'),
            required: false,
          },
          test_dataset_count: {
            label: this.$t('modelTraceback.testSampleNum'),
            required: false,
          },
          learning_rate: {
            label: this.$t('modelTraceback.learningRate'),
            required: false,
          },
          epoch: {
            label: this.labelValue.epoch,
            required: false,
          },
          batch_size: {
            label: this.labelValue.batch_size,
            required: false,
          },
          device_num: {
            label: this.$t('modelTraceback.deviceNum'),
            required: false,
          },
          model_size: {
            label: this.$t('modelTraceback.modelSize'),
            required: false,
          },
          loss_function: {
            label: this.$t('modelTraceback.lossFunc'),
            required: false,
          },
        }, // All options of the column in the table
        otherColumn: [], // Table Column
        mandatoryColumn: [], // Mandatory Table Column
        optionalColumn: [], // Optional Table Column
        data: [],
        // no checked list
        optionsNotInCheckbox: ['summary_dir', 'train_dataset_path', 'test_dataset_path'],
        optionsNotInEchart: ['summary_dir', 'train_dataset_path', 'test_dataset_path'],
        optionsNotInTable: ['dataset_mark'],
        selectedColumn: [],
        selectAll: false, // Whether to select all columns
        indeterminate: false,
      };
    },
    setInitListValue() {
      this.keysOfStringValue = [
        'summary_dir',
        'network',
        'optimizer',
        'loss_function',
        'train_dataset_path',
        'test_dataset_path',
        'dataset_mark',
      ]; // All keys whose values are character strings
      // All keys whose values are int
      this.keysOfIntValue = ['train_dataset_count', 'test_dataset_count', 'epoch', 'batch_size', 'device_num'];
      this.keysOfMixed = [];
      this.keysOfListType = [];
    },

    sortBy(field) {
      return function(a, b) {
        return a[field] - b[field];
      };
    },
    setNumberType(value) {
      const num = 1000000;
      if (value < num) {
        return Math.round(value * Math.pow(10, 4)) / Math.pow(10, 4);
      } else {
        return value.toExponential(4);
      }
    },

    /**
     * The method for the drop-down box to get the focus operation.
     *  @param {String} val
     */
    selectinputFocus(val) {
      if (val === 'left') {
        // Parameter importance drop-down box
        this.barKeyWord = '';
        this.searchOptions = this.baseOptions;
        this.barNameList = this.baseSelectOptions;
      } else {
        // Model traceability drop-down box on the right
        this.keyWord = '';
        this.checkOptions = this.basearr;
        this.showOptions = this.rightAllOptions;
      }
    },
    /**
     * Input search filtering in the select module.
     *  @param {String} val
     */
    myfilter(val) {
      if (val === 'left') {
        // Parameter importance drop-down box
        const queryString = this.barKeyWord;
        const restaurants = this.baseSelectOptions;
        const results = queryString ? this.createFilter(queryString, restaurants) : restaurants;
        this.barNameList = results;
        this.searchOptions = [];
        let list = [];
        results.forEach((item) => {
          list = list.concat(item.options);
        });
        this.searchOptions = list;
        if (!this.searchOptions.length) {
          this.$nextTick(() => {
            if (this.$refs.barKeyEmptyInput) {
              this.$refs.barKeyEmptyInput.focus();
            }
          });
        } else {
          this.$nextTick(() => {
            if (this.$refs.barKeyInput) {
              this.$refs.barKeyInput.focus();
            }
          });
        }
      } else {
        // Model traceability drop-down box on the right
        const queryString = this.keyWord;
        const restaurants = this.basearr;
        const results = queryString ? this.createFilter(queryString, restaurants) : restaurants;
        this.checkOptions = results;
        this.showOptions = [];
        let list = [];
        results.forEach((item) => {
          list = list.concat(item.options);
        });
        this.showOptions = list;
        if (!this.showOptions.length) {
          this.$nextTick(() => {
            if (this.$refs.keyEmptyInput) {
              this.$refs.keyEmptyInput.focus();
            }
          });
        } else {
          this.$nextTick(() => {
            if (this.$refs.keyInput) {
              this.$refs.keyInput.focus();
            }
          });
        }
      }
    },

    /**
     * Input search filtering in the select module.
     * @param {String} queryString
     * @param {Array} restaurants
     * @return {Array}
     */
    createFilter(queryString, restaurants) {
      const list = [];
      restaurants.forEach((item) => {
        const object = {};
        const options = [];
        if (item.options) {
          item.options.forEach((item) => {
            if (item.label.toLowerCase().indexOf(queryString.toLowerCase()) >= 0) {
              const tempObj = {};
              tempObj.label = item.label;
              tempObj.value = item.value;
              tempObj.disabled = item.disabled;
              options.push(tempObj);
            }
          });
        }
        if (options.length > 0) {
          object.label = item.label;
          object.options = options;
          list.push(object);
        }
      });
      return list;
    },
    /**
     * Set the image display of the tag
     */
    setTableTagImage() {
      this.imageList = [];
      for (let i = 1; i <= 10; i++) {
        const obj = {};
        obj.number = i;
        obj.iconAdd = require(`@/assets/images/icon${obj.number}.svg`);
        this.imageList.push(obj);
      }
    },
    /**
     *  Set tag style
     * @param {Object} event
     */
    blurFloat(event) {
      const domArr = document.querySelectorAll('.icon-dialog');
      const path = event.path || (event.composedPath && event.composedPath());
      const isActiveDom = path.some((item) => {
        return item.className === 'icon-dialog';
      });
      if (!isActiveDom) {
        this.removeIconBorder();
        domArr.forEach((item) => {
          item.style.display = 'none';
        });
        this.tagDialogShow = false;
      }
    },
    /**
     * Display of the icon dialog box
     * @param {Object} row
     * @param {Object} scope
     * @param {Object} event
     */
    showAllIcon(row, scope, event) {
      this.iconValue = row.tag >= 0 ? row.tag : 0;
      this.tagScope = scope;
      if (this.tagDialogShow) {
        this.tagDialogShow = false;
        this.removeIconBorder();
        return;
      }
      this.addIconBorder(row);
      this.tagDialogShow = true;
      const dialogHeight = 130;
      const ev = window.event || event;
      document.getElementById('tag-dialog').style.top = ev.clientY - dialogHeight + 'px';
    },

    /**
     * Add icon border style
     * @param {Object} row
     */
    addIconBorder(row) {
      const iconImage = document.querySelectorAll('.icon-image');
      iconImage.forEach((item, index) => {
        if (index + 1 === row.tag) {
          item.classList.add('icon-border');
        }
      });
    },

    /**
     * Remove  icon border style
     */
    removeIconBorder() {
      const classArr = document.querySelectorAll('.icon-border');
      if (classArr.length) {
        classArr.forEach((item) => {
          item.classList.remove('icon-border');
        });
      }
    },
    /**
     * Icon value change
     * @param {Object} row
     * @param {Number} num
     *  @param {Object} event
     */
    iconValueChange(row, num, event) {
      const path = event.path || (event.composedPath && event.composedPath());
      const classWrap = path.find((item) => {
        return item.className === 'icon-dialog';
      });
      const classArr = classWrap.querySelectorAll('.icon-border');
      classArr.forEach((item) => {
        item.classList.remove('icon-border');
      });
      const htmDom = path.find((item) => {
        return item.nodeName === 'DIV';
      });
      htmDom.classList.add('icon-border');
      this.iconValue = num;
    },
    /**
     * Save the modification of the icon.
     * @param {Object} scope
     */
    iconChangeSave(scope) {
      this.tagDialogShow = false;
      if (scope.row.tag === this.iconValue || this.iconValue === 0) {
        return;
      }
      this.tagScope.row.tag = this.iconValue;
      const imgDom = document.querySelectorAll('.img' + scope.$index);
      imgDom.forEach((item) => {
        item.src = require(`@/assets/images/icon${this.iconValue}.svg`);
      });
      this.$forceUpdate();
      const params = {
        train_id: scope.row.summary_dir,
        body: {
          tag: this.tagScope.row.tag,
        },
      };
      this.putChangeToLineagesData(params);
    },

    /**
     * Clear icon
     * @param {Object} scope
     * @param {Object} event
     */
    clearIcon(scope, event) {
      const path = event.path || (event.composedPath && event.composedPath());
      const classWrap = path.find((item) => {
        return item.className === 'icon-dialog';
      });
      const classArr = classWrap.querySelectorAll('.icon-border');
      classArr.forEach((item) => {
        item.classList.remove('icon-border');
      });
      this.tagDialogShow = false;
      this.iconValue = 0;
      this.tagScope.row.tag = 0;
      const imgDom = document.querySelectorAll('.img' + scope.$index);
      imgDom.forEach((item) => {
        item.src = require('@/assets/images/icon-down.svg');
      });
      const params = {
        train_id: scope.row.summary_dir,
        body: {
          tag: 0,
        },
      };
      this.putChangeToLineagesData(params);
    },
    /**
     * Cancel save
     * @param {Object} row
     */
    cancelChangeIcon(row) {
      this.removeIconBorder();
      this.addIconBorder(row);
      this.tagDialogShow = false;
    },
    /**
     * Edit remarks
     * @param {Object} row
     */
    editRemarks(row) {
      row.editShow = false;
      row.isError = false;
      this.beforeEditValue = row.remark;
    },

    /**
     * Save remarks
     * @param {Object} row
     */
    saveRemarksValue(row) {
      const tagValidation = new RegExp('^[a-zA-Z0-9\u4e00-\u9fa5_.-]{1,128}$');
      const result = row.remark.length ? tagValidation.test(row.remark) : true;
      if (result) {
        row.isError = false;
        row.editShow = true;
        const params = {
          train_id: row.summary_dir,
          body: {
            remark: row.remark,
          },
        };
        this.putChangeToLineagesData(params);
      } else {
        row.isError = true;
      }
    },

    /**
     * Cancel save editing
     * @param {Object} row
     */
    cancelRemarksValue(row) {
      row.editShow = true;
      row.remark = this.beforeEditValue;
      row.isError = false;
    },
    /**
     * Jump to the training dashboard
     * @param {String} id
     */
    jumpToTrainDashboard(id) {
      const trainId = id;
      const routeUrl = this.$router.resolve({
        path: '/train-manage/training-dashboard',
        query: {id: trainId},
      });
      window.open(routeUrl.href, '_blank');
    },
    /**
     * Jump to DataTraceback
     */
    jumpToDataTraceback() {
      this.$router.push({
        path: '/data-traceback',
      });
    },
    /**
     * Keep the number with n decimal places.
     * @param {Number} num
     * @param {Number} pow Number of decimal places
     * @return {Number}
     */
    toFixedFun(num, pow) {
      if (isNaN(num) || isNaN(pow) || !num || !pow) {
        return num;
      }
      return Math.round(num * Math.pow(10, pow)) / Math.pow(10, pow);
    },
    /**
     * Formatting Data
     * @param {String} key
     * @param {String} value
     * @return {Object}
     */
    formatNumber(key, value) {
      if (isNaN(value) || !value) {
        return value;
      } else {
        const numDigits = 4;
        if (key === this.labelValue.learning_rate) {
          let temp = value.toPrecision(numDigits);
          let row = 0;
          while (temp < 1) {
            temp = temp * 10;
            row += 1;
          }
          temp = this.toFixedFun(temp, numDigits);
          return `${temp}${row ? `e-${row}` : ''}`;
        } else if (key === this.valueType.model_size) {
          return value + 'MB';
        } else {
          const num = 1000;
          if (value < num) {
            return Math.round(value * Math.pow(10, numDigits)) / Math.pow(10, numDigits);
          } else {
            const reg = /(?=(\B)(\d{3})+$)/g;
            return (value + '').replace(reg, ',');
          }
        }
      }
    },
    /**
     * Resizing Chart
     */
    resizeChart() {
      const chartDom = document.getElementById('echart');
      if (chartDom && chartDom.style.display !== 'none' && this.echart && this.echart.chart) {
        this.$nextTick(() => {
          this.echart.chart.resize();
        });
      }
    },
    showSelectedModelData() {
      // Only need to pass in the filter data list when filtering the table
      this.tableFilter.summary_dir = {
        in: this.selectRowIdList,
      };
      this.$store.commit('setSummaryDirList', this.selectRowIdList);
      this.selectArrayValue = [];
      this.checkOptions = [];
      this.basearr = [];
      this.$refs.table.clearSelection();
      // The page needs to be initialized to 1
      this.pagination.currentPage = 1;
      this.init();
    },
    // Hide button, hide selected item
    hideSelectedModelRows() {
      this.hideTableIdList = this.$store.state.hideTableIdList;
      this.summaryDirList = this.$store.state.summaryDirList;
      // Set hidden data
      if (this.hideTableIdList) {
        this.hideTableIdList = this.hideTableIdList.concat(this.selectRowIdList);
      } else {
        this.hideTableIdList = this.selectRowIdList;
      }
      // There must be hidden list data
      this.tableFilter.summary_dir = {
        in: this.summaryDirList,
        not_in: this.hideTableIdList,
      };
      this.$store.commit('setHideTableIdList', this.hideTableIdList);
      this.selectArrayValue = [];
      this.checkOptions = [];
      this.basearr = [];
      this.$refs.table.clearSelection();
      // The page needs to be initialized to 1
      this.pagination.currentPage = 1;
      this.init();
    },
    setSelectOptionsData() {
      this.keysOfMixed = [];
      this.keysOfListType = [];
      this.userOptions = [];
      this.metricOptions = [];
      // Metric list
      this.metricList = [];
      // User-defined list
      this.userDefinedList = [];
      // Hyper list
      this.hyperList = [];
      this.hyperOptions = [];
      this.otherTypeOptions = [];
      this.checkOptions = [];
      this.basearr = [];
      this.selectArrayValue = [];
    },
    /**
     * Resetting the Eechart
     */
    showAllDatafun() {
      this.summaryDirList = undefined;
      // The hidden list is set to undefined
      this.hideTableIdList = undefined;
      // Set the saved hidden list to undefined;
      this.$store.commit('setHideTableIdList', undefined);
      this.$store.commit('setSummaryDirList', undefined);
      this.$store.commit('setSelectedBarList', []);
      this.noData = false;
      this.showTable = false;
      this.selectCheckAll = true;
      this.chartFilter = {};
      this.tableFilter.summary_dir = undefined;
      this.sortInfo = {};
      this.pagination.currentPage = 1;
      this.echart.allData = [];
      if (this.echart.chart) {
        this.echart.chart.clear();
      }
      this.init();
      this.$refs.table.clearSelection();
    },

    /**
     * Selected data in the table
     * @param {Array} list Selected data in the table
     */
    selectionChange(list = []) {
      const summaryDirFilter = [];
      list.forEach((i) => {
        summaryDirFilter.push(i.summary_dir);
      });
      this.selectRowIdList = summaryDirFilter;
      if (summaryDirFilter.length) {
        this.disabledFilterBtnModel = false;
        this.disabledHideBtnModel = false;
      } else {
        this.disabledFilterBtnModel = true;
        this.disabledHideBtnModel = true;
      }
    },
  },
  destroyed() {},
};
</script>
