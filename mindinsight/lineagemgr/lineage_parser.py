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
"""This file is used to parse lineage info."""
import os

from mindinsight.datavisual.data_transform.summary_watcher import SummaryWatcher
from mindinsight.lineagemgr.common.exceptions.exceptions import LineageSummaryAnalyzeException, \
    LineageEventNotExistException, LineageEventFieldNotExistException, LineageFileNotFoundError, \
    MindInsightException
from mindinsight.lineagemgr.common.log import logger
from mindinsight.lineagemgr.common.path_parser import SummaryPathParser
from mindinsight.lineagemgr.summary.lineage_summary_analyzer import LineageSummaryAnalyzer
from mindinsight.lineagemgr.querier.query_model import LineageObj
from mindinsight.utils.exceptions import ParamValueError

LINEAGE = "lineage"


class SuperLineageObj:
    """This is an object for LineageObj and its additional info."""
    def __init__(self, lineage_obj, update_time, added_info=None):
        self._lineage_obj = lineage_obj
        self._update_time = update_time
        self._added_info = added_info if added_info is not None else dict()

    @property
    def lineage_obj(self):
        """Get lineage object."""
        return self._lineage_obj

    @property
    def added_info(self):
        """Get added info."""
        return self._added_info

    @added_info.setter
    def added_info(self, added_info):
        """Set added info."""
        self._added_info = added_info

    @property
    def update_time(self):
        """Get update time."""
        return self._update_time


class LineageParser:
    """Lineage parser."""
    def __init__(self, summary_dir, update_time=None, added_info=None):
        self._super_lineage_obj = None
        self._summary_dir = summary_dir
        self._update_time = update_time
        self._added_info = added_info
        self._parse_summary_log()

    def _parse_summary_log(self):
        """
        Parse the single summary log.

        Returns:
            bool, `True` if parse summary log success, else `False`.
        """
        file_path = SummaryPathParser.get_latest_lineage_summary(self._summary_dir)
        if file_path is None:
            logger.warning('There is no summary log file under summary_dir %s.', self._summary_dir)
            raise LineageFileNotFoundError(
                'There is no summary log file under summary_dir.'
            )
        try:
            lineage_info = LineageSummaryAnalyzer.get_summary_infos(file_path)
            user_defined_info = LineageSummaryAnalyzer.get_user_defined_info(file_path)
            lineage_obj = LineageObj(
                self._summary_dir,
                train_lineage=lineage_info.train_lineage,
                evaluation_lineage=lineage_info.eval_lineage,
                dataset_graph=lineage_info.dataset_graph,
                user_defined_info=user_defined_info
            )
            self._super_lineage_obj = SuperLineageObj(lineage_obj, self._update_time, self._added_info)
        except (LineageSummaryAnalyzeException,
                LineageEventNotExistException,
                LineageEventFieldNotExistException):
            logger.warning("Parse file failed under summary_dir %s.", self._summary_dir)
        except MindInsightException as error:
            logger.error(str(error))
            logger.exception(error)
            logger.warning("Parse file failed under summary_dir %s.", self._summary_dir)

    @property
    def super_lineage_obj(self):
        """Get super lineage object."""
        return self._super_lineage_obj


class LineageOrganizer:
    """Lineage organizer."""
    def __init__(self, data_manager=None, summary_base_dir=None):
        self._data_manager = data_manager
        self._summary_base_dir = summary_base_dir
        self._check_params()
        self._super_lineage_objs = {}
        self._organize_from_cache()
        self._organize_from_disk()

    def _check_params(self):
        """Check params."""
        if self._data_manager is not None and self._summary_base_dir is not None:
            self._summary_base_dir = None

    def _organize_from_disk(self):
        """Organize lineage objs from disk."""
        if self._summary_base_dir is None:
            return
        summary_watcher = SummaryWatcher()
        relative_dirs = summary_watcher.list_summary_directories(
            summary_base_dir=self._summary_base_dir
        )

        no_lineage_count = 0
        for item in relative_dirs:
            relative_dir = item.get('relative_path')
            update_time = item.get('update_time')
            abs_summary_dir = os.path.realpath(os.path.join(self._summary_base_dir, relative_dir))

            try:
                lineage_parser = LineageParser(abs_summary_dir, update_time)
                super_lineage_obj = lineage_parser.super_lineage_obj
                if super_lineage_obj is not None:
                    self._super_lineage_objs.update({abs_summary_dir: super_lineage_obj})
            except LineageFileNotFoundError:
                no_lineage_count += 1

        if no_lineage_count == len(relative_dirs):
            logger.error('There is no summary log file under summary_base_dir.')
            raise LineageFileNotFoundError(
                'There is no summary log file under summary_base_dir.'
            )

    def _organize_from_cache(self):
        """Organize lineage objs from cache."""
        if self._data_manager is None:
            return
        brief_cache = self._data_manager.get_brief_cache()
        cache_items = brief_cache.cache_items
        for relative_dir, cache_train_job in cache_items.items():
            try:
                super_lineage_obj = cache_train_job.get("lineage")
                self._super_lineage_objs.update({relative_dir: super_lineage_obj})
            except ParamValueError:
                logger.info("This is no lineage info in train job %s.", relative_dir)

    @property
    def super_lineage_objs(self):
        """Get super lineage objects."""
        return self._super_lineage_objs

    def get_super_lineage_obj(self, relative_path):
        """Get super lineage object by given relative path."""
        return self._super_lineage_objs.get(relative_path)