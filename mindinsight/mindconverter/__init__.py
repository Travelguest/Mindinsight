# Copyright 2020 Huawei Technologies Co., Ltd
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ============================================================================
"""
MindConverter.

MindConverter is a migration tool to transform the model scripts from PyTorch to Mindspore.
Users can migrate their PyTorch models to Mindspore rapidly with minor changes according to the conversion report.
"""

__all__ = ["register_pattern", "convert", "query_graph"]

from mindinsight.mindconverter.cli import convert, query_graph
from mindinsight.mindconverter.graph_based_converter.sub_graph_searcher.built_in_pattern import \
    user_defined_pattern as register_pattern
