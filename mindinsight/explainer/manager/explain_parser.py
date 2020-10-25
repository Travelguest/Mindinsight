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
File parser for MindExplain data.

This module is used to parse the MindExplain log file.
"""
import re
import collections

from google.protobuf.message import DecodeError

from mindinsight.datavisual.common import exceptions
from mindinsight.explainer.common.enums import PluginNameEnum
from mindinsight.explainer.common.log import logger
from mindinsight.datavisual.data_access.file_handler import FileHandler
from mindinsight.datavisual.data_transform.ms_data_loader import _SummaryParser
from mindinsight.datavisual.proto_files import mindinsight_summary_pb2 as summary_pb2
from mindinsight.datavisual.proto_files.mindinsight_summary_pb2 import Explain
from mindinsight.utils.exceptions import UnknownError

HEADER_SIZE = 8
CRC_STR_SIZE = 4
MAX_EVENT_STRING = 500000000
BenchmarkContainer = collections.namedtuple('BenchmarkContainer', ['benchmark', 'status'])
MetadataContainer = collections.namedtuple('MetadataContainer', ['metadata', 'status'])


class ImageDataContainer:
    """
    Container for image data to allow pickling.

    Args:
        explain_message (Explain): Explain proto buffer message.
    """

    def __init__(self, explain_message: Explain):
        self.image_id = explain_message.image_id
        self.image_data = explain_message.image_data
        self.ground_truth_label = explain_message.ground_truth_label
        self.inference = explain_message.inference
        self.explanation = explain_message.explanation
        self.status = explain_message.status


class _ExplainParser(_SummaryParser):
    """The summary file parser."""

    def __init__(self, summary_dir):
        super(_ExplainParser, self).__init__(summary_dir)
        self._latest_filename = ''

    def parse_explain(self, filenames):
        """
        Load summary file and parse file content.

        Args:
            filenames (list[str]): File name list.
        Returns:
            bool, True if all the summary files are finished loading.
        """
        summary_files = self.filter_files(filenames)
        summary_files = self.sort_files(summary_files)

        is_end = False
        is_clean = False
        event_data = {}
        filename = summary_files[-1]

        file_path = FileHandler.join(self._summary_dir, filename)
        if filename != self._latest_filename:
            self._summary_file_handler = FileHandler(file_path, 'rb')
            self._latest_filename = filename
            self._latest_file_size = 0
            is_clean = True

        new_size = FileHandler.file_stat(file_path).size
        if new_size == self._latest_file_size:
            is_end = True
            return is_clean, is_end, event_data

        while True:
            start_offset = self._summary_file_handler.offset
            try:
                event_str = self._event_load(self._summary_file_handler)
                if event_str is None:
                    self._summary_file_handler.reset_offset(start_offset)
                    is_end = True
                    return is_clean, is_end, event_data
                if len(event_str) > MAX_EVENT_STRING:
                    logger.warning("file_path: %s, event string: %d exceeds %d and drop it.",
                                   self._summary_file_handler.file_path, len(event_str), MAX_EVENT_STRING)
                    continue

                field_list, tensor_value_list = self._event_decode(event_str)
                for field, tensor_value in zip(field_list, tensor_value_list):
                    event_data[field] = tensor_value
                logger.info("Parse summary file offset %d, file path: %s.", self._latest_file_size, file_path)
                return is_clean, is_end, event_data

            except exceptions.CRCFailedError:
                self._summary_file_handler.reset_offset(start_offset)
                is_end = True
                logger.warning("Check crc failed and ignore this file, file_path=%s, "
                               "offset=%s.", self._summary_file_handler.file_path, self._summary_file_handler.offset)
                return is_clean, is_end, event_data
            except (OSError, DecodeError, exceptions.MindInsightException) as ex:
                is_end = True
                logger.warning("Parse log file fail, and ignore this file, detail: %r,"
                               "file path: %s.", str(ex), self._summary_file_handler.file_path)
                return is_clean, is_end, event_data
            except Exception as ex:
                logger.exception(ex)
                raise UnknownError(str(ex))

    def filter_files(self, filenames):
        """
        Gets a list of summary files.

        Args:
            filenames (list[str]): File name list, like [filename1, filename2].

        Returns:
            list[str], filename list.
        """
        return list(filter(
            lambda filename: (re.search(r'summary\.\d+', filename)
                              and filename.endswith("_explain")), filenames))

    @staticmethod
    def _event_decode(event_str):
        """
        Transform `Event` data to tensor_event and update it to EventsData.

        Args:
            event_str (str): Message event string in summary proto, data read from file handler.
        """

        logger.debug("Start to parse event string. Event string len: %s.", len(event_str))
        event = summary_pb2.Event.FromString(event_str)
        logger.debug("Deserialize event string completed.")

        fields = {
            'image_id': PluginNameEnum.IMAGE_ID,
            'benchmark': PluginNameEnum.BENCHMARK,
            'metadata': PluginNameEnum.METADATA
        }

        tensor_event_value = getattr(event, 'explain')

        field_list = []
        tensor_value_list = []
        for field in fields:
            if not getattr(tensor_event_value, field):
                continue

            if PluginNameEnum.METADATA.value == field and not tensor_event_value.metadata.label:
                continue

            tensor_value = None
            if field == PluginNameEnum.IMAGE_ID.value:
                tensor_value = _ExplainParser._add_image_data(tensor_event_value)
            elif field == PluginNameEnum.BENCHMARK.value:
                tensor_value = _ExplainParser._add_benchmark(tensor_event_value)
            elif field == PluginNameEnum.METADATA.value:
                tensor_value = _ExplainParser._add_metadata(tensor_event_value)
            logger.debug("Event generated, label is %s, step is %s.", field, event.step)
            field_list.append(field)
            tensor_value_list.append(tensor_value)
        return field_list, tensor_value_list

    @staticmethod
    def _add_image_data(tensor_event_value):
        """
        Parse image data based on image_id in Explain message

        Args:
            tensor_event_value: the object of Explain message
        """
        image_data = ImageDataContainer(tensor_event_value)
        return image_data

    @staticmethod
    def _add_benchmark(tensor_event_value):
        """
        Parse benchmark data from Explain message.

        Args:
            tensor_event_value: the object of Explain message

        Returns:
            benchmark_data: An object containing benchmark.
        """
        benchmark_data = BenchmarkContainer(
            benchmark=tensor_event_value.benchmark,
            status=tensor_event_value.status
        )

        return benchmark_data

    @staticmethod
    def _add_metadata(tensor_event_value):
        """
        Parse  metadata from Explain message.

        Args:
            tensor_event_value: the object of Explain message

        Returns:
            benchmark_data: An object containing metadata.
        """
        metadata_value = MetadataContainer(
            metadata=tensor_event_value.metadata,
            status=tensor_event_value.status
        )

        return metadata_value
