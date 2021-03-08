# Copyright 2020-2021 Huawei Technologies Co., Ltd.All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Mapper module."""
from mindinsight.mindconverter.graph_based_converter.constant import ExchangeMessageKeywords, TemplateKeywords
from mindinsight.mindconverter.graph_based_converter.mapper.base import ONNXToMindSporeMapper


class ConcatMapper(ONNXToMindSporeMapper):
    """Concat mapper."""

    @staticmethod
    def _operation_name_in_ms(*args, **kwargs):
        return "P.Concat"

    @staticmethod
    def _convert_params(**kwargs):
        params = kwargs['params']
        return {'axis': params['axis']}

    @staticmethod
    def _convert_trained_weights(**kwargs):
        return dict()

    @staticmethod
    def _generate_snippet_template(**kwargs):
        weights = kwargs.get("weights")
        op = kwargs.get("operation")
        args = kwargs.get("converted_params", dict())
        trainable_params = kwargs.get("trainable_params", dict())
        if not op:
            raise ValueError("Can not get MindSpore operation name.")

        variable_slot = "var_0"
        init_template = f"self.{{{variable_slot}}} = {op}({', '.join(['%s={%s}' % (p, p) for p in args])})"
        construct_template = f"opt_{{{variable_slot}}} = self.{{{variable_slot}}}" \
                             f"(({{{ExchangeMessageKeywords.VariableScope.value.INPUTS.value}}},))"
        if weights:
            tensor = ConcatMapper._find_val_by_index(0, weights)
            weight_shape = tensor.shape
            weight_type = tensor.dtype
            args["weight_shape"] = weight_shape
            args["weight_type"] = weight_type
            init_tensor = f"self.{{{variable_slot}}}_w = " \
                          f"Parameter(Tensor(np.zeros({{weight_shape}}).astype(np.{{weight_type}})), " \
                          f"name=None)"
            construct_template = f"opt_{{{variable_slot}}} = self.{{{variable_slot}}}" \
                                 f"(({{{ExchangeMessageKeywords.VariableScope.value.INPUTS.value}}}," \
                                 f"self.{{{variable_slot}}}_w))"
            template = {
                variable_slot: {
                    TemplateKeywords.INIT.value: [init_template, init_tensor],
                    TemplateKeywords.CONSTRUCT.value: [construct_template]
                }
            }

        else:
            template = {
                variable_slot: {
                    TemplateKeywords.INIT.value: [init_template],
                    TemplateKeywords.CONSTRUCT.value: [construct_template]
                }
            }

        exchange_msg = {
            variable_slot: {
                ExchangeMessageKeywords.VariableScope.value.OPERATION.value: op,
                ExchangeMessageKeywords.VariableScope.value.VARIABLE_NAME.value: None,
                ExchangeMessageKeywords.VariableScope.value.OUTPUT_TYPE.value:
                    ExchangeMessageKeywords.VariableScope.value.TSR_TYPE.value,
                ExchangeMessageKeywords.VariableScope.value.INPUTS.value: [],
                ExchangeMessageKeywords.VariableScope.value.ARGS.value: args,
                ExchangeMessageKeywords.VariableScope.value.WEIGHTS.value: weights,
                ExchangeMessageKeywords.VariableScope.value.TRAINABLE_PARAMS.value: trainable_params
            }
        }
        outputs_list = [f"opt_{{{variable_slot}}}"]
        outputs_mapping = ((0, 0),)
        return template, exchange_msg, outputs_list, outputs_mapping
