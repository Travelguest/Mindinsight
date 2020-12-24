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
"""ExplainLoader."""

import math
import os
import re
from collections import defaultdict
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Union
from enum import Enum
import threading

from mindinsight.explainer.common.enums import ExplainFieldsEnum
from mindinsight.explainer.common.log import logger
from mindinsight.explainer.manager.explain_parser import ExplainParser
from mindinsight.datavisual.data_access.file_handler import FileHandler
from mindinsight.datavisual.common.exceptions import TrainJobNotExistError
from mindinsight.utils.exceptions import ParamValueError, UnknownError

_NAN_CONSTANT = 'NaN'
_NUM_DIGITS = 6

_EXPLAIN_FIELD_NAMES = [
    ExplainFieldsEnum.SAMPLE_ID,
    ExplainFieldsEnum.BENCHMARK,
    ExplainFieldsEnum.METADATA,
]

_SAMPLE_FIELD_NAMES = [
    ExplainFieldsEnum.GROUND_TRUTH_LABEL,
    ExplainFieldsEnum.INFERENCE,
    ExplainFieldsEnum.EXPLANATION,
]


class _LoaderStatus(Enum):
    STOP = 'STOP'
    LOADING = 'LOADING'


def _round(score):
    """Take round of a number to given precision."""
    try:
        return round(score, _NUM_DIGITS)
    except TypeError:
        return score


