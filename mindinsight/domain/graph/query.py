# Copyright 2021 Huawei Technologies Co., Ltd
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
"""Query module."""

import re


class StackQuery:
    """Stack query."""

    def __init__(self, operators):
        self.operators = operators

    def all(self):
        """
        Retrieve all operators.

        Returns:
            list, all operators.
        """
        return self.operators

    def get(self, index=0):
        """
        Retrieve one operator.

        Args:
            index (int): Operator index, default is 0.

        Returns:
            Operator, single operator.
        """
        if 0 <= index < len(self.operators):
            return self.operators[index]
        return None

    def filter(self, qs, use_regex=False):
        """
        Filter operators with query.

        Args:
            qs (str): Query string.
            use_regex (bool): Indicates if qs is regex.

        Returns:
            StackQuery, cloned object.
        """
        compose = lambda x: f'{x.file_path}:{x.line_no}\n{x.code_line}'

        if use_regex:
            func = lambda x: bool(re.search(qs, compose(x)))
        else:
            func = lambda x: compose(x).find(qs) > -1

        operators = []
        for operator in self.operators:
            for res in map(func, operator.stack):
                if res:
                    operators.append(operator)
                    break

        return self.clone(operators)

    def clone(self, operators):
        """
        Clone query object.

        Returns:
            StackQuery, cloned object.
        """
        return StackQuery(operators)