class ExplainLoader:
    """ExplainLoader which manage the record in the summary file."""

    def __init__(self,
                 loader_id: str,
                 summary_dir: str):

        self._parser = ExplainParser(summary_dir)

        self._loader_info = {
            'loader_id': loader_id,
            'summary_dir': summary_dir,
            'create_time': os.stat(summary_dir).st_ctime,
            'update_time': os.stat(summary_dir).st_mtime,
            'query_time': os.stat(summary_dir).st_ctime,
            'uncertainty_enabled': False,
        }
        self._samples = defaultdict(dict)
        self._metadata = {'explainers': [], 'metrics': [], 'labels': []}
        self._benchmark = {'explainer_score': defaultdict(dict), 'label_score': defaultdict(dict)}

        self._status = _LoaderStatus.STOP.value
        self._status_mutex = threading.Lock()

    @property
    def all_classes(self) -> List[Dict]:
        """
        Return a list of detailed label information, including label id, label name and sample count of each label.

        Returns:
            list[dict], a list of dict, each dict contains:
                - id (int): label id
                - label (str): label name
                - sample_count (int): number of samples for each label
        """
        sample_count_per_label = defaultdict(int)
        samples_copy = self._samples.copy()
        for sample in samples_copy.values():
            if sample.get('image', False) and sample.get('ground_truth_label', False):
                for label in sample['ground_truth_label']:
                    sample_count_per_label[label] += 1

        all_classes_return = []
        for label_id, label_name in enumerate(self._metadata['labels']):
            single_info = {
                'id': label_id,
                'label': label_name,
                'sample_count': sample_count_per_label[label_id]
            }
            all_classes_return.append(single_info)
        return all_classes_return

    @property
    def query_time(self) -> float:
        """Return query timestamp of explain loader."""
        return self._loader_info['query_time']

    @query_time.setter
    def query_time(self, new_time: Union[datetime, float]):
        """
        Update the query_time timestamp manually.

        Args:
            new_time (datetime.datetime or float): Updated query_time for the explain loader.
        """
        if isinstance(new_time, datetime):
            self._loader_info['query_time'] = new_time.timestamp()
        elif isinstance(new_time, float):
            self._loader_info['query_time'] = new_time
        else:
            raise TypeError('new_time should have type of datetime.datetime or float, but receive {}'
                            .format(type(new_time)))

    @property
    def create_time(self) -> float:
        """Return the create timestamp of summary file."""
        return self._loader_info['create_time']

    @create_time.setter
    def create_time(self, new_time: Union[datetime, float]):
        """
        Update the create_time manually

        Args:
            new_time (datetime.datetime or float): Updated create_time of summary_file.
        """
        if isinstance(new_time, datetime):
            self._loader_info['create_time'] = new_time.timestamp()
        elif isinstance(new_time, float):
            self._loader_info['create_time'] = new_time
        else:
            raise TypeError('new_time should have type of datetime.datetime or float, but receive {}'
                            .format(type(new_time)))

    @property
    def explainers(self) -> List[str]:
        """Return a list of explainer names recorded in the summary file."""
        return self._metadata['explainers']

    @property
    def explainer_scores(self) -> List[Dict]:
        """
        Return evaluation results for every explainer.

        Returns:
            list[dict], A list of evaluation results of each explainer. Each item contains:
                - explainer (str): Name of evaluated explainer.
                - evaluations (list[dict]): A list of evlauation results by different metrics.
                - class_scores (list[dict]): A list of evaluation results on different labels.

                Each item in the evaluations contains:
                    - metric (str): name of metric method
                    - score (float): evaluation result

                Each item in the class_scores contains:
                    - label (str): Name of label
                    - evaluations (list[dict]): A list of evalution results on different labels by different metrics.

                    Each item in evaluations contains:
                        - metric (str): Name of metric method
                        - score (float): Evaluation scores of explainer on specific label by the metric.
        """
        explainer_scores = []
        for explainer, explainer_score_on_metric in self._benchmark['explainer_score'].copy().items():
            metric_scores = [{'metric': metric, 'score': _round(score)}
                             for metric, score in explainer_score_on_metric.items()]
            label_scores = []
            for label, label_score_on_metric in self._benchmark['label_score'][explainer].copy().items():
                score_of_single_label = {
                    'label': self._metadata['labels'][label],
                    'evaluations': [
                        {'metric': metric, 'score': _round(score)} for metric, score in label_score_on_metric.items()
                    ],
                }
                label_scores.append(score_of_single_label)
            explainer_scores.append({
                'explainer': explainer,
                'evaluations': metric_scores,
                'class_scores': label_scores,
            })
        return explainer_scores

    @property
    def labels(self) -> List[str]:
        """Return the label recorded in the summary."""
        return self._metadata['labels']

    @property
    def metrics(self) -> List[str]:
        """Return a list of metric names recorded in the summary file."""
        return self._metadata['metrics']

    @property
    def min_confidence(self) -> Optional[float]:
        """Return minimum confidence used to filter the predicted labels."""
        return None

    @property
    def sample_count(self) -> int:
        """
        Return total number of samples in the loader.

        Since the loader only return available samples (i.e. with original image data and ground_truth_label loaded in
        cache), the returned count only takes the available samples into account.

        Return:
            int, total number of available samples in the loading job.

        """
        sample_count = 0
        samples_copy = self._samples.copy()
        for sample in samples_copy.values():
            if sample.get('image', False) and sample.get('ground_truth_label', False):
                sample_count += 1
        return sample_count

    @property
    def samples(self) -> List[Dict]:
        """Return the information of all samples in the job."""
        return self.get_all_samples()

    @property
    def train_id(self) -> str:
        """Return ID of explain loader."""
        return self._loader_info['loader_id']

    @property
    def uncertainty_enabled(self):
        """Whethter uncertainty is enabled."""
        return self._loader_info['uncertainty_enabled']

    @property
    def update_time(self) -> float:
        """Return latest modification timestamp of summary file."""
        return self._loader_info['update_time']

    @update_time.setter
    def update_time(self, new_time: Union[datetime, float]):
        """
        Update the update_time manually.

        Args:
            new_time stamp (datetime.datetime or float): Updated time for the summary file.
        """
        if isinstance(new_time, datetime):
            self._loader_info['update_time'] = new_time.timestamp()
        elif isinstance(new_time, float):
            self._loader_info['update_time'] = new_time
        else:
            raise TypeError('new_time should have type of datetime.datetime or float, but receive {}'
                            .format(type(new_time)))

    def load(self):
        """Start loading data from the latest summary file to the loader."""
        self.status = _LoaderStatus.LOADING.value
        filenames = []
        for filename in FileHandler.list_dir(self._loader_info['summary_dir']):
            if FileHandler.is_file(FileHandler.join(self._loader_info['summary_dir'], filename)):
                filenames.append(filename)
        filenames = ExplainLoader._filter_files(filenames)

        if not filenames:
            raise TrainJobNotExistError('No summary file found in %s, explain job will be delete.'
                                        % self._loader_info['summary_dir'])

        is_end = False
        while not is_end and self.status != _LoaderStatus.STOP.value:
            file_changed, is_end, event_dict = self._parser.parse_explain(filenames)

            if file_changed:
                logger.info('Summary file in %s update, reload the data in the summary.',
                            self._loader_info['summary_dir'])
                self._clear_job()
            if event_dict:
                self._import_data_from_event(event_dict)

    @property
    def status(self):
        """Get the status of this class with lock."""
        with self._status_mutex:
            return self._status

    @status.setter
    def status(self, status):
        """Set the status of this class with lock."""
        with self._status_mutex:
            self._status = status

    def stop(self):
        """Stop load data."""
        self.status = _LoaderStatus.STOP.value

    def get_all_samples(self) -> List[Dict]:
        """
        Return a list of sample information cachced in the explain job

        Returns:
            sample_list (List[SampleObj]): a list of sample objects, each object
                consists of:

                - id (int): sample id
                - name (str): basename of image
                - labels (list[str]): list of labels
                - inferences list[dict])
        """
        returned_samples = []
        samples_copy = self._samples.copy()
        for sample_id, sample_info in samples_copy.items():
            if not sample_info.get('image', False) and not sample_info.get('ground_truth_label', False):
                continue
            returned_sample = {
                'id': sample_id,
                'name': str(sample_id),
                'image': sample_info['image'],
                'labels': [self._metadata['labels'][i] for i in sample_info['ground_truth_label']],
            }

            # Check whether the sample has valid label-prob pairs.
            if not ExplainLoader._is_inference_valid(sample_info):
                continue

            inferences = {}
            for label, prob in zip(sample_info['ground_truth_label'] + sample_info['predicted_label'],
                                   sample_info['ground_truth_prob'] + sample_info['predicted_prob']):
                inferences[label] = {
                    'label': self._metadata['labels'][label],
                    'confidence': _round(prob),
                    'saliency_maps': []
                }

            if sample_info['ground_truth_prob_sd'] or sample_info['predicted_prob_sd']:
                for label, std, low, high in zip(
                        sample_info['ground_truth_label'] + sample_info['predicted_label'],
                        sample_info['ground_truth_prob_sd'] + sample_info['predicted_prob_sd'],
                        sample_info['ground_truth_prob_itl95_low'] + sample_info['predicted_prob_itl95_low'],
                        sample_info['ground_truth_prob_itl95_hi'] + sample_info['predicted_prob_itl95_hi']
                ):
                    inferences[label]['confidence_sd'] = _round(std)
                    inferences[label]['confidence_itl95'] = [_round(low), _round(high)]

            for explainer, label_heatmap_path_dict in sample_info['explanation'].items():
                for label, heatmap_path in label_heatmap_path_dict.items():
                    if label in inferences:
                        inferences[label]['saliency_maps'].append({'explainer': explainer, 'overlay': heatmap_path})

            returned_sample['inferences'] = list(inferences.values())
            returned_samples.append(returned_sample)
        return returned_samples

    def _import_data_from_event(self, event_dict: Dict):
        """Parse and import data from the event data."""
        if 'metadata' not in event_dict and self._is_metadata_empty():
            raise ParamValueError('metadata is imcomplete, should write metadata first in the summary.')

        for tag, event in event_dict.items():
            if tag == ExplainFieldsEnum.METADATA.value:
                self._import_metadata_from_event(event.metadata)
            elif tag == ExplainFieldsEnum.BENCHMARK.value:
                self._import_benchmark_from_event(event.benchmark)
            elif tag == ExplainFieldsEnum.SAMPLE_ID.value:
                self._import_sample_from_event(event)
            else:
                logger.info('Unknown ExplainField: %s.', tag)

    def _is_metadata_empty(self):
        """Check whether metadata is completely loaded first."""
        if not self._metadata['labels']:
            return True
        return False

    def _import_metadata_from_event(self, metadata_event):
        """Import the metadata from event into loader."""

        def take_union(existed_list, imported_data):
            """Take union of existed_list and imported_data."""
            if isinstance(imported_data, Iterable):
                for sample in imported_data:
                    if sample not in existed_list:
                        existed_list.append(sample)

        take_union(self._metadata['explainers'], metadata_event.explain_method)
        take_union(self._metadata['metrics'], metadata_event.benchmark_method)
        take_union(self._metadata['labels'], metadata_event.label)

    def _import_benchmark_from_event(self, benchmarks):
        """
        Parse the benchmark event.

        Benchmark data are separeted into 'explainer_score' and 'label_score'. 'explainer_score' contains overall
        evaluation results of each explainer by different metrics, while 'label_score' additionally devides the results
        w.r.t different labels.

            The structure of self._benchmark['explainer_score'] demonstrates below:
                 {
                    explainer_1: {metric_name_1: score_1, ...},
                    explainer_2: {metric_name_1: score_1, ...},
                    ...
                 }

            The structure of self._benchmark['label_score'] is:
                {
                    explainer_1: {label_id: {metric_1: score_1, metric_2: score_2, ...}, ...},
                    explainer_2: {label_id: {metric_1: score_1, metric_2: score_2, ...}, ...},
                    ...
                }

        Args:
            benchmarks (benchmark_container): Parsed benchmarks data from summary file.
        """
        explainer_score = self._benchmark['explainer_score']
        label_score = self._benchmark['label_score']

        for benchmark in benchmarks:
            explainer = benchmark.explain_method
            metric = benchmark.benchmark_method
            metric_score = benchmark.total_score
            label_score_event = benchmark.label_score

            explainer_score[explainer][metric] = _NAN_CONSTANT if math.isnan(metric_score) else metric_score
            new_label_score_dict = ExplainLoader._score_event_to_dict(label_score_event, metric)
            for label, scores_of_metric in new_label_score_dict.items():
                if label not in label_score[explainer]:
                    label_score[explainer][label] = {}
                label_score[explainer][label].update(scores_of_metric)

    def _import_sample_from_event(self, sample):
        """
        Parse the sample event.

        Detailed data of each sample are store in self._samples, identified by sample_id. Each sample data are stored
        in the following structure.

            - ground_truth_labels (list[int]): A list of ground truth labels of the sample.
            - ground_truth_probs (list[float]): A list of confidences of ground-truth label from black-box model.
            - predicted_labels (list[int]): A list of predicted labels from the black-box model.
            - predicted_probs (list[int]): A list of confidences w.r.t the predicted labels.
            - explanations (dict): Explanations is a dictionary where the each explainer name mapping to a dictionary
                of saliency maps. The structure of explanations demonstrates below:

                {
                    explainer_name_1: {label_1: saliency_id_1, label_2: saliency_id_2, ...},
                    explainer_name_2: {label_1: saliency_id_1, label_2: saliency_id_2, ...},
                    ...
                }
        """
        if getattr(sample, 'sample_id', None) is None:
            raise ParamValueError('sample_event has no sample_id')
        sample_id = sample.sample_id
        samples_copy = self._samples.copy()
        if sample_id not in samples_copy:
            self._samples[sample_id] = {
                'ground_truth_label': [],
                'ground_truth_prob': [],
                'ground_truth_prob_sd': [],
                'ground_truth_prob_itl95_low': [],
                'ground_truth_prob_itl95_hi': [],
                'predicted_label': [],
                'predicted_prob': [],
                'predicted_prob_sd': [],
                'predicted_prob_itl95_low': [],
                'predicted_prob_itl95_hi': [],
                'explanation': defaultdict(dict)
            }

        if sample.image_path:
            self._samples[sample_id]['image'] = sample.image_path

        for tag in _SAMPLE_FIELD_NAMES:
            try:
                if tag == ExplainFieldsEnum.GROUND_TRUTH_LABEL:
                    self._samples[sample_id]['ground_truth_label'].extend(list(sample.ground_truth_label))
                elif tag == ExplainFieldsEnum.INFERENCE:
                    self._import_inference_from_event(sample, sample_id)
                else:
                    self._import_explanation_from_event(sample, sample_id)
            except UnknownError as ex:
                logger.warning("Parse %s data failed within image related data, detail: %r", tag, str(ex))

    def _import_inference_from_event(self, event, sample_id):
        """Parse the inference event."""
        inference = event.inference
        self._samples[sample_id]['ground_truth_prob'].extend(list(inference.ground_truth_prob))
        self._samples[sample_id]['ground_truth_prob_sd'].extend(list(inference.ground_truth_prob_sd))
        self._samples[sample_id]['ground_truth_prob_itl95_low'].extend(list(inference.ground_truth_prob_itl95_low))
        self._samples[sample_id]['ground_truth_prob_itl95_hi'].extend(list(inference.ground_truth_prob_itl95_hi))
        self._samples[sample_id]['predicted_label'].extend(list(inference.predicted_label))
        self._samples[sample_id]['predicted_prob'].extend(list(inference.predicted_prob))
        self._samples[sample_id]['predicted_prob_sd'].extend(list(inference.predicted_prob_sd))
        self._samples[sample_id]['predicted_prob_itl95_low'].extend(list(inference.predicted_prob_itl95_low))
        self._samples[sample_id]['predicted_prob_itl95_hi'].extend(list(inference.predicted_prob_itl95_hi))

        if self._samples[sample_id]['ground_truth_prob_sd'] or self._samples[sample_id]['predicted_prob_sd']:
            self._loader_info['uncertainty_enabled'] = True

    def _import_explanation_from_event(self, event, sample_id):
        """Parse the explanation event."""
        if self._samples[sample_id]['explanation'] is None:
            self._samples[sample_id]['explanation'] = defaultdict(dict)
        sample_explanation = self._samples[sample_id]['explanation']

        for explanation_item in event.explanation:
            explainer = explanation_item.explain_method
            label = explanation_item.label
            sample_explanation[explainer][label] = explanation_item.heatmap_path

    def _clear_job(self):
        """Clear the cached data and update the time info of the loader."""
        self._samples.clear()
        self._loader_info['create_time'] = os.stat(self._loader_info['summary_dir']).st_ctime
        self._loader_info['update_time'] = os.stat(self._loader_info['summary_dir']).st_mtime
        self._loader_info['query_time'] = max(self._loader_info['update_time'], self._loader_info['query_time'])

        def clear_inner_dict(outer_dict):
            """Clear the inner structured data of the given dict."""
            for item in outer_dict.values():
                item.clear()

        map(clear_inner_dict, [self._metadata, self._benchmark])

    @staticmethod
    def _filter_files(filenames):
        """
        Gets a list of summary files.

        Args:
            filenames (list[str]): File name list, like [filename1, filename2].

        Returns:
            list[str], filename list.
        """
        return list(filter(
            lambda filename: (re.search(r'summary\.\d+', filename) and filename.endswith("_explain")), filenames))

    @staticmethod
    def _is_inference_valid(sample):
        """
        Check whether the inference data is empty or have the same length.

        If probs have different length with the labels, it can be confusing when assigning each prob to label.
        '_is_inference_valid' returns True only when the data size of match to each other. Note that prob data could be
        empty, so empty prob will pass the check.
        """
        ground_truth_len = len(sample['ground_truth_label'])
        for name in ['ground_truth_prob', 'ground_truth_prob_sd',
                     'ground_truth_prob_itl95_low', 'ground_truth_prob_itl95_hi']:
            if sample[name] and len(sample[name]) != ground_truth_len:
                logger.info('Length of %s not match the ground_truth_label. Length of ground_truth_label: %d,'
                            'length of %s: %d', name, ground_truth_len, name, len(sample[name]))
                return False

        predicted_len = len(sample['predicted_label'])
        for name in ['predicted_prob', 'predicted_prob_sd',
                     'predicted_prob_itl95_low', 'predicted_prob_itl95_hi']:
            if sample[name] and len(sample[name]) != predicted_len:
                logger.info('Length of %s not match the predicted_labels. Length of predicted_label: %d,'
                            'length of %s: %d', name, predicted_len, name, len(sample[name]))
                return False
        return True

    @staticmethod
    def _score_event_to_dict(label_score_event, metric) -> Dict:
        """Transfer metric scores per label to pre-defined structure."""
        new_label_score_dict = defaultdict(dict)
        for label_id, label_score in enumerate(label_score_event):
            new_label_score_dict[label_id][metric] = _NAN_CONSTANT if math.isnan(label_score) else label_score
        return new_label_score_dict
